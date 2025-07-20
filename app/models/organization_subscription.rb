# frozen_string_literal: true

class OrganizationSubscription < ApplicationRecord
  # Associations
  belongs_to :organization
  belongs_to :subscription_plan
  has_many :invoices, dependent: :destroy
  has_many :usages, dependent: :destroy

  # Validations
  validates :organization_id, uniqueness: true
  validates :status, presence: true
  validates :stripe_subscription_id, uniqueness: { allow_nil: true }

  # Enums
  enum status: {
    trialing: 0,
    active: 1,
    past_due: 2,
    canceled: 3,
    unpaid: 4,
    incomplete: 5,
    incomplete_expired: 6
  }

  # Scopes
  scope :active_or_trialing, -> { where(status: %i[active trialing]) }
  scope :requiring_payment_method, -> { where(status: %i[past_due unpaid incomplete]) }
  scope :expiring_soon, -> { where('current_period_end <= ?', 7.days.from_now) }

  # Callbacks
  before_validation :set_default_trial_end, on: :create
  after_update :handle_status_change, if: :saved_change_to_status?

  # Class methods
  def self.create_or_update_from_stripe(stripe_subscription)
    organization = Organization.find_by(stripe_customer_id: stripe_subscription.customer)
    return unless organization

    subscription_plan = SubscriptionPlan.find_by(stripe_price_id: stripe_subscription.items.data.first.price.id)
    return unless subscription_plan

    subscription = find_or_initialize_by(stripe_subscription_id: stripe_subscription.id)
    subscription.update!(
      organization: organization,
      subscription_plan: subscription_plan,
      status: stripe_subscription.status,
      current_period_start: Time.at(stripe_subscription.current_period_start),
      current_period_end: Time.at(stripe_subscription.current_period_end),
      trial_end: stripe_subscription.trial_end ? Time.at(stripe_subscription.trial_end) : nil,
      cancel_at_period_end: stripe_subscription.cancel_at_period_end,
      canceled_at: stripe_subscription.canceled_at ? Time.at(stripe_subscription.canceled_at) : nil,
      metadata: stripe_subscription.metadata.to_h
    )
  end

  # Instance methods
  def active_or_trialing?
    active? || trialing?
  end

  def requires_payment_method?
    past_due? || unpaid? || incomplete?
  end

  def days_until_renewal
    return nil unless current_period_end
    ((current_period_end - Time.current) / 1.day).ceil
  end

  def in_trial?
    trialing? && trial_end && trial_end > Time.current
  end

  def trial_days_remaining
    return 0 unless in_trial?
    ((trial_end - Time.current) / 1.day).ceil
  end

  def can_use_feature?(feature)
    return false unless active_or_trialing?
    subscription_plan.feature_included?(feature)
  end

  def within_usage_limit?(resource, count = 1)
    return true unless active_or_trialing?
    
    limit = subscription_plan.limit_for(resource)
    return true if limit == -1 # unlimited

    current_usage = current_usage_for(resource)
    current_usage + count <= limit
  end

  def current_usage_for(resource)
    # Calculate current usage based on resource type
    case resource.to_s
    when 'teams'
      organization.teams.count
    when 'matches_per_month'
      organization.matches.where(created_at: current_period_start..current_period_end).count
    when 'players_per_team'
      organization.teams.joins(:players).group('teams.id').count.values.max || 0
    when 'storage_gb'
      calculate_storage_usage_gb
    when 'api_calls_per_day'
      usages.where(
        resource: 'api_calls',
        recorded_at: Time.current.beginning_of_day..Time.current.end_of_day
      ).sum(:quantity)
    else
      0
    end
  end

  def overage_for(resource)
    limit = subscription_plan.limit_for(resource)
    return 0 if limit == -1 # unlimited

    current = current_usage_for(resource)
    [current - limit, 0].max
  end

  def calculate_overage_charges
    charges = {}
    
    # Define overage rates (in cents)
    overage_rates = {
      'teams' => 1000, # ¥1,000 per extra team
      'matches_per_month' => 500, # ¥500 per extra match
      'players_per_team' => 100, # ¥100 per extra player
      'storage_gb' => 200, # ¥200 per extra GB
      'api_calls_per_day' => 10 # ¥10 per 1000 extra API calls
    }

    overage_rates.each do |resource, rate|
      overage = overage_for(resource)
      if overage > 0
        charges[resource] = {
          quantity: overage,
          unit_price_cents: rate,
          total_cents: overage * rate
        }
      end
    end

    charges
  end

  def change_plan(new_plan, prorate: true)
    raise 'Invalid plan' unless new_plan.is_a?(SubscriptionPlan)
    raise 'Cannot change to the same plan' if new_plan == subscription_plan

    if stripe_subscription_id.present?
      # Update via Stripe
      stripe_service = StripeService.new
      stripe_service.update_subscription(self, new_plan, prorate: prorate)
    else
      # Direct update for non-Stripe subscriptions
      update!(subscription_plan: new_plan)
    end
  end

  def cancel(at_period_end: true)
    if stripe_subscription_id.present?
      stripe_service = StripeService.new
      stripe_service.cancel_subscription(self, at_period_end: at_period_end)
    else
      if at_period_end
        update!(cancel_at_period_end: true)
      else
        update!(status: :canceled, canceled_at: Time.current)
      end
    end
  end

  def reactivate
    raise 'Subscription is not canceled' unless canceled? || cancel_at_period_end?

    if stripe_subscription_id.present?
      stripe_service = StripeService.new
      stripe_service.reactivate_subscription(self)
    else
      update!(cancel_at_period_end: false, status: :active)
    end
  end

  private

  def set_default_trial_end
    self.trial_end ||= 14.days.from_now if subscription_plan&.free? == false
  end

  def handle_status_change
    case status
    when 'canceled'
      OrganizationMailer.subscription_canceled(organization).deliver_later
    when 'past_due'
      OrganizationMailer.payment_failed(organization).deliver_later
    when 'unpaid'
      OrganizationMailer.subscription_suspended(organization).deliver_later
    end
  end

  def calculate_storage_usage_gb
    # Calculate storage usage from Active Storage
    # This is a simplified version - adjust based on your actual storage setup
    organization.teams.joins(logo_attachment: :blob).sum('active_storage_blobs.byte_size') / 1.gigabyte.to_f
  end
end