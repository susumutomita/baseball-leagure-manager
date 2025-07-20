# frozen_string_literal: true

module Billing
  class UsageCleanupJob < ApplicationJob
    queue_as :billing

    def perform
      # Clean up usage records older than 90 days
      deleted_count = Usage.cleanup_old_records(days: 90)
      
      Rails.logger.info "Cleaned up #{deleted_count} old usage records"
    end
  end
end