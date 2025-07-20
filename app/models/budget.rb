# frozen_string_literal: true

# == Schema Information
#
# Table name: budgets
#
#  id              :bigint           not null, primary key
#  name            :string           not null
#  budget_type     :string           not null
#  amount          :decimal(10, 2)   not null
#  period_start    :date             not null
#  period_end      :date             not null
#  status          :string           default("active")
#  organization_id :bigint           not null
#  team_id         :bigint
#  category        :string
#  description     :text
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#

class Budget < ApplicationRecord
  include TenantScoped

  # Associations
  belongs_to :organization
  belongs_to :team, optional: true
  has_many :expenses, dependent: :restrict_with_error
  has_many :revenues, dependent: :restrict_with_error

  # Validations
  validates :name, presence: true
  validates :budget_type, presence: true, inclusion: { in: %w[league team category project] }
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :period_start, presence: true
  validates :period_end, presence: true
  validates :status, inclusion: { in: %w[draft active closed] }
  validate :end_date_after_start_date
  validate :team_budget_requires_team

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :for_current_period, -> { where('period_start <= ? AND period_end >= ?', Date.current, Date.current) }
  scope :league_budgets, -> { where(budget_type: 'league') }
  scope :team_budgets, -> { where(budget_type: 'team') }
  scope :by_category, ->(category) { where(category: category) }

  # Budget categories
  CATEGORIES = [
    'venue_rental',        # 会場費
    'referee_fees',        # 審判費用
    'equipment',           # 備品・設備
    'insurance',           # 保険料
    'administrative',      # 管理費
    'marketing',           # 広告・宣伝費
    'prize_money',         # 賞金
    'transportation',      # 交通費
    'miscellaneous'       # その他
  ].freeze

  def spent_amount
    expenses.where(
      'expense_date >= ? AND expense_date <= ?',
      period_start,
      period_end
    ).sum(:amount)
  end

  def revenue_amount
    revenues.where(
      'revenue_date >= ? AND revenue_date <= ?',
      period_start,
      period_end
    ).sum(:amount)
  end

  def remaining_amount
    amount - spent_amount
  end

  def utilization_rate
    return 0 if amount.zero?
    (spent_amount / amount * 100).round(2)
  end

  def is_over_budget?
    spent_amount > amount
  end

  def days_remaining
    return 0 if period_end < Date.current
    (period_end - Date.current).to_i
  end

  def budget_health
    case utilization_rate
    when 0..70
      'healthy'
    when 70..90
      'warning'
    else
      'critical'
    end
  end

  private

  def end_date_after_start_date
    return unless period_start && period_end
    errors.add(:period_end, 'は開始日より後の日付を選択してください') if period_end <= period_start
  end

  def team_budget_requires_team
    return unless budget_type == 'team'
    errors.add(:team_id, 'チーム予算にはチームの指定が必要です') if team_id.blank?
  end
end