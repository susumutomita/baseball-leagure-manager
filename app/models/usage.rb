# frozen_string_literal: true

class Usage < ApplicationRecord
  # Associations
  belongs_to :organization
  belongs_to :organization_subscription

  # Validations
  validates :resource, presence: true
  validates :quantity, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :recorded_at, presence: true

  # Scopes
  scope :for_resource, ->(resource) { where(resource: resource) }
  scope :for_period, ->(start_date, end_date) { where(recorded_at: start_date..end_date) }
  scope :current_month, -> { for_period(Time.current.beginning_of_month, Time.current.end_of_month) }
  scope :current_day, -> { for_period(Time.current.beginning_of_day, Time.current.end_of_day) }

  # Class methods
  def self.record(organization:, resource:, quantity: 1, metadata: {})
    subscription = organization.organization_subscription
    return unless subscription&.active_or_trialing?

    create!(
      organization: organization,
      organization_subscription: subscription,
      resource: resource,
      quantity: quantity,
      recorded_at: Time.current,
      metadata: metadata
    )
  end

  def self.track_api_call(organization:, endpoint:, method:)
    record(
      organization: organization,
      resource: 'api_calls',
      quantity: 1,
      metadata: {
        endpoint: endpoint,
        method: method,
        timestamp: Time.current.iso8601
      }
    )
  end

  def self.track_storage_change(organization:, bytes_added:)
    record(
      organization: organization,
      resource: 'storage_bytes',
      quantity: bytes_added,
      metadata: {
        action: bytes_added > 0 ? 'added' : 'removed',
        bytes: bytes_added.abs
      }
    )
  end

  def self.aggregate_for_period(organization:, resource:, start_date:, end_date:, aggregation: :sum)
    scope = organization.usages
                       .for_resource(resource)
                       .for_period(start_date, end_date)

    case aggregation
    when :sum
      scope.sum(:quantity)
    when :count
      scope.count
    when :average
      scope.average(:quantity)
    when :maximum
      scope.maximum(:quantity)
    else
      scope.sum(:quantity)
    end
  end

  def self.daily_summary(organization:, date: Date.current)
    resources = %w[api_calls storage_bytes teams matches]
    
    resources.each_with_object({}) do |resource, summary|
      summary[resource] = aggregate_for_period(
        organization: organization,
        resource: resource,
        start_date: date.beginning_of_day,
        end_date: date.end_of_day
      )
    end
  end

  def self.cleanup_old_records(days: 90)
    where('recorded_at < ?', days.days.ago).delete_all
  end
end