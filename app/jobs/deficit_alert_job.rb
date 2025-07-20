# frozen_string_literal: true

class DeficitAlertJob < ApplicationJob
  queue_as :high

  def perform(budget_forecast)
    organization = budget_forecast.organization
    
    # Alert all financial managers and admins
    recipients = organization.users.where(role: ['admin', 'financial_manager'])
    
    recipients.each do |user|
      OrganizationMailer.deficit_forecast_alert(user, budget_forecast).deliver_later
    end
    
    # Create critical notification
    create_deficit_notification(budget_forecast)
    
    # Generate recovery recommendations
    generate_recovery_plan(budget_forecast)
  end

  private

  def create_deficit_notification(forecast)
    deficit_amount = forecast.predicted_net_income.abs
    
    message = "【警告】#{forecast.forecast_period_start}から#{forecast.forecast_period_end}の期間で" \
              "#{deficit_amount}円の赤字が予測されています。早急な対策が必要です。"
    
    Rails.logger.warn message
    
    # Create notification
    # Notification.create!(
    #   organization: forecast.organization,
    #   title: '赤字予測警告',
    #   message: message,
    #   severity: 'critical',
    #   priority: 'high',
    #   notifiable: forecast
    # )
  end

  def generate_recovery_plan(forecast)
    # Use AI to generate recovery recommendations
    optimizer = Ai::BudgetOptimizer.new(organization: forecast.organization)
    recommendations = optimizer.recommend_cost_savings
    
    # Store recommendations
    forecast.update!(
      recommendations: forecast.recommendations.merge(
        'recovery_plan' => recommendations,
        'generated_at' => Time.current
      )
    )
  end
end