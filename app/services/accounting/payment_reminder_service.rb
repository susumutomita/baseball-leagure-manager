# frozen_string_literal: true

module Accounting
  class PaymentReminderService
    def initialize(organization:)
      @organization = organization
    end

    def send_payment_reminders
      reminders_sent = {
        upcoming: send_upcoming_payment_reminders,
        overdue: send_overdue_payment_reminders,
        final_notices: send_final_notices
      }

      log_reminder_activity(reminders_sent)
      reminders_sent
    end

    def send_upcoming_payment_reminders
      upcoming_invoices = find_upcoming_invoices
      reminders = []

      upcoming_invoices.each do |invoice|
        if should_send_upcoming_reminder?(invoice)
          send_upcoming_reminder(invoice)
          reminders << {
            invoice_id: invoice.id,
            team: invoice.team&.name,
            due_date: invoice.due_date,
            amount: invoice.total_amount
          }
        end
      end

      reminders
    end

    def send_overdue_payment_reminders
      overdue_invoices = find_overdue_invoices
      reminders = []

      overdue_invoices.each do |invoice|
        reminder_level = determine_reminder_level(invoice)
        
        if should_send_overdue_reminder?(invoice, reminder_level)
          send_overdue_reminder(invoice, reminder_level)
          reminders << {
            invoice_id: invoice.id,
            team: invoice.team&.name,
            days_overdue: days_overdue(invoice),
            amount: invoice.total_amount,
            reminder_level: reminder_level
          }
        end
      end

      reminders
    end

    def send_final_notices
      severely_overdue_invoices = find_severely_overdue_invoices
      notices = []

      severely_overdue_invoices.each do |invoice|
        if should_send_final_notice?(invoice)
          send_final_notice(invoice)
          notices << {
            invoice_id: invoice.id,
            team: invoice.team&.name,
            days_overdue: days_overdue(invoice),
            amount: invoice.total_amount,
            action: 'final_notice'
          }
        end
      end

      notices
    end

    def check_payment_status(invoice)
      # Check if payment has been received
      matching_revenue = find_matching_revenue(invoice)
      
      if matching_revenue
        mark_invoice_as_paid(invoice, matching_revenue)
        true
      else
        false
      end
    end

    private

    def find_upcoming_invoices
      @organization.invoices
        .where(status: ['sent', 'viewed'])
        .where('due_date BETWEEN ? AND ?', Date.current, 7.days.from_now)
        .includes(:team, :invoice_items)
    end

    def find_overdue_invoices
      @organization.invoices
        .where(status: ['sent', 'viewed', 'overdue'])
        .where('due_date < ?', Date.current)
        .includes(:team, :invoice_items)
    end

    def find_severely_overdue_invoices
      @organization.invoices
        .where(status: ['overdue'])
        .where('due_date < ?', 60.days.ago)
        .includes(:team, :invoice_items)
    end

    def should_send_upcoming_reminder?(invoice)
      # Send reminder 7 days and 3 days before due date
      days_until_due = (invoice.due_date - Date.current).to_i
      
      return false if invoice.metadata&.dig('reminders', 'upcoming_sent')&.include?(days_until_due.to_s)
      
      [7, 3].include?(days_until_due)
    end

    def should_send_overdue_reminder?(invoice, reminder_level)
      last_reminder_date = invoice.metadata&.dig('reminders', "level_#{reminder_level}_sent_at")
      
      return true if last_reminder_date.nil?
      
      # Send reminders at increasing intervals
      days_since_last = (Date.current - Date.parse(last_reminder_date)).to_i
      
      case reminder_level
      when 1 then days_since_last >= 7
      when 2 then days_since_last >= 14
      when 3 then days_since_last >= 30
      else false
      end
    end

    def should_send_final_notice?(invoice)
      last_final_notice = invoice.metadata&.dig('reminders', 'final_notice_sent_at')
      
      return true if last_final_notice.nil?
      
      # Only send one final notice per month
      (Date.current - Date.parse(last_final_notice)).to_i >= 30
    end

    def determine_reminder_level(invoice)
      days = days_overdue(invoice)
      
      case days
      when 1..14 then 1
      when 15..30 then 2
      when 31..60 then 3
      else 4
      end
    end

    def days_overdue(invoice)
      (Date.current - invoice.due_date).to_i
    end

    def send_upcoming_reminder(invoice)
      # Send email
      if invoice.team&.primary_contact_email
        OrganizationMailer.payment_reminder_upcoming(invoice).deliver_later
      end

      # Update invoice metadata
      update_reminder_metadata(invoice, 'upcoming', (invoice.due_date - Date.current).to_i)

      # Create notification
      create_reminder_notification(invoice, 'upcoming')
    end

    def send_overdue_reminder(invoice, level)
      # Update invoice status
      invoice.update!(status: 'overdue') if invoice.status != 'overdue'

      # Send email with appropriate urgency
      if invoice.team&.primary_contact_email
        case level
        when 1
          OrganizationMailer.payment_reminder_gentle(invoice).deliver_later
        when 2
          OrganizationMailer.payment_reminder_firm(invoice).deliver_later
        when 3
          OrganizationMailer.payment_reminder_urgent(invoice).deliver_later
        end
      end

      # Update metadata
      update_reminder_metadata(invoice, "level_#{level}", Date.current)

      # Create notification
      create_reminder_notification(invoice, "overdue_level_#{level}")

      # Calculate late fees if applicable
      apply_late_fees(invoice) if level >= 2
    end

    def send_final_notice(invoice)
      # Send final notice email
      if invoice.team&.primary_contact_email
        OrganizationMailer.payment_final_notice(invoice).deliver_later
      end

      # Update metadata
      update_reminder_metadata(invoice, 'final_notice', Date.current)

      # Create high-priority notification
      create_reminder_notification(invoice, 'final_notice', priority: 'high')

      # Potentially suspend team
      consider_team_suspension(invoice.team) if invoice.team
    end

    def update_reminder_metadata(invoice, reminder_type, value)
      metadata = invoice.metadata || {}
      metadata['reminders'] ||= {}
      
      if reminder_type == 'upcoming'
        metadata['reminders']['upcoming_sent'] ||= []
        metadata['reminders']['upcoming_sent'] << value.to_s
      else
        metadata['reminders']["#{reminder_type}_sent_at"] = value.to_s
      end

      invoice.update!(metadata: metadata)
    end

    def create_reminder_notification(invoice, type, priority: 'normal')
      message = case type
                when 'upcoming'
                  "請求書 #{invoice.invoice_number} の支払期限が近づいています"
                when /overdue_level_(\d+)/
                  level = $1.to_i
                  "請求書 #{invoice.invoice_number} の支払期限を#{days_overdue(invoice)}日超過しています"
                when 'final_notice'
                  "【最終通知】請求書 #{invoice.invoice_number} の支払いが大幅に遅延しています"
                else
                  "請求書 #{invoice.invoice_number} に関するお知らせ"
                end

      Rails.logger.info "Payment reminder: #{type} for invoice #{invoice.id} - #{message}"
      
      # If you have a notification system:
      # Notification.create!(
      #   recipient: invoice.team.primary_contact,
      #   title: "支払いリマインダー",
      #   message: message,
      #   priority: priority,
      #   notifiable: invoice
      # )
    end

    def apply_late_fees(invoice)
      # Check if late fees already applied
      return if invoice.invoice_items.where(category: 'late_fee').exists?

      # Calculate late fee (2% per month, prorated)
      days_late = days_overdue(invoice)
      monthly_rate = 0.02
      daily_rate = monthly_rate / 30.0
      late_fee_amount = (invoice.subtotal * daily_rate * days_late).round

      # Add late fee item
      invoice.invoice_items.create!(
        description: "遅延損害金（#{days_late}日分）",
        quantity: 1,
        unit_price: late_fee_amount,
        amount: late_fee_amount,
        category: 'late_fee'
      )

      # Update invoice totals
      invoice.update!(
        total_amount: invoice.total_amount + late_fee_amount,
        metadata: invoice.metadata.merge('late_fee_applied' => Date.current.to_s)
      )
    end

    def find_matching_revenue(invoice)
      # Look for revenues that might match this invoice
      potential_matches = @organization.revenues
        .where(payment_status: 'received')
        .where('revenue_date >= ?', invoice.invoice_date)
        .where('amount >= ?', invoice.total_amount * 0.95) # Allow 5% variance
        .where('amount <= ?', invoice.total_amount * 1.05)

      # Try to match by team
      if invoice.team
        team_matches = potential_matches.where(team: invoice.team)
        return team_matches.first if team_matches.any?
      end

      # Try to match by amount and timing
      potential_matches.find do |revenue|
        # Check if revenue is within reasonable time of invoice
        (revenue.revenue_date - invoice.due_date).abs <= 30 &&
          revenue.invoice_id.nil? # Not already linked to another invoice
      end
    end

    def mark_invoice_as_paid(invoice, revenue)
      ActiveRecord::Base.transaction do
        # Link revenue to invoice
        revenue.update!(invoice_id: invoice.id)

        # Update invoice status
        invoice.update!(
          status: 'paid',
          paid_at: revenue.revenue_date,
          payment_method: revenue.payment_method,
          metadata: invoice.metadata.merge(
            'paid_via_revenue_id' => revenue.id,
            'payment_matched_at' => Time.current.to_s
          )
        )

        # Send payment confirmation
        if invoice.team&.primary_contact_email
          OrganizationMailer.payment_confirmed(invoice).deliver_later
        end
      end
    end

    def consider_team_suspension(team)
      # Check total outstanding amount
      total_overdue = @organization.invoices
        .where(team: team)
        .where(status: 'overdue')
        .where('due_date < ?', 60.days.ago)
        .sum(:total_amount)

      if total_overdue > 100000 # More than 100,000 yen overdue
        # Flag team for suspension
        team.update!(
          status: 'suspended',
          suspension_reason: 'payment_overdue',
          suspended_at: Time.current
        ) if team.respond_to?(:status=)

        # Notify team and organization
        Rails.logger.warn "Team #{team.name} suspended due to payment overdue of #{total_overdue} yen"
      end
    end

    def log_reminder_activity(reminders_sent)
      total_sent = reminders_sent.values.flatten.size
      
      Rails.logger.info <<~LOG
        Payment reminder summary for #{@organization.name}:
        - Upcoming reminders: #{reminders_sent[:upcoming].size}
        - Overdue reminders: #{reminders_sent[:overdue].size}
        - Final notices: #{reminders_sent[:final_notices].size}
        - Total reminders sent: #{total_sent}
      LOG

      # Could also store in database for reporting
      # ReminderActivity.create!(
      #   organization: @organization,
      #   activity_date: Date.current,
      #   upcoming_sent: reminders_sent[:upcoming].size,
      #   overdue_sent: reminders_sent[:overdue].size,
      #   final_notices_sent: reminders_sent[:final_notices].size
      # )
    end
  end
end