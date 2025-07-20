# frozen_string_literal: true

class BudgetAlertJob < ApplicationJob
  queue_as :default

  def perform(budget, expense)
    # Send alert email to organization admins
    organization = budget.organization
    
    organization.users.admin.each do |admin|
      OrganizationMailer.budget_alert(admin, budget, expense).deliver_later
    end
    
    # Create in-app notification
    create_notification(budget, expense)
    
    # Log alert
    Rails.logger.warn "Budget alert: #{budget.name} at #{budget.utilization_rate}% utilization"
  end

  private

  def create_notification(budget, expense)
    message = "予算「#{budget.name}」の使用率が#{budget.utilization_rate}%に達しました。" \
              "最新の支出: #{expense.name} (#{expense.amount}円)"
    
    # This assumes you have a notification system
    # Notification.create!(
    #   organization: budget.organization,
    #   title: '予算警告',
    #   message: message,
    #   severity: 'warning',
    #   notifiable: budget
    # )
  end
end