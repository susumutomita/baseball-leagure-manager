# frozen_string_literal: true

class ReportMailerJob < ApplicationJob
  queue_as :mailers

  def perform(report)
    return unless report.completed?
    return if report.recipients.blank?

    Rails.logger.info "Sending report ##{report.id} to recipients"

    report.recipients.each do |recipient|
      begin
        # This would send the actual email
        # ReportMailer.performance_report(report, recipient).deliver_later
        Rails.logger.info "Would send report ##{report.id} to #{recipient}"
      rescue StandardError => e
        Rails.logger.error "Failed to send report ##{report.id} to #{recipient}: #{e.message}"
      end
    end

    report.update!(sent_at: Time.current)
  end
end