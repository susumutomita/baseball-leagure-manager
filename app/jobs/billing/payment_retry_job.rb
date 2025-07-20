# frozen_string_literal: true

module Billing
  class PaymentRetryJob < ApplicationJob
    queue_as :billing

    def perform
      # Retry failed payments for past due subscriptions
      OrganizationSubscription.past_due.includes(:organization).find_each do |subscription|
        organization = subscription.organization
        processor = PaymentProcessor.new(organization)
        
        begin
          processor.retry_failed_payments
          Rails.logger.info "Retried payments for organization #{organization.id}"
        rescue StandardError => e
          Rails.logger.error "Failed to retry payments for organization #{organization.id}: #{e.message}"
        end
      end
    end
  end
end