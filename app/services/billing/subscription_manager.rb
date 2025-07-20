# frozen_string_literal: true

module Billing
  class SubscriptionManager
    attr_reader :organization, :stripe_service

    def initialize(organization)
      @organization = organization
      @stripe_service = StripeService.new
    end

    def create_subscription(plan:, payment_method_id: nil, trial_days: nil)
      ActiveRecord::Base.transaction do
        # Ensure organization has a Stripe customer
        stripe_service.create_customer(organization) unless organization.stripe_customer_id

        # Create subscription in Stripe
        stripe_subscription = stripe_service.create_subscription(
          organization,
          plan,
          payment_method_id: payment_method_id,
          trial_days: trial_days || default_trial_days(plan)
        )

        # Save payment method if provided
        if payment_method_id
          stripe_payment_method = Stripe::PaymentMethod.retrieve(payment_method_id)
          PaymentMethod.create_from_stripe(stripe_payment_method, organization)
        end

        # Return the created subscription
        organization.reload.organization_subscription
      end
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def change_plan(new_plan, prorate: true)
      subscription = organization.organization_subscription
      raise 'No active subscription' unless subscription

      old_plan = subscription.subscription_plan
      
      # Check if downgrade is allowed
      if new_plan.price_cents < old_plan.price_cents
        check_downgrade_eligibility(new_plan)
      end

      stripe_service.update_subscription(subscription, new_plan, prorate: prorate)

      # Log the plan change
      Rails.logger.info "Organization #{organization.id} changed plan from #{old_plan.name} to #{new_plan.name}"
      
      # Send notification email
      OrganizationMailer.plan_changed(organization, old_plan, new_plan).deliver_later

      subscription.reload
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def cancel_subscription(at_period_end: true, reason: nil)
      subscription = organization.organization_subscription
      raise 'No active subscription' unless subscription

      stripe_service.cancel_subscription(subscription, at_period_end: at_period_end)

      # Log cancellation reason
      subscription.update!(metadata: subscription.metadata.merge(cancellation_reason: reason)) if reason

      # Send cancellation email
      OrganizationMailer.subscription_canceled(organization).deliver_later

      subscription.reload
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def reactivate_subscription
      subscription = organization.organization_subscription
      raise 'No canceled subscription' unless subscription&.cancel_at_period_end?

      stripe_service.reactivate_subscription(subscription)

      # Send reactivation email
      OrganizationMailer.subscription_reactivated(organization).deliver_later

      subscription.reload
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def add_payment_method(payment_method_id, set_as_default: true)
      # Attach to Stripe customer
      stripe_service.attach_payment_method(
        payment_method_id: payment_method_id,
        customer_id: organization.stripe_customer_id
      )

      # Set as default if requested
      if set_as_default
        stripe_service.set_default_payment_method(
          organization.stripe_customer_id,
          payment_method_id
        )
      end

      # Create local record
      stripe_payment_method = Stripe::PaymentMethod.retrieve(payment_method_id)
      payment_method = PaymentMethod.create_from_stripe(stripe_payment_method, organization)
      payment_method.make_default! if set_as_default

      payment_method
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def remove_payment_method(payment_method)
      raise 'Cannot remove default payment method if subscription is active' if payment_method.is_default? && organization.subscribed?

      payment_method.detach_from_customer
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def retry_failed_payment(invoice)
      raise 'Invoice is not unpaid' unless invoice.open?
      
      stripe_service.pay_invoice(invoice.stripe_invoice_id)
      
      # Update local invoice status
      invoice.update!(status: :paid, paid_at: Time.current)
      
      # Update subscription status if needed
      if organization.organization_subscription.past_due?
        organization.organization_subscription.update!(status: :active)
      end

      invoice
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def create_checkout_session(plan:, success_url:, cancel_url:)
      stripe_service.create_checkout_session(
        organization: organization,
        plan: plan,
        success_url: success_url,
        cancel_url: cancel_url
      )
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def create_portal_session(return_url:)
      stripe_service.create_portal_session(
        organization: organization,
        return_url: return_url
      )
    rescue Stripe::StripeError => e
      handle_stripe_error(e)
    end

    def check_and_apply_usage_limits
      subscription = organization.organization_subscription
      return unless subscription&.active?

      # Check each resource limit
      %w[teams matches_per_month players_per_team storage_gb api_calls_per_day].each do |resource|
        next if subscription.within_usage_limit?(resource)

        # Apply restrictions based on resource type
        case resource
        when 'teams'
          disable_team_creation
        when 'matches_per_month'
          disable_match_creation
        when 'api_calls_per_day'
          apply_rate_limiting
        end
      end
    end

    def calculate_next_invoice
      subscription = organization.organization_subscription
      return nil unless subscription&.active?

      # Base subscription cost
      base_amount = subscription.subscription_plan.price_cents

      # Calculate overage charges
      overage_charges = subscription.calculate_overage_charges
      overage_total = overage_charges.values.sum { |charge| charge[:total_cents] }

      {
        subscription_amount: base_amount,
        overage_charges: overage_charges,
        overage_total: overage_total,
        total_amount: base_amount + overage_total,
        currency: subscription.subscription_plan.currency,
        next_billing_date: subscription.current_period_end
      }
    end

    private

    def default_trial_days(plan)
      return 0 if plan.free?
      return 0 if organization.invoices.any? # No trial for returning customers
      14 # Default 14-day trial for new customers
    end

    def check_downgrade_eligibility(new_plan)
      subscription = organization.organization_subscription
      
      # Check if current usage exceeds new plan limits
      %w[teams matches_per_month players_per_team].each do |resource|
        current_usage = subscription.current_usage_for(resource)
        new_limit = new_plan.limit_for(resource)
        
        if new_limit != -1 && current_usage > new_limit
          raise "Cannot downgrade: Current #{resource} usage (#{current_usage}) exceeds new plan limit (#{new_limit})"
        end
      end
    end

    def disable_team_creation
      organization.update!(max_teams_limit: organization.teams.count)
    end

    def disable_match_creation
      # Implement match creation restriction logic
      Rails.logger.warn "Organization #{organization.id} has reached match limit"
    end

    def apply_rate_limiting
      # Implement API rate limiting logic
      Rails.cache.write(
        "api_rate_limit:#{organization.id}",
        true,
        expires_in: 1.day
      )
    end

    def handle_stripe_error(error)
      case error
      when Stripe::CardError
        raise "支払い処理エラー: #{error.message}"
      when Stripe::InvalidRequestError
        raise "無効なリクエスト: #{error.message}"
      when Stripe::AuthenticationError
        Rails.logger.error "Stripe authentication error: #{error.message}"
        raise 'システムエラーが発生しました'
      else
        Rails.logger.error "Stripe error: #{error.message}"
        raise 'システムエラーが発生しました'
      end
    end
  end
end