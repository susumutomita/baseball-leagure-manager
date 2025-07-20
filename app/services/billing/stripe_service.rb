# frozen_string_literal: true

module Billing
  class StripeService
    def initialize
      Stripe.api_key = Rails.application.credentials.stripe[:secret_key]
    end

    # Customer management
    def create_customer(organization)
      return organization.stripe_customer if organization.stripe_customer_id.present?

      customer = Stripe::Customer.create(
        email: organization.admin_users.first&.email,
        name: organization.name,
        metadata: {
          organization_id: organization.id,
          organization_slug: organization.slug
        }
      )

      organization.update!(stripe_customer_id: customer.id)
      customer
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe customer creation failed: #{e.message}"
      raise
    end

    def update_customer(organization, attributes = {})
      return unless organization.stripe_customer_id.present?

      Stripe::Customer.update(
        organization.stripe_customer_id,
        attributes
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe customer update failed: #{e.message}"
      raise
    end

    # Subscription management
    def create_subscription(organization, plan, payment_method_id: nil, trial_days: nil)
      customer = ensure_customer(organization)
      
      # Attach payment method if provided
      if payment_method_id
        attach_payment_method(
          payment_method_id: payment_method_id,
          customer_id: customer.id
        )
        set_default_payment_method(customer.id, payment_method_id)
      end

      subscription_params = {
        customer: customer.id,
        items: [{
          price: plan.stripe_price_id
        }],
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organization_id: organization.id,
          plan_id: plan.id
        }
      }

      subscription_params[:trial_period_days] = trial_days if trial_days
      subscription_params[:payment_behavior] = 'default_incomplete' if plan.price_cents > 0

      subscription = Stripe::Subscription.create(subscription_params)
      
      # Create local subscription record
      OrganizationSubscription.create_or_update_from_stripe(subscription)
      
      subscription
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe subscription creation failed: #{e.message}"
      raise
    end

    def update_subscription(organization_subscription, new_plan, prorate: true)
      return unless organization_subscription.stripe_subscription_id

      subscription = Stripe::Subscription.retrieve(organization_subscription.stripe_subscription_id)
      
      Stripe::Subscription.update(
        subscription.id,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: new_plan.stripe_price_id
          }],
          proration_behavior: prorate ? 'create_prorations' : 'none'
        }
      )

      # Update local record
      organization_subscription.update!(subscription_plan: new_plan)
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe subscription update failed: #{e.message}"
      raise
    end

    def cancel_subscription(organization_subscription, at_period_end: true)
      return unless organization_subscription.stripe_subscription_id

      if at_period_end
        Stripe::Subscription.update(
          organization_subscription.stripe_subscription_id,
          { cancel_at_period_end: true }
        )
      else
        Stripe::Subscription.cancel(organization_subscription.stripe_subscription_id)
      end

      # Update local record
      organization_subscription.update!(
        cancel_at_period_end: at_period_end,
        canceled_at: Time.current
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe subscription cancellation failed: #{e.message}"
      raise
    end

    def reactivate_subscription(organization_subscription)
      return unless organization_subscription.stripe_subscription_id

      Stripe::Subscription.update(
        organization_subscription.stripe_subscription_id,
        { cancel_at_period_end: false }
      )

      organization_subscription.update!(
        cancel_at_period_end: false,
        canceled_at: nil
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe subscription reactivation failed: #{e.message}"
      raise
    end

    # Payment method management
    def attach_payment_method(payment_method_id:, customer_id:)
      Stripe::PaymentMethod.attach(
        payment_method_id,
        { customer: customer_id }
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe payment method attachment failed: #{e.message}"
      raise
    end

    def detach_payment_method(payment_method_id)
      Stripe::PaymentMethod.detach(payment_method_id)
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe payment method detachment failed: #{e.message}"
      raise
    end

    def set_default_payment_method(customer_id, payment_method_id)
      Stripe::Customer.update(
        customer_id,
        { invoice_settings: { default_payment_method: payment_method_id } }
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe default payment method update failed: #{e.message}"
      raise
    end

    def list_payment_methods(customer_id, type: 'card')
      Stripe::PaymentMethod.list(
        customer: customer_id,
        type: type
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe payment methods listing failed: #{e.message}"
      raise
    end

    # Checkout session management
    def create_checkout_session(organization:, plan:, success_url:, cancel_url:)
      customer = ensure_customer(organization)

      session_params = {
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        success_url: success_url,
        cancel_url: cancel_url,
        line_items: [{
          price: plan.stripe_price_id,
          quantity: 1
        }],
        subscription_data: {
          metadata: {
            organization_id: organization.id,
            plan_id: plan.id
          }
        }
      }

      # Add trial period if applicable
      if plan.price_cents > 0 && organization.organization_subscription.nil?
        session_params[:subscription_data][:trial_period_days] = 14
      end

      Stripe::Checkout::Session.create(session_params)
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe checkout session creation failed: #{e.message}"
      raise
    end

    def create_portal_session(organization:, return_url:)
      customer = ensure_customer(organization)

      Stripe::BillingPortal::Session.create(
        customer: customer.id,
        return_url: return_url
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe portal session creation failed: #{e.message}"
      raise
    end

    # Invoice management
    def retrieve_invoice(invoice_id)
      Stripe::Invoice.retrieve(invoice_id)
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe invoice retrieval failed: #{e.message}"
      raise
    end

    def list_invoices(customer_id, limit: 10)
      Stripe::Invoice.list(
        customer: customer_id,
        limit: limit
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe invoices listing failed: #{e.message}"
      raise
    end

    def pay_invoice(invoice_id)
      Stripe::Invoice.pay(invoice_id)
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe invoice payment failed: #{e.message}"
      raise
    end

    # Usage reporting
    def create_usage_record(subscription_item_id:, quantity:, timestamp: nil, action: 'increment')
      params = {
        quantity: quantity,
        action: action
      }
      params[:timestamp] = timestamp.to_i if timestamp

      Stripe::SubscriptionItem.create_usage_record(
        subscription_item_id,
        params
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe usage record creation failed: #{e.message}"
      raise
    end

    # Price management
    def create_price(product_id:, unit_amount:, currency: 'jpy', recurring: { interval: 'month' })
      Stripe::Price.create(
        product: product_id,
        unit_amount: unit_amount,
        currency: currency,
        recurring: recurring
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe price creation failed: #{e.message}"
      raise
    end

    # Product management
    def create_product(name:, description: nil, metadata: {})
      Stripe::Product.create(
        name: name,
        description: description,
        metadata: metadata
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Stripe product creation failed: #{e.message}"
      raise
    end

    private

    def ensure_customer(organization)
      if organization.stripe_customer_id.present?
        begin
          Stripe::Customer.retrieve(organization.stripe_customer_id)
        rescue Stripe::InvalidRequestError
          create_customer(organization)
        end
      else
        create_customer(organization)
      end
    end
  end
end