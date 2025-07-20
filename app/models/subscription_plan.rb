# frozen_string_literal: true

class SubscriptionPlan < ApplicationRecord
  # Validations
  validates :name, presence: true, uniqueness: true
  validates :price_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :currency, presence: true
  validates :billing_interval, presence: true, inclusion: { in: %w[month year] }
  validates :position, presence: true, uniqueness: true

  # Scopes
  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:position) }

  # Constants
  BASIC_PLAN = 'basic'
  PRO_PLAN = 'pro'
  ENTERPRISE_PLAN = 'enterprise'

  # Default limits for each plan
  DEFAULT_LIMITS = {
    BASIC_PLAN => {
      teams: 3,
      matches_per_month: 10,
      players_per_team: 20,
      storage_gb: 1,
      api_calls_per_day: 100
    },
    PRO_PLAN => {
      teams: 10,
      matches_per_month: 50,
      players_per_team: 30,
      storage_gb: 10,
      api_calls_per_day: 1000
    },
    ENTERPRISE_PLAN => {
      teams: -1, # unlimited
      matches_per_month: -1, # unlimited
      players_per_team: -1, # unlimited
      storage_gb: 100,
      api_calls_per_day: 10000
    }
  }.freeze

  # Class methods
  def self.basic
    find_by(name: BASIC_PLAN)
  end

  def self.pro
    find_by(name: PRO_PLAN)
  end

  def self.enterprise
    find_by(name: ENTERPRISE_PLAN)
  end

  # Instance methods
  def price_in_yen
    price_cents / 100
  end

  def free?
    price_cents.zero?
  end

  def unlimited?(feature)
    limits&.dig(feature.to_s) == -1
  end

  def limit_for(feature)
    limits&.dig(feature.to_s) || 0
  end

  def feature_included?(feature)
    features&.include?(feature.to_s)
  end

  def monthly_price_cents
    case billing_interval
    when 'month'
      price_cents
    when 'year'
      (price_cents / 12.0).round
    else
      price_cents
    end
  end

  def yearly_price_cents
    case billing_interval
    when 'month'
      price_cents * 12
    when 'year'
      price_cents
    else
      price_cents * 12
    end
  end

  def stripe_price_data
    {
      unit_amount: price_cents,
      currency: currency,
      recurring: {
        interval: billing_interval
      },
      product_data: {
        name: name,
        metadata: {
          plan_id: id,
          plan_name: name
        }
      }
    }
  end
end