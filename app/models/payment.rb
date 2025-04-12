class Payment < ApplicationRecord
  belongs_to :user
  belongs_to :payable, polymorphic: true
  
  enum status: { pending: 0, completed: 1, failed: 2, refunded: 3 }
  enum payment_method: { credit_card: 0, bank_transfer: 1, cash: 2 }
  
  validates :amount, numericality: { greater_than: 0 }
  validates :description, presence: true
  
  scope :successful, -> { where(status: :completed) }
  scope :pending, -> { where(status: :pending) }
  
  def mark_as_completed!
    update(status: :completed, completed_at: Time.current)
  end
  
  def refund!
    update(status: :refunded, refunded_at: Time.current)
  end
end
