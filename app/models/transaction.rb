class Transaction < ApplicationRecord
  belongs_to :team
  belongs_to :league

  # Enums
  enum payment_status: {
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
    refunded: 'refunded'
  }

  enum payment_method: {
    credit_card: 'credit_card',
    bank_transfer: 'bank_transfer',
    cash: 'cash'
  }, _prefix: true

  # Validations
  validates :amount, presence: true,
                    numericality: { greater_than_or_equal_to: 0 }
  validates :description, presence: true
  validates :payment_status, presence: true
  validates :transaction_date, presence: true
  validates :payment_reference, uniqueness: true, allow_nil: true

  # Callbacks
  before_validation :set_transaction_date, on: :create
  before_create :generate_payment_reference

  # Scopes
  scope :successful, -> { where(payment_status: :completed) }
  scope :pending_payment, -> { where(payment_status: :pending) }
  scope :by_date_range, ->(start_date, end_date) {
    where(transaction_date: start_date..end_date)
  }

  # Methods
  def mark_as_paid(payment_method:, reference: nil)
    update(
      payment_status: :completed,
      payment_method: payment_method,
      payment_reference: reference,
      paid_at: Time.current
    )
  end

  def refundable?
    completed? && !refunded? && transaction_date > 30.days.ago
  end

  def process_refund(reason:)
    return false unless refundable?

    update(
      payment_status: :refunded,
      refund_reason: reason,
      refunded_at: Time.current
    )
  end

  private

  def set_transaction_date
    self.transaction_date ||= Time.current
  end

  def generate_payment_reference
    return if payment_reference.present?

    loop do
      reference = "TXN-#{Time.current.strftime('%Y%m%d')}-#{SecureRandom.hex(4).upcase}"
      unless Transaction.exists?(payment_reference: reference)
        self.payment_reference = reference
        break
      end
    end
  end
end
