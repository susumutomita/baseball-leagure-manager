# frozen_string_literal: true

# == Schema Information
#
# Table name: financial_reports
#
#  id                 :bigint           not null, primary key
#  report_type        :string           not null
#  period_start       :date             not null
#  period_end         :date             not null
#  total_revenue      :decimal(10, 2)   default(0)
#  total_expense      :decimal(10, 2)   default(0)
#  net_income         :decimal(10, 2)   default(0)
#  status             :string           default("draft")
#  report_data        :jsonb
#  insights           :jsonb
#  generated_by_id    :bigint
#  organization_id    :bigint           not null
#  team_id            :bigint
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#

class FinancialReport < ApplicationRecord
  include TenantScoped

  # Associations
  belongs_to :organization
  belongs_to :team, optional: true
  belongs_to :generated_by, class_name: 'User', optional: true

  # Validations
  validates :report_type, presence: true, inclusion: { in: %w[
    monthly quarterly annual balance_sheet income_statement cash_flow
  ] }
  validates :period_start, presence: true
  validates :period_end, presence: true
  validates :status, inclusion: { in: %w[draft published archived] }
  validate :end_date_after_start_date

  # Scopes
  scope :published, -> { where(status: 'published') }
  scope :recent, -> { order(created_at: :desc) }
  scope :for_period, ->(start_date, end_date) { 
    where('period_start >= ? AND period_end <= ?', start_date, end_date) 
  }

  # Callbacks
  before_save :calculate_totals, if: :should_recalculate?
  after_create :generate_insights

  def generate!
    transaction do
      calculate_financials
      generate_ai_insights
      self.status = 'published'
      save!
    end
  end

  def revenue_by_type
    @revenue_by_type ||= revenues.group(:revenue_type).sum(:amount)
  end

  def expense_by_category
    @expense_by_category ||= expenses.group(:category).sum(:amount)
  end

  def profit_margin
    return 0 if total_revenue.zero?
    (net_income / total_revenue * 100).round(2)
  end

  def expense_ratio
    return 0 if total_revenue.zero?
    (total_expense / total_revenue * 100).round(2)
  end

  def key_metrics
    {
      profit_margin: profit_margin,
      expense_ratio: expense_ratio,
      average_daily_revenue: average_daily_revenue,
      average_daily_expense: average_daily_expense,
      top_expense_category: top_expense_category,
      revenue_growth_rate: revenue_growth_rate
    }
  end

  private

  def revenues
    scope = organization.revenues.for_period(period_start, period_end)
    scope = scope.where(team_id: team_id) if team_id.present?
    scope
  end

  def expenses
    scope = organization.expenses.for_period(period_start, period_end)
    scope = scope.where(team_id: team_id) if team_id.present?
    scope
  end

  def calculate_financials
    self.total_revenue = revenues.sum(:amount)
    self.total_expense = expenses.sum(:amount)
    self.net_income = total_revenue - total_expense
    
    self.report_data = {
      revenue_breakdown: revenue_by_type,
      expense_breakdown: expense_by_category,
      daily_cashflow: calculate_daily_cashflow,
      budget_performance: calculate_budget_performance,
      key_metrics: key_metrics
    }
  end

  def calculate_daily_cashflow
    days = (period_start..period_end).to_a
    days.map do |date|
      {
        date: date,
        revenue: revenues.where(revenue_date: date).sum(:amount),
        expense: expenses.where(expense_date: date).sum(:amount)
      }
    end
  end

  def calculate_budget_performance
    budgets = organization.budgets.for_current_period
    budgets = budgets.where(team_id: team_id) if team_id.present?
    
    budgets.map do |budget|
      {
        budget_name: budget.name,
        allocated: budget.amount,
        spent: budget.spent_amount,
        remaining: budget.remaining_amount,
        utilization_rate: budget.utilization_rate
      }
    end
  end

  def generate_ai_insights
    AiFinancialInsightGeneratorJob.perform_later(self)
  end

  def average_daily_revenue
    days = (period_end - period_start + 1).to_i
    return 0 if days.zero?
    (total_revenue / days).round(2)
  end

  def average_daily_expense
    days = (period_end - period_start + 1).to_i
    return 0 if days.zero?
    (total_expense / days).round(2)
  end

  def top_expense_category
    expense_by_category.max_by { |_, amount| amount }&.first
  end

  def revenue_growth_rate
    previous_report = organization.financial_reports
      .where('period_end < ?', period_start)
      .order(period_end: :desc)
      .first
    
    return 0 unless previous_report && previous_report.total_revenue > 0
    
    ((total_revenue - previous_report.total_revenue) / previous_report.total_revenue * 100).round(2)
  end

  def should_recalculate?
    new_record? || will_save_change_to_period_start? || will_save_change_to_period_end?
  end

  def calculate_totals
    calculate_financials
  end

  def generate_insights
    FinancialInsightGeneratorJob.perform_later(self)
  end

  def end_date_after_start_date
    return unless period_start && period_end
    errors.add(:period_end, 'は開始日より後の日付を選択してください') if period_end <= period_start
  end
end