# frozen_string_literal: true

# == Schema Information
#
# Table name: expenses
#
#  id              :bigint           not null, primary key
#  name            :string           not null
#  amount          :decimal(10, 2)   not null
#  expense_date    :date             not null
#  category        :string           not null
#  payment_method  :string
#  payment_status  :string           default("pending")
#  description     :text
#  receipt_url     :string
#  organization_id :bigint           not null
#  budget_id       :bigint
#  team_id         :bigint
#  match_id        :bigint
#  venue_id        :bigint
#  approved_by_id  :bigint
#  approved_at     :datetime
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#

class Expense < ApplicationRecord
  include TenantScoped

  # Associations
  belongs_to :organization
  belongs_to :budget, optional: true
  belongs_to :team, optional: true
  belongs_to :match, optional: true
  belongs_to :venue, optional: true
  belongs_to :approved_by, class_name: 'User', optional: true

  # Validations
  validates :name, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :expense_date, presence: true
  validates :category, presence: true, inclusion: { in: Budget::CATEGORIES }
  validates :payment_status, inclusion: { in: %w[pending processing paid cancelled refunded] }

  # Scopes
  scope :paid, -> { where(payment_status: 'paid') }
  scope :pending, -> { where(payment_status: 'pending') }
  scope :for_period, ->(start_date, end_date) { where(expense_date: start_date..end_date) }
  scope :by_category, ->(category) { where(category: category) }
  scope :approved, -> { where.not(approved_at: nil) }
  scope :pending_approval, -> { where(approved_at: nil) }

  # Callbacks
  before_save :auto_categorize_expense, if: :should_auto_categorize?
  after_create :check_budget_limit
  after_update :notify_if_over_budget, if: :saved_change_to_amount?

  # Payment methods
  PAYMENT_METHODS = %w[cash bank_transfer credit_card].freeze

  def approve!(user)
    update!(
      approved_by: user,
      approved_at: Time.current
    )
  end

  def approved?
    approved_at.present?
  end

  def over_budget?
    return false unless budget
    budget.is_over_budget?
  end

  def budget_impact
    return 0 unless budget
    (amount / budget.amount * 100).round(2)
  end

  def auto_assign_budget
    return if budget.present?
    
    self.budget = organization.budgets
      .active
      .for_current_period
      .where(category: category)
      .where('team_id = ? OR team_id IS NULL', team_id)
      .order(team_id: :desc) # Prefer team-specific budgets
      .first
  end

  private

  def should_auto_categorize?
    category.blank? && (match_id.present? || venue_id.present?)
  end

  def auto_categorize_expense
    if venue_id.present?
      self.category = 'venue_rental'
    elsif match_id.present? && name =~ /審判|レフリー|referee/i
      self.category = 'referee_fees'
    end
  end

  def check_budget_limit
    return unless budget && budget.utilization_rate > 80
    
    BudgetAlertJob.perform_later(budget, self)
  end

  def notify_if_over_budget
    return unless budget && budget.is_over_budget?
    
    BudgetOverageNotificationJob.perform_later(budget, self)
  end
end