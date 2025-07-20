# frozen_string_literal: true

module Billing
  class InvoiceGenerator
    attr_reader :organization, :period_start, :period_end

    def initialize(organization, period_start: nil, period_end: nil)
      @organization = organization
      @period_start = period_start || Time.current.beginning_of_month
      @period_end = period_end || Time.current.end_of_month
    end

    def generate_monthly_invoice
      subscription = organization.organization_subscription
      return nil unless subscription&.active?

      ActiveRecord::Base.transaction do
        invoice = create_invoice
        add_subscription_line_item(invoice, subscription)
        add_overage_line_items(invoice, subscription)
        calculate_totals(invoice)
        invoice
      end
    end

    def generate_custom_invoice(line_items:, due_date: nil)
      ActiveRecord::Base.transaction do
        invoice = organization.invoices.create!(
          organization_subscription: organization.organization_subscription,
          status: :open,
          invoice_date: Date.current,
          due_date: due_date || 30.days.from_now,
          currency: 'jpy',
          total_cents: 0,
          subtotal_cents: 0,
          tax_cents: 0
        )

        line_items.each do |item|
          invoice.invoice_items.create!(
            description: item[:description],
            quantity: item[:quantity] || 1,
            unit_price_cents: item[:unit_price_cents],
            total_cents: (item[:quantity] || 1) * item[:unit_price_cents]
          )
        end

        calculate_totals(invoice)
        invoice
      end
    end

    def preview_next_invoice
      subscription = organization.organization_subscription
      return nil unless subscription&.active?

      # Build invoice data without saving
      invoice_data = {
        subscription_fee: subscription.subscription_plan.price_cents,
        overage_charges: subscription.calculate_overage_charges,
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end
      }

      # Calculate totals
      overage_total = invoice_data[:overage_charges].values.sum { |c| c[:total_cents] }
      subtotal = invoice_data[:subscription_fee] + overage_total
      tax = calculate_tax(subtotal)

      invoice_data.merge(
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: subtotal + tax,
        currency: 'jpy'
      )
    end

    def regenerate_invoice_pdf(invoice)
      # Generate PDF for existing invoice
      pdf_service = InvoicePdfGenerator.new(invoice)
      pdf_path = pdf_service.generate

      # Upload to storage if configured
      if Rails.application.config.active_storage.service
        invoice.pdf.attach(
          io: File.open(pdf_path),
          filename: "invoice_#{invoice.invoice_number}.pdf",
          content_type: 'application/pdf'
        )
      end

      pdf_path
    end

    def send_invoice_reminders
      # Find invoices that need reminders
      invoices_needing_reminder.each do |invoice|
        send_reminder(invoice)
      end
    end

    private

    def create_invoice
      organization.invoices.create!(
        organization_subscription: organization.organization_subscription,
        status: :open,
        invoice_date: Date.current,
        due_date: 30.days.from_now,
        currency: 'jpy',
        total_cents: 0,
        subtotal_cents: 0,
        tax_cents: 0,
        metadata: {
          period_start: period_start.iso8601,
          period_end: period_end.iso8601
        }
      )
    end

    def add_subscription_line_item(invoice, subscription)
      plan = subscription.subscription_plan
      
      invoice.invoice_items.create!(
        description: "#{plan.name}プラン - #{format_period}",
        quantity: 1,
        unit_price_cents: plan.price_cents,
        total_cents: plan.price_cents,
        period_start: period_start,
        period_end: period_end,
        metadata: {
          type: 'subscription',
          plan_id: plan.id,
          plan_name: plan.name
        }
      )
    end

    def add_overage_line_items(invoice, subscription)
      overage_charges = subscription.calculate_overage_charges

      overage_charges.each do |resource, charge|
        next if charge[:total_cents].zero?

        invoice.invoice_items.create!(
          description: overage_description(resource, charge),
          quantity: charge[:quantity],
          unit_price_cents: charge[:unit_price_cents],
          total_cents: charge[:total_cents],
          period_start: period_start,
          period_end: period_end,
          metadata: {
            type: 'overage',
            resource: resource,
            limit: subscription.subscription_plan.limit_for(resource)
          }
        )
      end
    end

    def calculate_totals(invoice)
      subtotal = invoice.invoice_items.sum(:total_cents)
      tax = calculate_tax(subtotal)
      total = subtotal + tax

      invoice.update!(
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total
      )
    end

    def calculate_tax(subtotal_cents)
      # Japanese consumption tax (10%)
      tax_rate = 0.10
      (subtotal_cents * tax_rate).round
    end

    def format_period
      if period_start.month == period_end.month
        period_start.strftime('%Y年%m月')
      else
        "#{period_start.strftime('%Y年%m月%d日')} - #{period_end.strftime('%Y年%m月%d日')}"
      end
    end

    def overage_description(resource, charge)
      resource_names = {
        'teams' => 'チーム数',
        'matches_per_month' => '月間試合数',
        'players_per_team' => 'チーム当たりの選手数',
        'storage_gb' => 'ストレージ使用量(GB)',
        'api_calls_per_day' => 'API呼び出し数'
      }

      unit_names = {
        'teams' => 'チーム',
        'matches_per_month' => '試合',
        'players_per_team' => '選手',
        'storage_gb' => 'GB',
        'api_calls_per_day' => '1000回'
      }

      "#{resource_names[resource]}超過分 (#{charge[:quantity]} #{unit_names[resource]})"
    end

    def invoices_needing_reminder
      organization.invoices.unpaid.where(
        'due_date IN (?, ?, ?)',
        7.days.from_now.to_date,
        3.days.from_now.to_date,
        Date.tomorrow
      )
    end

    def send_reminder(invoice)
      # Check if reminder was already sent today
      last_reminder = invoice.metadata['last_reminder_sent_at']
      return if last_reminder && Time.parse(last_reminder) > 1.day.ago

      # Send reminder email
      OrganizationMailer.invoice_reminder(invoice).deliver_later

      # Update metadata
      invoice.update!(
        metadata: invoice.metadata.merge(
          last_reminder_sent_at: Time.current.iso8601,
          reminder_count: (invoice.metadata['reminder_count'] || 0) + 1
        )
      )
    end
  end

  class InvoicePdfGenerator
    attr_reader :invoice

    def initialize(invoice)
      @invoice = invoice
    end

    def generate
      # This is a placeholder for PDF generation
      # In a real implementation, you would use a gem like Prawn or WickedPDF
      # For now, we'll create a simple text representation
      
      filename = "invoice_#{invoice.invoice_number}.pdf"
      filepath = Rails.root.join('tmp', filename)

      File.open(filepath, 'w') do |file|
        file.puts generate_content
      end

      filepath
    end

    private

    def generate_content
      <<~CONTENT
        請求書
        
        請求書番号: #{invoice.invoice_number}
        発行日: #{invoice.invoice_date}
        支払期限: #{invoice.due_date}
        
        #{invoice.organization.name} 様
        
        明細:
        #{invoice_items_text}
        
        小計: ¥#{invoice.subtotal_in_yen.to_i}
        消費税: ¥#{invoice.tax_in_yen.to_i}
        合計: ¥#{invoice.total_in_yen.to_i}
        
        お支払い方法: クレジットカード
      CONTENT
    end

    def invoice_items_text
      invoice.invoice_items.map do |item|
        "- #{item.description}: ¥#{item.unit_price_in_yen.to_i} × #{item.quantity} = ¥#{item.total_in_yen.to_i}"
      end.join("\n")
    end
  end
end