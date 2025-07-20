# frozen_string_literal: true

module Billing
  class PaymentProcessor
    attr_reader :organization, :stripe_service

    def initialize(organization)
      @organization = organization
      @stripe_service = StripeService.new
    end

    def process_payment(amount_cents:, description:, payment_method: nil, metadata: {})
      payment_method ||= organization.default_payment_method
      raise 'No payment method available' unless payment_method

      # Create payment intent
      payment_intent = create_payment_intent(
        amount_cents: amount_cents,
        description: description,
        payment_method: payment_method,
        metadata: metadata
      )

      # Confirm payment
      confirm_payment_intent(payment_intent)

      # Create transaction record
      create_transaction_record(payment_intent)

      payment_intent
    rescue Stripe::CardError => e
      handle_payment_failure(e, payment_method)
      raise
    end

    def process_invoice_payment(invoice)
      raise 'Invoice already paid' if invoice.paid?
      
      if invoice.stripe_invoice_id
        # Pay through Stripe
        stripe_invoice = stripe_service.pay_invoice(invoice.stripe_invoice_id)
        invoice.update!(
          status: :paid,
          paid_at: Time.at(stripe_invoice.status_transitions.paid_at)
        )
      else
        # Process custom invoice payment
        process_payment(
          amount_cents: invoice.total_cents,
          description: "Invoice #{invoice.invoice_number}",
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number
          }
        )
        invoice.mark_as_paid!
      end

      # Send receipt
      OrganizationMailer.payment_receipt(invoice).deliver_later
      
      invoice
    end

    def setup_payment_intent(payment_method_id: nil)
      # Create setup intent for saving payment method without charging
      setup_intent = Stripe::SetupIntent.create(
        customer: organization.stripe_customer_id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          organization_id: organization.id
        }
      )

      if payment_method_id
        Stripe::SetupIntent.confirm(
          setup_intent.id,
          payment_method: payment_method_id
        )
      end

      setup_intent
    rescue Stripe::StripeError => e
      Rails.logger.error "Setup intent creation failed: #{e.message}"
      raise
    end

    def process_overage_charges
      subscription = organization.organization_subscription
      return unless subscription&.active?

      overage_charges = subscription.calculate_overage_charges
      return if overage_charges.empty?

      # Create invoice items for overages
      overage_charges.each do |resource, charge|
        create_overage_invoice_item(resource, charge)
      end

      # Invoice will be included in next billing cycle
      Rails.logger.info "Overage charges processed for organization #{organization.id}: #{overage_charges}"
    end

    def retry_failed_payments
      # Find all past due invoices
      organization.invoices.unpaid.overdue.each do |invoice|
        retry_invoice_payment(invoice)
      rescue Stripe::CardError => e
        Rails.logger.error "Failed to retry payment for invoice #{invoice.id}: #{e.message}"
        # Continue with next invoice
      end
    end

    def update_payment_method(payment_method_id)
      # Attach new payment method
      stripe_service.attach_payment_method(
        payment_method_id: payment_method_id,
        customer_id: organization.stripe_customer_id
      )

      # Set as default
      stripe_service.set_default_payment_method(
        organization.stripe_customer_id,
        payment_method_id
      )

      # Create local record
      stripe_payment_method = Stripe::PaymentMethod.retrieve(payment_method_id)
      payment_method = PaymentMethod.create_from_stripe(stripe_payment_method, organization)
      payment_method.make_default!

      # Retry any failed payments
      retry_failed_payments

      payment_method
    rescue Stripe::StripeError => e
      Rails.logger.error "Payment method update failed: #{e.message}"
      raise
    end

    def validate_payment_method(payment_method)
      # Create a small test charge to validate the payment method
      test_charge = Stripe::Charge.create(
        amount: 100, # ¥100
        currency: 'jpy',
        customer: organization.stripe_customer_id,
        payment_method: payment_method.stripe_payment_method_id,
        description: 'Card validation',
        capture: false, # Don't actually charge, just authorize
        metadata: {
          organization_id: organization.id,
          validation: true
        }
      )

      # Cancel the test charge
      Stripe::Charge.capture(test_charge.id, amount: 0)

      true
    rescue Stripe::CardError => e
      Rails.logger.warn "Payment method validation failed: #{e.message}"
      false
    end

    private

    def create_payment_intent(amount_cents:, description:, payment_method:, metadata: {})
      Stripe::PaymentIntent.create(
        amount: amount_cents,
        currency: 'jpy',
        customer: organization.stripe_customer_id,
        payment_method: payment_method.stripe_payment_method_id,
        description: description,
        confirm: false,
        off_session: true,
        metadata: metadata.merge(
          organization_id: organization.id,
          organization_name: organization.name
        )
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Payment intent creation failed: #{e.message}"
      raise
    end

    def confirm_payment_intent(payment_intent)
      Stripe::PaymentIntent.confirm(payment_intent.id)
    rescue Stripe::CardError => e
      # Payment failed - update payment intent with error
      payment_intent.update(
        metadata: payment_intent.metadata.merge(
          error_message: e.message,
          error_code: e.code
        )
      )
      raise
    end

    def create_transaction_record(payment_intent)
      # Create a transaction record in your database
      # This assumes you have a Transaction model
      organization.transactions.create!(
        amount_cents: payment_intent.amount,
        currency: payment_intent.currency,
        status: payment_intent.status,
        stripe_payment_intent_id: payment_intent.id,
        description: payment_intent.description,
        metadata: payment_intent.metadata
      )
    end

    def create_overage_invoice_item(resource, charge)
      Stripe::InvoiceItem.create(
        customer: organization.stripe_customer_id,
        amount: charge[:total_cents],
        currency: 'jpy',
        description: "#{resource} overage: #{charge[:quantity]} units",
        metadata: {
          organization_id: organization.id,
          resource: resource,
          quantity: charge[:quantity],
          unit_price_cents: charge[:unit_price_cents]
        }
      )
    rescue Stripe::StripeError => e
      Rails.logger.error "Overage invoice item creation failed: #{e.message}"
      raise
    end

    def retry_invoice_payment(invoice)
      return unless invoice.open?

      begin
        stripe_service.pay_invoice(invoice.stripe_invoice_id)
        invoice.update!(status: :paid, paid_at: Time.current)
        
        # Update subscription status if needed
        if organization.organization_subscription.past_due?
          organization.organization_subscription.update!(status: :active)
        end
        
        Rails.logger.info "Successfully retried payment for invoice #{invoice.id}"
      rescue Stripe::CardError => e
        # Update invoice with retry attempt
        invoice.update!(
          metadata: invoice.metadata.merge(
            last_retry_at: Time.current,
            last_retry_error: e.message
          )
        )
        
        # Check if we should downgrade or suspend
        if invoice.days_overdue > 30
          downgrade_or_suspend_account
        end
        
        raise
      end
    end

    def handle_payment_failure(error, payment_method)
      # Log the failure
      Rails.logger.error "Payment failed for organization #{organization.id}: #{error.message}"

      # Update payment method status if card was declined
      if error.code == 'card_declined'
        payment_method.update!(
          active: false,
          metadata: payment_method.metadata.merge(
            declined_at: Time.current,
            decline_reason: error.decline_code
          )
        )
      end

      # Send notification
      OrganizationMailer.payment_failed(organization).deliver_later
    end

    def downgrade_or_suspend_account
      subscription = organization.organization_subscription
      return unless subscription

      # Try to downgrade to free plan
      free_plan = SubscriptionPlan.basic
      if free_plan && subscription.subscription_plan != free_plan
        begin
          SubscriptionManager.new(organization).change_plan(free_plan, prorate: false)
          Rails.logger.info "Downgraded organization #{organization.id} to free plan due to payment failure"
        rescue StandardError => e
          Rails.logger.error "Failed to downgrade organization #{organization.id}: #{e.message}"
          # If downgrade fails, suspend the account
          subscription.update!(status: :unpaid)
        end
      else
        # Already on free plan or downgrade not possible - suspend
        subscription.update!(status: :unpaid)
      end
    end
  end
end