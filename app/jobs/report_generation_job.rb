# frozen_string_literal: true

class ReportGenerationJob < ApplicationJob
  queue_as :default

  def perform(report)
    Rails.logger.info "Starting report generation for report ##{report.id}"
    
    begin
      report.generate!
      Rails.logger.info "Successfully generated report ##{report.id}"
    rescue StandardError => e
      Rails.logger.error "Failed to generate report ##{report.id}: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      raise # Re-raise to trigger retry
    end
  end
end