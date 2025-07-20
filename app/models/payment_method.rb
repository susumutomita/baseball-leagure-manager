# frozen_string_literal: true

class PaymentMethod < ApplicationRecord
  # Associations
  belongs_to :organization

  # Validations
  validates :stripe_payment_method_id, presence: true, uniqueness: true
  validates :payment_type, presence: true
  validates :last4, presence: true, length: { is: 4 }

  # Enums
  enum payment_type: {
    card: 0,
    bank_account: 1
  }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :default, -> { where(is_default: true) }

  # Callbacks
  before_save :ensure_single_default, if: :is_default?
  after_destroy :set_new_default, if: :is_default?

  # Class methods
  def self.create_from_stripe(stripe_payment_method, organization)
    payment_method = new(
      organization: organization,
      stripe_payment_method_id: stripe_payment_method.id,
      payment_type: stripe_payment_method.type == 'card' ? 'card' : 'bank_account'
    )

    if stripe_payment_method.type == 'card'
      card = stripe_payment_method.card
      payment_method.assign_attributes(
        last4: card.last4,
        brand: card.brand,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        metadata: {
          fingerprint: card.fingerprint,
          country: card.country,
          funding: card.funding
        }
      )
    elsif stripe_payment_method.type == 'bank_account'
      bank = stripe_payment_method.bank_account
      payment_method.assign_attributes(
        last4: bank.last4,
        brand: bank.bank_name,
        metadata: {
          account_holder_type: bank.account_holder_type,
          country: bank.country,
          currency: bank.currency
        }
      )
    end

    payment_method.save!
    payment_method
  end

  # Instance methods
  def display_name
    if card?
      "#{brand&.capitalize} •••• #{last4}"
    else
      "#{brand} •••• #{last4}"
    end
  end

  def expired?
    return false unless card? && exp_month && exp_year
    
    expiration_date = Date.new(exp_year, exp_month, -1)
    expiration_date < Date.current
  end

  def expiring_soon?
    return false unless card? && exp_month && exp_year
    
    expiration_date = Date.new(exp_year, exp_month, -1)
    expiration_date <= 3.months.from_now.to_date
  end

  def make_default!
    transaction do
      ensure_single_default
      update!(is_default: true)
    end
  end

  def attach_to_customer
    return if organization.stripe_customer_id.blank?

    stripe_service = StripeService.new
    stripe_service.attach_payment_method(
      payment_method_id: stripe_payment_method_id,
      customer_id: organization.stripe_customer_id
    )
  end

  def detach_from_customer
    stripe_service = StripeService.new
    stripe_service.detach_payment_method(stripe_payment_method_id)
    destroy
  end

  private

  def ensure_single_default
    return unless is_default?
    
    organization.payment_methods.where(is_default: true)
                                .where.not(id: id)
                                .update_all(is_default: false)
  end

  def set_new_default
    return unless organization.payment_methods.active.any?
    
    # Set the most recently added active payment method as default
    organization.payment_methods.active.order(created_at: :desc).first&.make_default!
  end
end