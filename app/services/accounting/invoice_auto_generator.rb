# frozen_string_literal: true

module Accounting
  class InvoiceAutoGenerator
    def initialize(organization:)
      @organization = organization
    end

    def generate_monthly_invoices(month: Date.current.beginning_of_month)
      invoices = []
      
      ActiveRecord::Base.transaction do
        # Generate team membership invoices
        @organization.teams.active.each do |team|
          invoice = generate_team_invoice(team, month)
          invoices << invoice if invoice
        end

        # Generate sponsor invoices
        generate_sponsor_invoices(month).each do |invoice|
          invoices << invoice
        end
      end

      # Send invoice notifications
      invoices.each { |invoice| send_invoice_notification(invoice) }

      invoices
    end

    def generate_for_revenue(revenue)
      return if revenue.invoice_id.present?
      
      invoice = create_invoice_for_revenue(revenue)
      revenue.update!(invoice_id: invoice.id)
      
      send_invoice_notification(invoice)
      invoice
    end

    def generate_match_invoices(match)
      invoices = []
      
      # Generate invoices for participating teams
      [match.home_team, match.away_team].each do |team|
        if allocation = calculate_match_cost_allocation(match, team)
          invoice = create_match_invoice(team, match, allocation)
          invoices << invoice
        end
      end

      invoices
    end

    def generate_custom_invoice(team:, items:, due_date: 30.days.from_now)
      invoice = @organization.invoices.create!(
        invoice_number: generate_invoice_number('CUSTOM'),
        invoice_date: Date.current,
        due_date: due_date,
        status: 'draft',
        team: team,
        total_amount: items.sum { |item| item[:amount] },
        metadata: {
          type: 'custom',
          created_by: 'manual'
        }
      )

      # Create invoice items
      items.each do |item|
        invoice.invoice_items.create!(
          description: item[:description],
          quantity: item[:quantity] || 1,
          unit_price: item[:unit_price] || item[:amount],
          amount: item[:amount],
          category: item[:category] || 'other'
        )
      end

      finalize_invoice(invoice)
      invoice
    end

    private

    def generate_team_invoice(team, month)
      # Check if invoice already exists
      existing = @organization.invoices
        .joins(:invoice_items)
        .where(team: team)
        .where('invoice_items.category = ?', 'membership_fee')
        .where('invoice_date >= ? AND invoice_date <= ?', month.beginning_of_month, month.end_of_month)
        .first

      return nil if existing

      # Calculate fees
      membership_fee = calculate_membership_fee(team)
      return nil if membership_fee.zero?

      # Create invoice
      invoice = @organization.invoices.create!(
        invoice_number: generate_invoice_number('MEM'),
        invoice_date: month.beginning_of_month,
        due_date: month.beginning_of_month + 10.days,
        status: 'draft',
        team: team,
        total_amount: membership_fee,
        metadata: {
          type: 'monthly_membership',
          month: month.strftime('%Y-%m')
        }
      )

      # Create invoice items
      invoice.invoice_items.create!(
        description: "#{month.strftime('%Y年%m月')} 会費",
        quantity: 1,
        unit_price: membership_fee,
        amount: membership_fee,
        category: 'membership_fee'
      )

      # Add any additional fees
      add_additional_fees(invoice, team, month)

      finalize_invoice(invoice)
      invoice
    end

    def generate_sponsor_invoices(month)
      invoices = []
      
      # Find active sponsorships
      active_sponsorships = find_active_sponsorships(month)
      
      active_sponsorships.each do |sponsorship|
        invoice = create_sponsor_invoice(sponsorship, month)
        invoices << invoice if invoice
      end

      invoices
    end

    def create_invoice_for_revenue(revenue)
      invoice = @organization.invoices.create!(
        invoice_number: revenue.invoice_number || generate_invoice_number('REV'),
        invoice_date: revenue.revenue_date,
        due_date: revenue.revenue_date + 30.days,
        status: 'draft',
        team: revenue.team,
        total_amount: revenue.amount,
        metadata: {
          type: 'revenue_based',
          revenue_id: revenue.id,
          revenue_type: revenue.revenue_type
        }
      )

      # Create invoice item
      invoice.invoice_items.create!(
        description: revenue.name,
        quantity: 1,
        unit_price: revenue.amount,
        amount: revenue.amount,
        category: revenue.revenue_type
      )

      finalize_invoice(invoice)
      invoice
    end

    def create_match_invoice(team, match, allocation)
      invoice = @organization.invoices.create!(
        invoice_number: generate_invoice_number('MATCH'),
        invoice_date: match.match_date,
        due_date: match.match_date + 14.days,
        status: 'draft',
        team: team,
        total_amount: allocation[:total],
        metadata: {
          type: 'match_costs',
          match_id: match.id,
          allocation_method: allocation[:method]
        }
      )

      # Create invoice items for each cost component
      allocation[:breakdown].each do |item|
        invoice.invoice_items.create!(
          description: item[:description],
          quantity: 1,
          unit_price: item[:amount],
          amount: item[:amount],
          category: item[:category]
        )
      end

      finalize_invoice(invoice)
      invoice
    end

    def generate_invoice_number(prefix)
      timestamp = Time.current.strftime('%Y%m%d%H%M%S')
      random = SecureRandom.hex(3).upcase
      "#{prefix}-#{timestamp}-#{random}"
    end

    def calculate_membership_fee(team)
      # Base fee calculation
      base_fee = @organization.organization_subscription&.plan&.base_team_fee || 5000
      
      # Adjust based on team size
      player_count = team.players.active.count
      size_multiplier = case player_count
                       when 0..10 then 0.8
                       when 11..15 then 1.0
                       when 16..20 then 1.2
                       else 1.5
                       end
      
      (base_fee * size_multiplier).round
    end

    def add_additional_fees(invoice, team, month)
      # Add insurance fee if applicable
      if insurance_fee = calculate_insurance_fee(team, month)
        invoice.invoice_items.create!(
          description: "保険料（#{team.players.active.count}名分）",
          quantity: team.players.active.count,
          unit_price: insurance_fee / team.players.active.count,
          amount: insurance_fee,
          category: 'insurance'
        )
        invoice.total_amount += insurance_fee
      end

      # Add any pending fees from previous months
      add_pending_fees(invoice, team)
    end

    def calculate_insurance_fee(team, month)
      # Check if insurance fee is due this month
      return nil unless month.month % 3 == 1 # Quarterly insurance

      per_player_fee = 500 # 500 yen per player per quarter
      team.players.active.count * per_player_fee
    end

    def add_pending_fees(invoice, team)
      # Find unpaid amounts from previous invoices
      pending_invoices = @organization.invoices
        .where(team: team)
        .where(status: ['sent', 'overdue'])
        .where('due_date < ?', Date.current)

      return if pending_invoices.empty?

      late_fee = pending_invoices.sum(:total_amount) * 0.02 # 2% late fee
      
      if late_fee > 0
        invoice.invoice_items.create!(
          description: "遅延損害金（#{pending_invoices.count}件分）",
          quantity: 1,
          unit_price: late_fee,
          amount: late_fee,
          category: 'late_fee'
        )
        invoice.total_amount += late_fee
      end
    end

    def find_active_sponsorships(month)
      # This is a placeholder - in a real implementation, you would have a Sponsorship model
      # For now, we'll look for recurring sponsor revenues
      @organization.revenues
        .where(revenue_type: 'sponsor')
        .where('revenue_date >= ?', 3.months.ago)
        .group_by { |r| r.metadata&.dig('sponsor_name') || 'Unknown Sponsor' }
        .map do |sponsor_name, revenues|
          {
            name: sponsor_name,
            monthly_amount: revenues.sum(&:amount) / 3,
            last_invoice_date: revenues.max_by(&:revenue_date).revenue_date
          }
        end
        .select { |s| s[:last_invoice_date] < month }
    end

    def create_sponsor_invoice(sponsorship, month)
      invoice = @organization.invoices.create!(
        invoice_number: generate_invoice_number('SPON'),
        invoice_date: month.beginning_of_month,
        due_date: month.end_of_month,
        status: 'draft',
        total_amount: sponsorship[:monthly_amount],
        metadata: {
          type: 'sponsorship',
          sponsor_name: sponsorship[:name],
          month: month.strftime('%Y-%m')
        }
      )

      invoice.invoice_items.create!(
        description: "#{month.strftime('%Y年%m月')} スポンサー料 - #{sponsorship[:name]}",
        quantity: 1,
        unit_price: sponsorship[:monthly_amount],
        amount: sponsorship[:monthly_amount],
        category: 'sponsor'
      )

      finalize_invoice(invoice)
      invoice
    end

    def calculate_match_cost_allocation(match, team)
      # Use the cost allocation engine
      allocation_engine = Ai::CostAllocationEngine.new(organization: @organization)
      allocation_result = allocation_engine.allocate_match_costs(match: match)
      
      team_allocation = allocation_result[:allocations][team.id]
      return nil unless team_allocation

      # Build breakdown
      {
        total: team_allocation[:amount],
        method: allocation_result[:rationale],
        breakdown: build_cost_breakdown(match, team_allocation[:amount])
      }
    end

    def build_cost_breakdown(match, total_amount)
      # Estimate cost components
      venue_percentage = 0.5
      referee_percentage = 0.3
      admin_percentage = 0.2

      [
        {
          description: "会場使用料",
          amount: (total_amount * venue_percentage).round,
          category: 'venue_rental'
        },
        {
          description: "審判費用",
          amount: (total_amount * referee_percentage).round,
          category: 'referee_fees'
        },
        {
          description: "運営管理費",
          amount: (total_amount * admin_percentage).round,
          category: 'administrative'
        }
      ]
    end

    def finalize_invoice(invoice)
      # Calculate totals
      invoice.update!(
        subtotal: invoice.invoice_items.sum(:amount),
        tax_amount: calculate_tax(invoice),
        total_amount: invoice.invoice_items.sum(:amount) + calculate_tax(invoice),
        status: 'sent'
      )

      # Generate PDF (placeholder)
      # invoice.generate_pdf!

      invoice
    end

    def calculate_tax(invoice)
      # Japanese consumption tax (10%)
      taxable_amount = invoice.invoice_items
        .where.not(category: ['insurance']) # Some items may be tax-exempt
        .sum(:amount)
      
      (taxable_amount * 0.1).round
    end

    def send_invoice_notification(invoice)
      # Send email notification
      if invoice.team&.primary_contact_email
        OrganizationMailer.invoice_created(invoice).deliver_later
      end

      # Create in-app notification
      create_invoice_notification(invoice)
    end

    def create_invoice_notification(invoice)
      # This would create a notification in your notification system
      Rails.logger.info "Invoice notification created for #{invoice.invoice_number}"
      
      # If you have a notification system:
      # Notification.create!(
      #   recipient: invoice.team.primary_contact,
      #   title: "新しい請求書が発行されました",
      #   message: "請求書番号: #{invoice.invoice_number}",
      #   notifiable: invoice
      # )
    end
  end
end