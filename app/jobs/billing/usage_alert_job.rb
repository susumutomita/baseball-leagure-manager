# frozen_string_literal: true

module Billing
  class UsageAlertJob < ApplicationJob
    queue_as :billing

    def perform
      # Check usage limits for all active subscriptions
      OrganizationSubscription.active.includes(:organization).find_each do |subscription|
        tracker = UsageTracker.new(subscription.organization)
        alerts = tracker.alert_approaching_limits
        
        if alerts.any?
          Rails.logger.info "Usage alerts sent for organization #{subscription.organization_id}: #{alerts.count} resources"
        end
      end
    end
  end
end