# frozen_string_literal: true

class Invoice < ApplicationRecord
  # Associations
  belongs_to :organization
  belongs_to :organization_subscription
  has_many :invoice_items, dependent: :destroy

  # Validations
  validates :stripe_invoice_id, uniqueness: { allow_nil: true }
  validates :status, presence: true
  validates :total_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :currency, presence: true
  validates :invoice_number, presence: true, uniqueness: true

  # Enums
  enum status: {
    draft: 0,
    open: 1,
    paid: 2,
    uncollectible: 3,
    void: 4
  }

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :unpaid, -> { where(status: %i[open]) }
  scope :overdue, -> { unpaid.where('due_date < ?', Date.current) }

  # Callbacks
  before_validation :generate_invoice_number, on: :create
  after_update :send_payment_receipt, if: -> { saved_change_to_status? && paid? }

  # Class methods
  def self.create_from_stripe(stripe_invoice)
    organization = Organization.find_by(stripe_customer_id: stripe_invoice.customer)
    return unless organization

    subscription = organization.organization_subscription
    return unless subscription

    invoice = find_or_initialize_by(stripe_invoice_id: stripe_invoice.id)
    invoice.assign_attributes(
      organization: organization,
      organization_subscription: subscription,
      status: stripe_invoice.status,
      total_cents: stripe_invoice.total,
      subtotal_cents: stripe_invoice.subtotal,
      tax_cents: stripe_invoice.tax || 0,
      currency: stripe_invoice.currency,
      invoice_date: Time.at(stripe_invoice.created),
      due_date: stripe_invoice.due_date ? Time.at(stripe_invoice.due_date) : nil,
      paid_at: stripe_invoice.status == 'paid' ? Time.at(stripe_invoice.status_transitions.paid_at) : nil,
      stripe_hosted_invoice_url: stripe_invoice.hosted_invoice_url,
      stripe_invoice_pdf: stripe_invoice.invoice_pdf,
      metadata: stripe_invoice.metadata.to_h
    )

    invoice.save!

    # Create invoice items
    stripe_invoice.lines.data.each do |line_item|
      invoice.invoice_items.create!(
        description: line_item.description,
        quantity: line_item.quantity,
        unit_price_cents: line_item.unit_amount,
        total_cents: line_item.amount,
        period_start: Time.at(line_item.period.start),
        period_end: Time.at(line_item.period.end),
        metadata: line_item.metadata.to_h
      )
    end

    invoice
  end

  def self.generate_next_invoice_number
    last_invoice = order(:created_at).last
    return "INV-#{Date.current.strftime('%Y%m')}-0001" unless last_invoice

    # Extract the sequence number from the last invoice
    match = last_invoice.invoice_number.match(/INV-(\d{6})-(\d{4})/)
    return "INV-#{Date.current.strftime('%Y%m')}-0001" unless match

    year_month = match[1]
    sequence = match[2].to_i

    # Reset sequence if new month
    if year_month != Date.current.strftime('%Y%m')
      "INV-#{Date.current.strftime('%Y%m')}-0001"
    else
      "INV-#{year_month}-#{(sequence + 1).to_s.rjust(4, '0')}"
    end
  end

  # Instance methods
  def total_in_yen
    total_cents / 100.0
  end

  def subtotal_in_yen
    subtotal_cents / 100.0
  end

  def tax_in_yen
    tax_cents / 100.0
  end

  def overdue?
    open? && due_date && due_date < Date.current
  end

  def days_overdue
    return 0 unless overdue?
    (Date.current - due_date).to_i
  end

  def mark_as_paid!(paid_at: Time.current)
    update!(status: :paid, paid_at: paid_at)
  end

  def void!(reason: nil)
    update!(status: :void, metadata: metadata.merge(void_reason: reason))
  end

  def send_invoice_email
    OrganizationMailer.invoice_created(self).deliver_later
  end

  def generate_pdf
    # This would integrate with a PDF generation service
    # For now, we'll use the Stripe-provided PDF if available
    return stripe_invoice_pdf if stripe_invoice_pdf.present?

    # Placeholder for custom PDF generation
    InvoicePdfGenerator.new(self).generate
  end

  def download_url
    return stripe_invoice_pdf if stripe_invoice_pdf.present?
    
    # Generate a temporary download URL for custom PDFs
    Rails.application.routes.url_helpers.download_invoice_url(
      self,
      expires_at: 1.hour.from_now.to_i,
      signature: generate_download_signature
    )
  end

  private

  def generate_invoice_number
    self.invoice_number ||= self.class.generate_next_invoice_number
  end

  def send_payment_receipt
    OrganizationMailer.payment_receipt(self).deliver_later
  end

  def generate_download_signature
    # Generate a secure signature for download URLs
    Rails.application.message_verifier(:invoice_download).generate({
      invoice_id: id,
      expires_at: 1.hour.from_now
    })
  end
end