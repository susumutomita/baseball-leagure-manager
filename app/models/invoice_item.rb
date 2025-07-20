# frozen_string_literal: true

class InvoiceItem < ApplicationRecord
  # Associations
  belongs_to :invoice

  # Validations
  validates :description, presence: true
  validates :quantity, presence: true, numericality: { greater_than: 0 }
  validates :unit_price_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :total_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }

  # Callbacks
  before_validation :calculate_total

  # Instance methods
  def unit_price_in_yen
    unit_price_cents / 100.0
  end

  def total_in_yen
    total_cents / 100.0
  end

  private

  def calculate_total
    self.total_cents = quantity * unit_price_cents if quantity && unit_price_cents
  end
end