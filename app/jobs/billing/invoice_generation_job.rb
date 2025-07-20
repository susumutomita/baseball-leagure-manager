# frozen_string_literal: true

module Billing
  class InvoiceGenerationJob < ApplicationJob
    queue_as :billing

    def perform
      # Generate monthly invoices for all active subscriptions
      OrganizationSubscription.active.find_each do |subscription|
        next unless subscription.current_period_end&.today?

        begin
          generator = InvoiceGenerator.new(
            subscription.organization,
            period_start: subscription.current_period_start,
            period_end: subscription.current_period_end
          )
          
          invoice = generator.generate_monthly_invoice
          invoice.send_invoice_email if invoice
          
          Rails.logger.info "Generated invoice for organization #{subscription.organization_id}"
        rescue StandardError => e
          Rails.logger.error "Failed to generate invoice for organization #{subscription.organization_id}: #{e.message}"
          # You might want to send an alert to admin here
        end
      end
    end
  end
end