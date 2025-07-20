# frozen_string_literal: true

class OrganizationMailer < ApplicationMailer
  def subscription_created(organization)
    @organization = organization
    @subscription = organization.organization_subscription
    @plan = @subscription.subscription_plan
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "サブスクリプション登録完了のお知らせ - #{@plan.name}プラン"
    )
  end

  def subscription_canceled(organization)
    @organization = organization
    @subscription = organization.organization_subscription
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "サブスクリプションキャンセルのお知らせ"
    )
  end

  def subscription_reactivated(organization)
    @organization = organization
    @subscription = organization.organization_subscription
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "サブスクリプション再開のお知らせ"
    )
  end

  def plan_changed(organization, old_plan, new_plan)
    @organization = organization
    @old_plan = old_plan
    @new_plan = new_plan
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "プラン変更完了のお知らせ"
    )
  end

  def trial_ending(organization)
    @organization = organization
    @subscription = organization.organization_subscription
    @days_remaining = @subscription.trial_days_remaining
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "無料トライアル終了のお知らせ（残り#{@days_remaining}日）"
    )
  end

  def payment_failed(organization)
    @organization = organization
    @subscription = organization.organization_subscription
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "【重要】お支払いに失敗しました"
    )
  end

  def subscription_suspended(organization)
    @organization = organization
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "【重要】サブスクリプションが一時停止されました"
    )
  end

  def invoice_created(invoice)
    @invoice = invoice
    @organization = invoice.organization
    
    mail(
      to: @organization.admin_users.pluck(:email),
      subject: "請求書発行のお知らせ - #{@invoice.invoice_number}"
    )
  end

  def payment_receipt(invoice)
    @invoice = invoice
    @organization = invoice.organization
    
    mail(
      to: @organization.admin_users.pluck(:email),
      subject: "お支払い完了のお知らせ - #{@invoice.invoice_number}"
    )
  end

  def invoice_reminder(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @days_until_due = (@invoice.due_date - Date.current).to_i
    
    mail(
      to: @organization.admin_users.pluck(:email),
      subject: "【リマインダー】お支払い期限のお知らせ - #{@invoice.invoice_number}"
    )
  end

  def usage_limit_alert(organization, alerts)
    @organization = organization
    @alerts = alerts
    
    mail(
      to: organization.admin_users.pluck(:email),
      subject: "【注意】使用量上限に近づいています"
    )
  end
  
  # Financial Management emails
  def budget_alert(user, budget, expense)
    @user = user
    @budget = budget
    @expense = expense
    @organization = budget.organization
    
    mail(
      to: user.email,
      subject: "[予算警告] #{budget.name}の使用率が#{budget.utilization_rate}%に達しました"
    )
  end
  
  def budget_overage(user, budget, expense)
    @user = user
    @budget = budget
    @expense = expense
    @organization = budget.organization
    @overage_amount = budget.spent_amount - budget.amount
    
    mail(
      to: user.email,
      subject: "[緊急] 予算超過: #{budget.name}が#{@overage_amount}円超過しました",
      importance: 'high'
    )
  end
  
  def payment_reminder_upcoming(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    @days_until_due = (invoice.due_date - Date.current).to_i
    
    mail(
      to: @team.primary_contact_email,
      subject: "支払期限のお知らせ - 請求書#{invoice.invoice_number} (残り#{@days_until_due}日)"
    )
  end
  
  def payment_reminder_gentle(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    @days_overdue = (Date.current - invoice.due_date).to_i
    
    mail(
      to: @team.primary_contact_email,
      subject: "支払期限超過のお知らせ - 請求書#{invoice.invoice_number}"
    )
  end
  
  def payment_reminder_firm(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    @days_overdue = (Date.current - invoice.due_date).to_i
    
    mail(
      to: @team.primary_contact_email,
      subject: "[重要] 支払期限超過 - 請求書#{invoice.invoice_number} (#{@days_overdue}日超過)"
    )
  end
  
  def payment_reminder_urgent(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    @days_overdue = (Date.current - invoice.due_date).to_i
    
    mail(
      to: @team.primary_contact_email,
      subject: "[緊急] 至急お支払いください - 請求書#{invoice.invoice_number}",
      importance: 'high'
    )
  end
  
  def payment_final_notice(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    @days_overdue = (Date.current - invoice.due_date).to_i
    
    mail(
      to: @team.primary_contact_email,
      subject: "[最終通知] サービス停止予告 - 請求書#{invoice.invoice_number}",
      importance: 'high'
    )
  end
  
  def payment_confirmed(invoice)
    @invoice = invoice
    @organization = invoice.organization
    @team = invoice.team
    
    mail(
      to: @team.primary_contact_email,
      subject: "お支払い確認のお知らせ - 請求書#{invoice.invoice_number}"
    )
  end
  
  def deficit_forecast_alert(user, budget_forecast)
    @user = user
    @forecast = budget_forecast
    @organization = budget_forecast.organization
    @deficit_amount = budget_forecast.predicted_net_income.abs
    
    mail(
      to: user.email,
      subject: "[財務警告] #{@deficit_amount}円の赤字が予測されています",
      importance: 'high'
    )
  end
  
  def share_financial_report(report, recipient_email, message = nil)
    @report = report
    @organization = report.organization
    @message = message
    
    mail(
      to: recipient_email,
      subject: "財務レポートの共有 - #{@organization.name}"
    )
  end
end