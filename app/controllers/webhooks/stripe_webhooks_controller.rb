# frozen_string_literal: true

module Webhooks
  class StripeWebhooksController < ApplicationController
    # Use null session for webhook endpoints to prevent CSRF attacks
    protect_from_forgery with: :null_session
    skip_before_action :authenticate_user!

    def create
      payload = request.body.read
      sig_header = request.headers['Stripe-Signature']
      endpoint_secret = Rails.application.credentials.stripe[:webhook_secret]

      begin
        event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
      rescue JSON::ParserError => e
        Rails.logger.error "Stripe webhook JSON parse error: #{e.message}"
        render json: { error: 'Invalid payload' }, status: :bad_request
        return
      rescue Stripe::SignatureVerificationError => e
        Rails.logger.error "Stripe webhook signature verification error: #{e.message}"
        render json: { error: 'Invalid signature' }, status: :bad_request
        return
      end

      # Handle the event
      case event.type
      when 'customer.subscription.created'
        handle_subscription_created(event.data.object)
      when 'customer.subscription.updated'
        handle_subscription_updated(event.data.object)
      when 'customer.subscription.deleted'
        handle_subscription_deleted(event.data.object)
      when 'customer.subscription.trial_will_end'
        handle_trial_ending(event.data.object)
      when 'invoice.created'
        handle_invoice_created(event.data.object)
      when 'invoice.payment_succeeded'
        handle_invoice_payment_succeeded(event.data.object)
      when 'invoice.payment_failed'
        handle_invoice_payment_failed(event.data.object)
      when 'payment_method.attached'
        handle_payment_method_attached(event.data.object)
      when 'payment_method.detached'
        handle_payment_method_detached(event.data.object)
      when 'payment_method.updated'
        handle_payment_method_updated(event.data.object)
      when 'checkout.session.completed'
        handle_checkout_completed(event.data.object)
      else
        Rails.logger.info "Unhandled Stripe event type: #{event.type}"
      end

      render json: { received: true }, status: :ok
    end

    private

    def handle_subscription_created(stripe_subscription)
      OrganizationSubscription.create_or_update_from_stripe(stripe_subscription)
      
      # Send welcome email
      organization = Organization.find_by(stripe_customer_id: stripe_subscription.customer)
      if organization
        OrganizationMailer.subscription_created(organization).deliver_later
        Rails.logger.info "Subscription created for organization #{organization.id}"
      end
    end

    def handle_subscription_updated(stripe_subscription)
      subscription = OrganizationSubscription.find_by(stripe_subscription_id: stripe_subscription.id)
      return unless subscription

      # Update local subscription
      OrganizationSubscription.create_or_update_from_stripe(stripe_subscription)

      # Check for plan changes
      new_price_id = stripe_subscription.items.data.first.price.id
      if subscription.subscription_plan.stripe_price_id != new_price_id
        new_plan = SubscriptionPlan.find_by(stripe_price_id: new_price_id)
        if new_plan
          old_plan = subscription.subscription_plan
          subscription.update!(subscription_plan: new_plan)
          
          # Send plan change notification
          OrganizationMailer.plan_changed(
            subscription.organization, 
            old_plan, 
            new_plan
          ).deliver_later
        end
      end

      Rails.logger.info "Subscription updated for organization #{subscription.organization_id}"
    end

    def handle_subscription_deleted(stripe_subscription)
      subscription = OrganizationSubscription.find_by(stripe_subscription_id: stripe_subscription.id)
      return unless subscription

      subscription.update!(
        status: :canceled,
        canceled_at: Time.at(stripe_subscription.canceled_at || stripe_subscription.ended_at)
      )

      # Send cancellation confirmation
      OrganizationMailer.subscription_canceled(subscription.organization).deliver_later
      
      Rails.logger.info "Subscription canceled for organization #{subscription.organization_id}"
    end

    def handle_trial_ending(stripe_subscription)
      subscription = OrganizationSubscription.find_by(stripe_subscription_id: stripe_subscription.id)
      return unless subscription

      # Send trial ending reminder (3 days before)
      OrganizationMailer.trial_ending(subscription.organization).deliver_later
      
      Rails.logger.info "Trial ending notification sent for organization #{subscription.organization_id}"
    end

    def handle_invoice_created(stripe_invoice)
      # Create local invoice record
      Invoice.create_from_stripe(stripe_invoice)
      
      Rails.logger.info "Invoice created: #{stripe_invoice.id}"
    end

    def handle_invoice_payment_succeeded(stripe_invoice)
      invoice = Invoice.find_by(stripe_invoice_id: stripe_invoice.id)
      
      if invoice
        invoice.update!(
          status: :paid,
          paid_at: Time.at(stripe_invoice.status_transitions.paid_at)
        )
      else
        # Create invoice if it doesn't exist
        invoice = Invoice.create_from_stripe(stripe_invoice)
      end

      # Update subscription status if it was past due
      subscription = invoice.organization_subscription
      if subscription&.past_due?
        subscription.update!(status: :active)
      end

      # Send payment receipt
      OrganizationMailer.payment_receipt(invoice).deliver_later
      
      Rails.logger.info "Invoice payment succeeded: #{stripe_invoice.id}"
    end

    def handle_invoice_payment_failed(stripe_invoice)
      invoice = Invoice.find_by(stripe_invoice_id: stripe_invoice.id)
      invoice ||= Invoice.create_from_stripe(stripe_invoice)

      # Update subscription status
      subscription = invoice.organization_subscription
      if subscription
        case stripe_invoice.attempt_count
        when 1
          subscription.update!(status: :past_due)
        when 3
          subscription.update!(status: :unpaid)
        end
      end

      # Send payment failure notification
      OrganizationMailer.payment_failed(invoice.organization).deliver_later
      
      Rails.logger.warn "Invoice payment failed: #{stripe_invoice.id}, attempt: #{stripe_invoice.attempt_count}"
    end

    def handle_payment_method_attached(stripe_payment_method)
      organization = Organization.find_by(stripe_customer_id: stripe_payment_method.customer)
      return unless organization

      # Create local payment method record
      PaymentMethod.create_from_stripe(stripe_payment_method, organization)
      
      Rails.logger.info "Payment method attached for organization #{organization.id}"
    end

    def handle_payment_method_detached(stripe_payment_method)
      payment_method = PaymentMethod.find_by(stripe_payment_method_id: stripe_payment_method.id)
      return unless payment_method

      payment_method.destroy
      
      Rails.logger.info "Payment method detached: #{stripe_payment_method.id}"
    end

    def handle_payment_method_updated(stripe_payment_method)
      payment_method = PaymentMethod.find_by(stripe_payment_method_id: stripe_payment_method.id)
      return unless payment_method

      # Update card details if changed
      if stripe_payment_method.type == 'card'
        card = stripe_payment_method.card
        payment_method.update!(
          last4: card.last4,
          brand: card.brand,
          exp_month: card.exp_month,
          exp_year: card.exp_year
        )
      end
      
      Rails.logger.info "Payment method updated: #{stripe_payment_method.id}"
    end

    def handle_checkout_completed(checkout_session)
      # Handle successful checkout
      # The subscription should already be created via subscription.created webhook
      
      # You might want to track conversion metrics here
      Rails.logger.info "Checkout completed: #{checkout_session.id}"
      
      # Mark any pending setup as complete
      if checkout_session.metadata['organization_id']
        organization = Organization.find(checkout_session.metadata['organization_id'])
        organization.update!(metadata: organization.metadata.merge(
          checkout_completed_at: Time.current,
          checkout_session_id: checkout_session.id
        ))
      end
    end
  end
end