# frozen_string_literal: true

# == Schema Information
#
# Table name: budget_forecasts
#
#  id                    :bigint           not null, primary key
#  forecast_date         :date             not null
#  forecast_period_start :date             not null
#  forecast_period_end   :date             not null
#  predicted_revenue     :decimal(10, 2)   not null
#  predicted_expense     :decimal(10, 2)   not null
#  confidence_score      :float            default(0)
#  forecast_method       :string
#  assumptions           :jsonb
#  risk_factors          :jsonb
#  recommendations       :jsonb
#  organization_id       :bigint           not null
#  budget_id             :bigint
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#

class BudgetForecast < ApplicationRecord
  include TenantScoped

  # Associations
  belongs_to :organization
  belongs_to :budget, optional: true

  # Validations
  validates :forecast_date, presence: true
  validates :forecast_period_start, presence: true
  validates :forecast_period_end, presence: true
  validates :predicted_revenue, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :predicted_expense, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :confidence_score, numericality: { in: 0..100 }
  validates :forecast_method, inclusion: { in: %w[
    linear_regression time_series ai_prediction seasonal_adjustment hybrid
  ] }, allow_nil: true
  validate :forecast_period_validity

  # Scopes
  scope :recent, -> { order(forecast_date: :desc) }
  scope :high_confidence, -> { where('confidence_score >= ?', 80) }
  scope :for_future, -> { where('forecast_period_start > ?', Date.current) }

  # Callbacks
  after_create :notify_if_deficit_predicted

  def predicted_net_income
    predicted_revenue - predicted_expense
  end

  def is_deficit_predicted?
    predicted_net_income < 0
  end

  def forecast_accuracy
    return nil unless actual_data_available?
    
    actual_revenue = calculate_actual_revenue
    actual_expense = calculate_actual_expense
    
    revenue_accuracy = 100 - ((predicted_revenue - actual_revenue).abs / actual_revenue * 100)
    expense_accuracy = 100 - ((predicted_expense - actual_expense).abs / actual_expense * 100)
    
    (revenue_accuracy + expense_accuracy) / 2
  end

  def risk_level
    return 'low' if confidence_score >= 80 && !is_deficit_predicted?
    return 'high' if confidence_score < 50 || (is_deficit_predicted? && predicted_net_income < -10000)
    'medium'
  end

  def key_assumptions
    assumptions || default_assumptions
  end

  def main_risk_factors
    risk_factors || default_risk_factors
  end

  def top_recommendations
    recommendations&.dig('actions') || generate_recommendations
  end

  private

  def forecast_period_validity
    return unless forecast_period_start && forecast_period_end
    
    if forecast_period_end <= forecast_period_start
      errors.add(:forecast_period_end, '予測期間の終了日は開始日より後である必要があります')
    end
    
    if forecast_date > forecast_period_start
      errors.add(:forecast_date, '予測日は予測期間の開始日より前である必要があります')
    end
  end

  def actual_data_available?
    forecast_period_end < Date.current
  end

  def calculate_actual_revenue
    organization.revenues
      .for_period(forecast_period_start, forecast_period_end)
      .sum(:amount)
  end

  def calculate_actual_expense
    organization.expenses
      .for_period(forecast_period_start, forecast_period_end)
      .sum(:amount)
  end

  def default_assumptions
    {
      revenue_growth: 'Based on historical trends',
      expense_inflation: 'Assumed 3% annual increase',
      seasonal_factors: 'Peak season in summer months'
    }
  end

  def default_risk_factors
    {
      economic: 'Economic downturn risk',
      competition: 'New leagues entering market',
      weather: 'Bad weather affecting match days'
    }
  end

  def generate_recommendations
    recommendations = []
    
    if is_deficit_predicted?
      recommendations << {
        priority: 'high',
        action: '収入源の多様化を検討してください',
        impact: '月額10-20%の収入増加が期待できます'
      }
      recommendations << {
        priority: 'high',
        action: '不要な支出を削減してください',
        impact: '月額支出を5-10%削減可能です'
      }
    end
    
    if confidence_score < 70
      recommendations << {
        priority: 'medium',
        action: 'より多くのデータを収集して予測精度を向上させてください',
        impact: '予測精度が20%向上する可能性があります'
      }
    end
    
    recommendations
  end

  def notify_if_deficit_predicted
    return unless is_deficit_predicted? && predicted_net_income < -50000
    
    DeficitAlertJob.perform_later(self)
  end
end