# frozen_string_literal: true

class BudgetOverageNotificationJob < ApplicationJob
  queue_as :high

  def perform(budget, expense)
    # Send urgent notification about budget overage
    organization = budget.organization
    
    # Email all admins
    organization.users.admin.each do |admin|
      OrganizationMailer.budget_overage(admin, budget, expense).deliver_now
    end
    
    # Create high-priority notification
    create_urgent_notification(budget, expense)
    
    # Potentially restrict further spending
    consider_spending_restrictions(budget)
  end

  private

  def create_urgent_notification(budget, expense)
    overage_amount = budget.spent_amount - budget.amount
    
    message = "【緊急】予算「#{budget.name}」が#{overage_amount}円超過しました！" \
              "承認が必要な支出があります。"
    
    Rails.logger.error message
    
    # High priority notification
    # Notification.create!(
    #   organization: budget.organization,
    #   title: '予算超過警告',
    #   message: message,
    #   severity: 'critical',
    #   priority: 'high',
    #   notifiable: budget
    # )
  end

  def consider_spending_restrictions(budget)
    # If significantly over budget, flag for spending restrictions
    if budget.utilization_rate > 120
      budget.update!(
        status: 'restricted',
        metadata: budget.metadata.merge(
          'restriction_reason' => 'budget_exceeded',
          'restricted_at' => Time.current
        )
      )
    end
  end
end