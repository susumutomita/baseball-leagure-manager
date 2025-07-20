# frozen_string_literal: true

module Accounting
  class AutoAccountant
    def initialize(organization:)
      @organization = organization
    end

    def process_transaction(transaction_data)
      ActiveRecord::Base.transaction do
        # Determine transaction type
        transaction_type = determine_transaction_type(transaction_data)
        
        case transaction_type
        when :revenue
          process_revenue(transaction_data)
        when :expense
          process_expense(transaction_data)
        else
          raise ArgumentError, "Unknown transaction type"
        end
      end
    rescue StandardError => e
      Rails.logger.error "Auto accounting failed: #{e.message}"
      raise
    end

    def reconcile_accounts(period_start:, period_end:)
      reconciliation_results = {
        period: { start: period_start, end: period_end },
        revenues: reconcile_revenues(period_start, period_end),
        expenses: reconcile_expenses(period_start, period_end),
        discrepancies: [],
        balanced: true
      }

      # Check for balance
      total_revenue = reconciliation_results[:revenues][:total]
      total_expense = reconciliation_results[:expenses][:total]
      net_position = total_revenue - total_expense

      reconciliation_results[:net_position] = net_position
      reconciliation_results[:balanced] = discrepancy_check(reconciliation_results)

      reconciliation_results
    end

    def generate_journal_entries(date: Date.current)
      entries = []

      # Process daily revenues
      daily_revenues = @organization.revenues.where(revenue_date: date)
      daily_revenues.each do |revenue|
        entries << create_revenue_journal_entry(revenue)
      end

      # Process daily expenses
      daily_expenses = @organization.expenses.where(expense_date: date)
      daily_expenses.each do |expense|
        entries << create_expense_journal_entry(expense)
      end

      # Process transfers and adjustments
      entries.concat(process_adjustments(date))

      entries
    end

    def categorize_transaction(description:, amount:, transaction_type:)
      # Use pattern matching to categorize
      category = case transaction_type
      when 'revenue'
        categorize_revenue(description, amount)
      when 'expense'
        categorize_expense(description, amount)
      else
        'other'
      end

      {
        category: category,
        confidence: calculate_confidence(description, category),
        suggested_tags: suggest_tags(description, category)
      }
    end

    private

    def determine_transaction_type(data)
      # Simple heuristic: positive amounts are revenues, negative are expenses
      # More sophisticated logic can be added based on description patterns
      if data[:amount] > 0
        :revenue
      else
        :expense
      end
    end

    def process_revenue(data)
      revenue = @organization.revenues.build(
        name: data[:description] || generate_revenue_name(data),
        amount: data[:amount],
        revenue_date: data[:date] || Date.current,
        revenue_type: determine_revenue_type(data),
        payment_status: data[:payment_status] || 'pending',
        payment_method: data[:payment_method],
        description: data[:description]
      )

      # Auto-assign to team if possible
      if data[:team_id]
        revenue.team_id = data[:team_id]
      elsif team = identify_team_from_description(data[:description])
        revenue.team_id = team.id
      end

      # Auto-assign to budget
      revenue.auto_assign_budget if revenue.respond_to?(:auto_assign_budget)

      revenue.save!
      
      # Create corresponding invoice if needed
      create_invoice_if_needed(revenue)

      revenue
    end

    def process_expense(data)
      expense = @organization.expenses.build(
        name: data[:description] || generate_expense_name(data),
        amount: data[:amount].abs, # Ensure positive amount
        expense_date: data[:date] || Date.current,
        category: determine_expense_category(data),
        payment_status: data[:payment_status] || 'pending',
        payment_method: data[:payment_method],
        description: data[:description]
      )

      # Auto-assign relationships
      auto_assign_expense_relationships(expense, data)

      # Auto-assign to budget
      expense.auto_assign_budget if expense.respond_to?(:auto_assign_budget)

      expense.save!
      expense
    end

    def determine_revenue_type(data)
      description = data[:description]&.downcase || ''
      
      case description
      when /登録|registration/i
        'registration_fee'
      when /会費|membership/i
        'membership_fee'
      when /スポンサー|sponsor/i
        'sponsor'
      when /チケット|ticket/i
        'ticket_sales'
      when /グッズ|merchandise/i
        'merchandise'
      when /寄付|donation/i
        'donation'
      when /補助金|subsidy|grant/i
        'subsidy'
      else
        'other'
      end
    end

    def determine_expense_category(data)
      description = data[:description]&.downcase || ''
      
      case description
      when /会場|venue|グラウンド|field/i
        'venue_rental'
      when /審判|referee|アンパイア|umpire/i
        'referee_fees'
      when /備品|equipment|用具|ボール|ball/i
        'equipment'
      when /保険|insurance/i
        'insurance'
      when /管理|admin|事務/i
        'administrative'
      when /広告|marketing|宣伝|promotion/i
        'marketing'
      when /賞|prize|トロフィー|trophy/i
        'prize_money'
      when /交通|transport|移動/i
        'transportation'
      else
        'miscellaneous'
      end
    end

    def generate_revenue_name(data)
      type = determine_revenue_type(data)
      date = data[:date] || Date.current
      
      case type
      when 'registration_fee'
        "#{date.strftime('%Y年%m月')} 登録料"
      when 'membership_fee'
        "#{date.strftime('%Y年%m月')} 会費"
      else
        "#{date.strftime('%Y年%m月%d日')} 収入"
      end
    end

    def generate_expense_name(data)
      category = determine_expense_category(data)
      date = data[:date] || Date.current
      
      case category
      when 'venue_rental'
        "#{date.strftime('%Y年%m月%d日')} 会場費"
      when 'referee_fees'
        "#{date.strftime('%Y年%m月%d日')} 審判費用"
      else
        "#{date.strftime('%Y年%m月%d日')} 支出"
      end
    end

    def identify_team_from_description(description)
      return nil unless description
      
      # Try to match team names
      @organization.teams.find do |team|
        description.include?(team.name)
      end
    end

    def auto_assign_expense_relationships(expense, data)
      # Try to identify and assign team
      if data[:team_id]
        expense.team_id = data[:team_id]
      elsif team = identify_team_from_description(data[:description])
        expense.team_id = team.id
      end

      # Try to identify and assign match
      if data[:match_id]
        expense.match_id = data[:match_id]
      elsif match = identify_match_from_context(expense, data)
        expense.match_id = match.id
      end

      # Try to identify and assign venue
      if data[:venue_id]
        expense.venue_id = data[:venue_id]
      elsif expense.category == 'venue_rental' && (venue = identify_venue_from_description(data[:description]))
        expense.venue_id = venue.id
      end
    end

    def identify_match_from_context(expense, data)
      return nil unless expense.expense_date && (expense.category == 'referee_fees' || expense.category == 'venue_rental')
      
      # Find matches on the same date
      matches = @organization.matches.where(match_date: expense.expense_date)
      
      # If only one match, assume it's related
      return matches.first if matches.count == 1
      
      # Try to match by team if available
      if expense.team_id
        matches.where('home_team_id = ? OR away_team_id = ?', expense.team_id, expense.team_id).first
      end
    end

    def identify_venue_from_description(description)
      return nil unless description
      
      @organization.venues.find do |venue|
        description.include?(venue.name)
      end
    end

    def create_invoice_if_needed(revenue)
      return if revenue.invoice_id.present?
      return unless %w[registration_fee membership_fee].include?(revenue.revenue_type)
      return unless revenue.team_id.present?

      InvoiceAutoGenerator.new(organization: @organization).generate_for_revenue(revenue)
    end

    def reconcile_revenues(period_start, period_end)
      revenues = @organization.revenues.where(revenue_date: period_start..period_end)
      
      {
        total: revenues.sum(:amount),
        received: revenues.where(payment_status: 'received').sum(:amount),
        pending: revenues.where(payment_status: 'pending').sum(:amount),
        by_type: revenues.group(:revenue_type).sum(:amount),
        count: revenues.count,
        anomalies: detect_revenue_anomalies(revenues)
      }
    end

    def reconcile_expenses(period_start, period_end)
      expenses = @organization.expenses.where(expense_date: period_start..period_end)
      
      {
        total: expenses.sum(:amount),
        paid: expenses.where(payment_status: 'paid').sum(:amount),
        pending: expenses.where(payment_status: 'pending').sum(:amount),
        by_category: expenses.group(:category).sum(:amount),
        count: expenses.count,
        anomalies: detect_expense_anomalies(expenses)
      }
    end

    def detect_revenue_anomalies(revenues)
      anomalies = []
      
      # Check for duplicate revenues
      revenues.group_by { |r| [r.revenue_date, r.amount, r.revenue_type] }.each do |key, group|
        if group.size > 1
          anomalies << {
            type: 'potential_duplicate',
            items: group.map(&:id),
            details: "#{key[0]} - #{key[2]} - #{key[1]}円"
          }
        end
      end
      
      # Check for unusual amounts
      by_type = revenues.group_by(&:revenue_type)
      by_type.each do |type, type_revenues|
        amounts = type_revenues.map(&:amount)
        next if amounts.size < 3
        
        mean = amounts.sum.to_f / amounts.size
        std_dev = Math.sqrt(amounts.map { |a| (a - mean) ** 2 }.sum / amounts.size)
        
        type_revenues.each do |revenue|
          z_score = std_dev.zero? ? 0 : (revenue.amount - mean) / std_dev
          if z_score.abs > 3
            anomalies << {
              type: 'unusual_amount',
              item_id: revenue.id,
              details: "#{revenue.revenue_type}: #{revenue.amount}円 (Z-score: #{z_score.round(2)})"
            }
          end
        end
      end
      
      anomalies
    end

    def detect_expense_anomalies(expenses)
      anomalies = []
      
      # Check for duplicate expenses
      expenses.group_by { |e| [e.expense_date, e.amount, e.category] }.each do |key, group|
        if group.size > 1
          anomalies << {
            type: 'potential_duplicate',
            items: group.map(&:id),
            details: "#{key[0]} - #{key[2]} - #{key[1]}円"
          }
        end
      end
      
      # Check for missing approvals on large expenses
      large_expenses = expenses.where('amount > ?', 100000).where(approved_at: nil)
      large_expenses.each do |expense|
        anomalies << {
          type: 'missing_approval',
          item_id: expense.id,
          details: "大額支出 #{expense.amount}円 - 承認なし"
        }
      end
      
      anomalies
    end

    def discrepancy_check(results)
      # Check if books balance
      revenue_total = results[:revenues][:received]
      expense_total = results[:expenses][:paid]
      
      # Check for anomalies
      total_anomalies = results[:revenues][:anomalies].size + results[:expenses][:anomalies].size
      
      if total_anomalies > 0
        results[:discrepancies] << "#{total_anomalies}件の異常が検出されました"
        return false
      end
      
      true
    end

    def create_revenue_journal_entry(revenue)
      {
        date: revenue.revenue_date,
        type: 'revenue',
        accounts: [
          { account: determine_debit_account(revenue), debit: revenue.amount, credit: 0 },
          { account: determine_revenue_account(revenue), debit: 0, credit: revenue.amount }
        ],
        description: revenue.name,
        reference: "REV-#{revenue.id}"
      }
    end

    def create_expense_journal_entry(expense)
      {
        date: expense.expense_date,
        type: 'expense',
        accounts: [
          { account: determine_expense_account(expense), debit: expense.amount, credit: 0 },
          { account: determine_credit_account(expense), debit: 0, credit: expense.amount }
        ],
        description: expense.name,
        reference: "EXP-#{expense.id}"
      }
    end

    def determine_debit_account(revenue)
      case revenue.payment_status
      when 'received'
        'cash'
      when 'pending'
        'accounts_receivable'
      else
        'other_current_assets'
      end
    end

    def determine_revenue_account(revenue)
      case revenue.revenue_type
      when 'registration_fee'
        'registration_revenue'
      when 'membership_fee'
        'membership_revenue'
      when 'sponsor'
        'sponsorship_revenue'
      else
        'other_revenue'
      end
    end

    def determine_expense_account(expense)
      case expense.category
      when 'venue_rental'
        'venue_expense'
      when 'referee_fees'
        'referee_expense'
      when 'equipment'
        'equipment_expense'
      when 'insurance'
        'insurance_expense'
      when 'administrative'
        'administrative_expense'
      else
        'other_expense'
      end
    end

    def determine_credit_account(expense)
      case expense.payment_status
      when 'paid'
        'cash'
      when 'pending'
        'accounts_payable'
      else
        'other_current_liabilities'
      end
    end

    def process_adjustments(date)
      adjustments = []
      
      # Process any automatic adjustments for the date
      # Example: Depreciation, accruals, etc.
      
      adjustments
    end

    def categorize_revenue(description, amount)
      description_lower = description.downcase
      
      # Pattern matching for revenue categories
      case description_lower
      when /登録|registration|参加費|entry/i
        'registration_fee'
      when /会費|membership|月謝|monthly/i
        'membership_fee'
      when /スポンサー|sponsor|協賛|広告/i
        'sponsor'
      when /チケット|ticket|入場|admission/i
        'ticket_sales'
      when /グッズ|goods|merchandise|物販/i
        'merchandise'
      when /寄付|donation|寄贈|contribution/i
        'donation'
      when /補助|subsidy|助成|grant/i
        'subsidy'
      else
        # Use amount as additional hint
        if amount > 100000
          'sponsor' # Large amounts likely sponsorship
        elsif amount % 1000 == 0 && amount <= 10000
          'membership_fee' # Round thousands likely membership
        else
          'other'
        end
      end
    end

    def categorize_expense(description, amount)
      description_lower = description.downcase
      
      # Pattern matching for expense categories
      case description_lower
      when /会場|venue|グラウンド|球場|field|施設/i
        'venue_rental'
      when /審判|referee|アンパイア|umpire|主審|塁審/i
        'referee_fees'
      when /ボール|ball|バット|bat|グローブ|glove|用具|equipment|備品/i
        'equipment'
      when /保険|insurance|補償|liability/i
        'insurance'
      when /事務|admin|管理|management|運営/i
        'administrative'
      when /広告|marketing|宣伝|pr|チラシ|flyer/i
        'marketing'
      when /賞|prize|トロフィー|trophy|メダル|medal/i
        'prize_money'
      when /交通|transport|バス|bus|移動|travel/i
        'transportation'
      else
        'miscellaneous'
      end
    end

    def calculate_confidence(description, category)
      # Calculate confidence score based on how well description matches category
      keywords = {
        'registration_fee' => %w[登録 registration 参加費 entry],
        'venue_rental' => %w[会場 venue グラウンド field 球場],
        'referee_fees' => %w[審判 referee アンパイア umpire]
      }
      
      return 50 unless keywords[category] # Default confidence
      
      description_lower = description.downcase
      matched_keywords = keywords[category].count { |kw| description_lower.include?(kw) }
      
      [100, 50 + (matched_keywords * 25)].min
    end

    def suggest_tags(description, category)
      tags = [category]
      
      # Add additional tags based on patterns
      description_lower = description.downcase
      
      tags << 'recurring' if description_lower =~ /月額|monthly|定期|regular/i
      tags << 'urgent' if description_lower =~ /緊急|urgent|急|immediate/i
      tags << 'large_amount' if description_lower =~ /高額|large|big/i
      tags << 'team_specific' if @organization.teams.any? { |t| description.include?(t.name) }
      
      tags.uniq
    end
  end
end