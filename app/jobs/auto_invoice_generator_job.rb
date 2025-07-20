# frozen_string_literal: true

class AutoInvoiceGeneratorJob < ApplicationJob
  queue_as :default

  def perform(revenue)
    return if revenue.invoice_id.present?
    
    generator = Accounting::InvoiceAutoGenerator.new(organization: revenue.organization)
    invoice = generator.generate_for_revenue(revenue)
    
    Rails.logger.info "Auto-generated invoice #{invoice.invoice_number} for revenue #{revenue.id}"
  rescue => e
    Rails.logger.error "Failed to generate invoice for revenue #{revenue.id}: #{e.message}"
    raise
  end
end