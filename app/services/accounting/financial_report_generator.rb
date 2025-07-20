# frozen_string_literal: true

module Accounting
  class FinancialReportGenerator
    def initialize(organization:)
      @organization = organization
      @ai_advisor = Ai::FinancialAdvisor.new(organization: organization)
    end

    def generate_monthly_report(month: Date.current.beginning_of_month)
      period_start = month.beginning_of_month
      period_end = month.end_of_month

      report = create_financial_report(
        report_type: 'monthly',
        period_start: period_start,
        period_end: period_end
      )

      compile_report_data(report)
      generate_ai_insights(report)
      finalize_report(report)

      report
    end

    def generate_quarterly_report(quarter: current_quarter)
      period_start = quarter[:start]
      period_end = quarter[:end]

      report = create_financial_report(
        report_type: 'quarterly',
        period_start: period_start,
        period_end: period_end
      )

      compile_report_data(report)
      generate_ai_insights(report)
      add_trend_analysis(report)
      finalize_report(report)

      report
    end

    def generate_annual_report(year: Date.current.year)
      period_start = Date.new(year, 1, 1)
      period_end = Date.new(year, 12, 31)

      report = create_financial_report(
        report_type: 'annual',
        period_start: period_start,
        period_end: period_end
      )

      compile_report_data(report)
      generate_ai_insights(report)
      add_trend_analysis(report)
      add_comparative_analysis(report)
      finalize_report(report)

      report
    end

    def generate_custom_report(start_date:, end_date:, options: {})
      report = create_financial_report(
        report_type: 'custom',
        period_start: start_date,
        period_end: end_date
      )

      compile_report_data(report, options)
      
      if options[:include_ai_insights]
        generate_ai_insights(report)
      end

      if options[:include_forecasts]
        add_forecasts(report)
      end

      finalize_report(report)
      report
    end

    def generate_team_report(team:, period_start:, period_end:)
      report = create_financial_report(
        report_type: 'team',
        period_start: period_start,
        period_end: period_end,
        team: team
      )

      compile_team_report_data(report, team)
      generate_team_insights(report, team)
      finalize_report(report)

      report
    end

    private

    def create_financial_report(attributes)
      @organization.financial_reports.create!(
        report_type: attributes[:report_type],
        period_start: attributes[:period_start],
        period_end: attributes[:period_end],
        team_id: attributes[:team]&.id,
        status: 'draft',
        generated_by_id: attributes[:generated_by_id] # Could be system user
      )
    end

    def compile_report_data(report, options = {})
      revenues = get_revenues(report, options)
      expenses = get_expenses(report, options)

      report.total_revenue = revenues.sum(:amount)
      report.total_expense = expenses.sum(:amount)
      report.net_income = report.total_revenue - report.total_expense

      report.report_data = {
        summary: generate_summary(report),
        revenue_analysis: analyze_revenues(revenues),
        expense_analysis: analyze_expenses(expenses),
        cash_flow: analyze_cash_flow(report),
        budget_performance: analyze_budget_performance(report),
        key_metrics: calculate_key_metrics(report, revenues, expenses)
      }

      report.save!
    end

    def compile_team_report_data(report, team)
      revenues = get_team_revenues(team, report.period_start, report.period_end)
      expenses = get_team_expenses(team, report.period_start, report.period_end)

      report.total_revenue = revenues.sum(:amount)
      report.total_expense = expenses.sum(:amount)
      report.net_income = report.total_revenue - report.total_expense

      report.report_data = {
        summary: generate_team_summary(report, team),
        revenue_analysis: analyze_revenues(revenues),
        expense_analysis: analyze_expenses(expenses),
        match_analysis: analyze_team_matches(team, report),
        player_analysis: analyze_team_players(team, report),
        comparative_analysis: compare_with_other_teams(team, report)
      }

      report.save!
    end

    def get_revenues(report, options = {})
      scope = @organization.revenues.where(revenue_date: report.period_start..report.period_end)
      
      if options[:exclude_pending]
        scope = scope.where(payment_status: 'received')
      end

      scope.includes(:team, :budget)
    end

    def get_expenses(report, options = {})
      scope = @organization.expenses.where(expense_date: report.period_start..report.period_end)
      
      if options[:exclude_pending]
        scope = scope.where(payment_status: 'paid')
      end

      if options[:approved_only]
        scope = scope.where.not(approved_at: nil)
      end

      scope.includes(:budget, :team, :match, :venue)
    end

    def get_team_revenues(team, start_date, end_date)
      @organization.revenues
        .where(team: team)
        .where(revenue_date: start_date..end_date)
        .includes(:budget)
    end

    def get_team_expenses(team, start_date, end_date)
      # Direct team expenses
      direct_expenses = @organization.expenses
        .where(team: team)
        .where(expense_date: start_date..end_date)

      # Match-related expenses
      team_matches = team.matches.where(match_date: start_date..end_date)
      match_expenses = @organization.expenses
        .where(match_id: team_matches.pluck(:id))

      direct_expenses.or(match_expenses).includes(:budget, :match, :venue)
    end

    def generate_summary(report)
      {
        period: "#{report.period_start.strftime('%Y年%m月%d日')} - #{report.period_end.strftime('%Y年%m月%d日')}",
        total_revenue: report.total_revenue,
        total_expense: report.total_expense,
        net_income: report.net_income,
        profit_margin: report.profit_margin,
        days_in_period: (report.period_end - report.period_start).to_i + 1
      }
    end

    def generate_team_summary(report, team)
      summary = generate_summary(report)
      summary.merge(
        team_name: team.name,
        player_count: team.players.active.count,
        matches_played: team.matches.where(match_date: report.period_start..report.period_end).count
      )
    end

    def analyze_revenues(revenues)
      {
        by_type: revenues.group(:revenue_type).sum(:amount),
        by_payment_status: revenues.group(:payment_status).count,
        by_month: revenues.group_by_month(:revenue_date).sum(:amount),
        top_revenues: revenues.order(amount: :desc).limit(10).map(&:attributes),
        collection_rate: calculate_collection_rate(revenues),
        average_transaction: revenues.any? ? revenues.average(:amount).round(2) : 0
      }
    end

    def analyze_expenses(expenses)
      {
        by_category: expenses.group(:category).sum(:amount),
        by_payment_status: expenses.group(:payment_status).count,
        by_approval_status: {
          approved: expenses.where.not(approved_at: nil).count,
          pending_approval: expenses.where(approved_at: nil).count
        },
        by_month: expenses.group_by_month(:expense_date).sum(:amount),
        top_expenses: expenses.order(amount: :desc).limit(10).map(&:attributes),
        average_transaction: expenses.any? ? expenses.average(:amount).round(2) : 0
      }
    end

    def analyze_cash_flow(report)
      # Daily cash flow within the period
      daily_flows = []
      
      (report.period_start..report.period_end).each do |date|
        daily_revenue = @organization.revenues
          .where(revenue_date: date)
          .where(payment_status: 'received')
          .sum(:amount)
        
        daily_expense = @organization.expenses
          .where(expense_date: date)
          .where(payment_status: 'paid')
          .sum(:amount)
        
        daily_flows << {
          date: date,
          inflow: daily_revenue,
          outflow: daily_expense,
          net_flow: daily_revenue - daily_expense
        }
      end

      {
        daily_flows: daily_flows,
        total_inflow: daily_flows.sum { |f| f[:inflow] },
        total_outflow: daily_flows.sum { |f| f[:outflow] },
        net_cash_flow: daily_flows.sum { |f| f[:net_flow] },
        average_daily_flow: daily_flows.sum { |f| f[:net_flow] } / daily_flows.size.to_f
      }
    end

    def analyze_budget_performance(report)
      budgets = @organization.budgets
        .where('period_start <= ? AND period_end >= ?', report.period_end, report.period_start)

      budget_performance = budgets.map do |budget|
        period_expenses = budget.expenses
          .where(expense_date: report.period_start..report.period_end)
          .sum(:amount)
        
        period_revenues = budget.revenues
          .where(revenue_date: report.period_start..report.period_end)
          .sum(:amount)

        {
          budget_name: budget.name,
          budget_type: budget.budget_type,
          allocated_amount: budget.amount,
          spent_amount: period_expenses,
          revenue_amount: period_revenues,
          utilization_rate: budget.amount.zero? ? 0 : (period_expenses / budget.amount * 100).round(2),
          variance: budget.amount - period_expenses,
          status: determine_budget_status(budget, period_expenses)
        }
      end

      {
        budgets: budget_performance,
        total_allocated: budgets.sum(:amount),
        total_spent: budget_performance.sum { |b| b[:spent_amount] },
        overall_utilization: budgets.sum(:amount).zero? ? 0 : 
          (budget_performance.sum { |b| b[:spent_amount] } / budgets.sum(:amount) * 100).round(2)
      }
    end

    def calculate_key_metrics(report, revenues, expenses)
      {
        # Profitability metrics
        gross_margin: calculate_gross_margin(revenues, expenses),
        operating_margin: calculate_operating_margin(report),
        
        # Efficiency metrics
        expense_ratio: report.total_revenue.zero? ? 0 : (report.total_expense / report.total_revenue * 100).round(2),
        revenue_per_team: @organization.teams.active.any? ? 
          (report.total_revenue / @organization.teams.active.count).round(2) : 0,
        
        # Collection metrics
        days_sales_outstanding: calculate_dso(revenues, report),
        days_payable_outstanding: calculate_dpo(expenses, report),
        
        # Growth metrics
        revenue_growth_rate: calculate_growth_rate(report, :revenue),
        expense_growth_rate: calculate_growth_rate(report, :expense)
      }
    end

    def analyze_team_matches(team, report)
      matches = team.matches.where(match_date: report.period_start..report.period_end)
      
      {
        total_matches: matches.count,
        home_matches: matches.where(home_team: team).count,
        away_matches: matches.where(away_team: team).count,
        wins: matches.where(winner: team).count,
        win_rate: matches.any? ? (matches.where(winner: team).count.to_f / matches.count * 100).round(2) : 0,
        match_costs: calculate_match_costs(matches)
      }
    end

    def analyze_team_players(team, report)
      players = team.players.includes(:player_stats)
      
      {
        total_players: players.count,
        active_players: players.active.count,
        new_players: players.where(created_at: report.period_start..report.period_end).count,
        average_stats: calculate_average_player_stats(players),
        insurance_costs: estimate_insurance_costs(players.active.count)
      }
    end

    def compare_with_other_teams(team, report)
      other_teams = @organization.teams.where.not(id: team.id)
      team_metrics = calculate_team_metrics(team, report)
      
      comparisons = other_teams.map do |other_team|
        other_metrics = calculate_team_metrics(other_team, report)
        {
          team_name: other_team.name,
          revenue_difference: team_metrics[:revenue] - other_metrics[:revenue],
          expense_difference: team_metrics[:expense] - other_metrics[:expense],
          efficiency_score: other_metrics[:efficiency_score]
        }
      end

      {
        team_rank: calculate_team_rank(team, report),
        average_comparison: calculate_average_comparison(team_metrics, comparisons),
        top_performers: comparisons.sort_by { |c| -c[:efficiency_score] }.first(3)
      }
    end

    def calculate_collection_rate(revenues)
      return 0 if revenues.empty?
      
      received = revenues.where(payment_status: 'received').sum(:amount)
      total = revenues.sum(:amount)
      
      total.zero? ? 0 : (received / total * 100).round(2)
    end

    def determine_budget_status(budget, spent_amount)
      utilization = budget.amount.zero? ? 0 : (spent_amount / budget.amount * 100)
      
      case utilization
      when 0..80 then 'on_track'
      when 80..95 then 'warning'
      when 95..100 then 'critical'
      else 'over_budget'
      end
    end

    def calculate_gross_margin(revenues, expenses)
      revenue_total = revenues.sum(:amount)
      direct_costs = expenses.where(category: %w[venue_rental referee_fees]).sum(:amount)
      
      return 0 if revenue_total.zero?
      
      ((revenue_total - direct_costs) / revenue_total * 100).round(2)
    end

    def calculate_operating_margin(report)
      return 0 if report.total_revenue.zero?
      
      (report.net_income / report.total_revenue * 100).round(2)
    end

    def calculate_dso(revenues, report)
      # Days Sales Outstanding
      days_in_period = (report.period_end - report.period_start).to_i + 1
      accounts_receivable = revenues.where(payment_status: 'pending').sum(:amount)
      daily_revenue = report.total_revenue / days_in_period.to_f
      
      return 0 if daily_revenue.zero?
      
      (accounts_receivable / daily_revenue).round
    end

    def calculate_dpo(expenses, report)
      # Days Payable Outstanding
      days_in_period = (report.period_end - report.period_start).to_i + 1
      accounts_payable = expenses.where(payment_status: 'pending').sum(:amount)
      daily_expense = report.total_expense / days_in_period.to_f
      
      return 0 if daily_expense.zero?
      
      (accounts_payable / daily_expense).round
    end

    def calculate_growth_rate(report, type)
      # Compare with previous period
      previous_period_start = report.period_start - (report.period_end - report.period_start + 1).days
      previous_period_end = report.period_start - 1.day
      
      case type
      when :revenue
        current = report.total_revenue
        previous = @organization.revenues
          .where(revenue_date: previous_period_start..previous_period_end)
          .sum(:amount)
      when :expense
        current = report.total_expense
        previous = @organization.expenses
          .where(expense_date: previous_period_start..previous_period_end)
          .sum(:amount)
      end
      
      return 0 if previous.zero?
      
      ((current - previous) / previous * 100).round(2)
    end

    def calculate_match_costs(matches)
      match_ids = matches.pluck(:id)
      
      @organization.expenses
        .where(match_id: match_ids)
        .sum(:amount)
    end

    def calculate_average_player_stats(players)
      # This would aggregate player statistics
      # Placeholder implementation
      {
        batting_average: 0.250,
        era: 3.50,
        fielding_percentage: 0.950
      }
    end

    def estimate_insurance_costs(player_count)
      # Estimate based on player count
      per_player_annual = 2000
      per_player_annual * player_count
    end

    def calculate_team_metrics(team, report)
      revenues = get_team_revenues(team, report.period_start, report.period_end)
      expenses = get_team_expenses(team, report.period_start, report.period_end)
      
      revenue_total = revenues.sum(:amount)
      expense_total = expenses.sum(:amount)
      
      {
        revenue: revenue_total,
        expense: expense_total,
        net_income: revenue_total - expense_total,
        efficiency_score: expense_total.zero? ? 100 : (revenue_total / expense_total * 100).round(2)
      }
    end

    def calculate_team_rank(team, report)
      all_teams = @organization.teams.map do |t|
        metrics = calculate_team_metrics(t, report)
        { team_id: t.id, efficiency_score: metrics[:efficiency_score] }
      end
      
      sorted_teams = all_teams.sort_by { |t| -t[:efficiency_score] }
      rank = sorted_teams.find_index { |t| t[:team_id] == team.id } + 1
      
      {
        rank: rank,
        total_teams: all_teams.size,
        percentile: ((all_teams.size - rank + 1) / all_teams.size.to_f * 100).round
      }
    end

    def calculate_average_comparison(team_metrics, comparisons)
      return {} if comparisons.empty?
      
      avg_revenue_diff = comparisons.sum { |c| c[:revenue_difference] } / comparisons.size.to_f
      avg_expense_diff = comparisons.sum { |c| c[:expense_difference] } / comparisons.size.to_f
      
      {
        revenue_vs_average: avg_revenue_diff.round(2),
        expense_vs_average: avg_expense_diff.round(2),
        efficiency_vs_average: team_metrics[:efficiency_score] - 
          (comparisons.sum { |c| c[:efficiency_score] } / comparisons.size.to_f)
      }
    end

    def current_quarter
      month = Date.current.month
      quarter = ((month - 1) / 3) + 1
      year = Date.current.year
      
      case quarter
      when 1
        { start: Date.new(year, 1, 1), end: Date.new(year, 3, 31) }
      when 2
        { start: Date.new(year, 4, 1), end: Date.new(year, 6, 30) }
      when 3
        { start: Date.new(year, 7, 1), end: Date.new(year, 9, 30) }
      when 4
        { start: Date.new(year, 10, 1), end: Date.new(year, 12, 31) }
      end
    end

    def generate_ai_insights(report)
      # Use AI Financial Advisor to generate insights
      advice = @ai_advisor.generate_financial_advice
      
      report.insights = {
        ai_generated: true,
        generated_at: Time.current,
        summary: advice[:summary],
        key_findings: advice[:priority_issues],
        recommendations: advice[:short_term_actions],
        risks: identify_financial_risks(report),
        opportunities: identify_opportunities(report)
      }
      
      report.save!
    end

    def generate_team_insights(report, team)
      report.insights = {
        team_performance: assess_team_performance(team, report),
        cost_efficiency: analyze_team_cost_efficiency(team, report),
        revenue_opportunities: identify_team_revenue_opportunities(team, report),
        recommendations: generate_team_recommendations(team, report)
      }
      
      report.save!
    end

    def add_trend_analysis(report)
      trends = {
        revenue_trend: analyze_revenue_trend(report),
        expense_trend: analyze_expense_trend(report),
        seasonal_patterns: identify_seasonal_patterns(report),
        growth_projections: project_future_growth(report)
      }
      
      report.report_data['trend_analysis'] = trends
      report.save!
    end

    def add_comparative_analysis(report)
      # Compare with previous year
      previous_year = report.period_start.year - 1
      previous_report = @organization.financial_reports
        .where(report_type: 'annual')
        .where('EXTRACT(YEAR FROM period_start) = ?', previous_year)
        .first
      
      if previous_report
        comparison = {
          revenue_change: report.total_revenue - previous_report.total_revenue,
          expense_change: report.total_expense - previous_report.total_expense,
          net_income_change: report.net_income - previous_report.net_income,
          year_over_year_growth: calculate_yoy_growth(report, previous_report)
        }
        
        report.report_data['year_over_year'] = comparison
        report.save!
      end
    end

    def add_forecasts(report)
      # Generate forecasts for the next period
      predictor = Ai::RevenuePredictor.new(organization: @organization)
      analyzer = Ai::ExpenseAnalyzer.new(organization: @organization)
      
      next_period_start = report.period_end + 1.day
      next_period_end = next_period_start + (report.period_end - report.period_start).days
      
      revenue_forecast = predictor.predict_revenue(
        period_start: next_period_start,
        period_end: next_period_end
      )
      
      expense_forecast = analyzer.predict_future_expenses(
        months_ahead: ((next_period_end - next_period_start) / 30).to_i
      )
      
      report.report_data['forecasts'] = {
        revenue_forecast: revenue_forecast,
        expense_forecast: expense_forecast,
        projected_net_income: calculate_projected_net_income(revenue_forecast, expense_forecast)
      }
      
      report.save!
    end

    def identify_financial_risks(report)
      risks = []
      
      # Negative cash flow risk
      if report.net_income < 0
        risks << {
          type: 'negative_cash_flow',
          severity: 'high',
          description: "純損失が#{report.net_income.abs}円発生しています"
        }
      end
      
      # High expense ratio
      if report.total_revenue > 0 && report.total_expense / report.total_revenue > 0.9
        risks << {
          type: 'high_expense_ratio',
          severity: 'medium',
          description: "支出が収入の#{(report.total_expense / report.total_revenue * 100).round}%に達しています"
        }
      end
      
      # Revenue concentration
      revenue_concentration = analyze_revenue_concentration(report)
      if revenue_concentration[:top_percentage] > 50
        risks << {
          type: 'revenue_concentration',
          severity: 'medium',
          description: "収入の#{revenue_concentration[:top_percentage]}%が単一ソースに依存しています"
        }
      end
      
      risks
    end

    def identify_opportunities(report)
      opportunities = []
      
      # Unutilized budget
      if report.report_data['budget_performance']
        underutilized = report.report_data['budget_performance']['budgets']
          .select { |b| b[:utilization_rate] < 50 }
        
        if underutilized.any?
          opportunities << {
            type: 'unutilized_budget',
            description: "#{underutilized.size}件の予算が50%未満の使用率です",
            potential_value: underutilized.sum { |b| b[:variance] }
          }
        end
      end
      
      # Revenue growth opportunities
      revenue_analysis = report.report_data['revenue_analysis']
      if revenue_analysis && revenue_analysis['by_type']['sponsor'].to_i < report.total_revenue * 0.2
        opportunities << {
          type: 'sponsorship_opportunity',
          description: 'スポンサー収入の拡大余地があります',
          potential_value: report.total_revenue * 0.1
        }
      end
      
      opportunities
    end

    def analyze_revenue_concentration(report)
      revenues = @organization.revenues
        .where(revenue_date: report.period_start..report.period_end)
        .group(:revenue_type)
        .sum(:amount)
      
      return { top_percentage: 0 } if revenues.empty?
      
      top_source_amount = revenues.values.max
      total_revenue = revenues.values.sum
      
      {
        top_source: revenues.key(top_source_amount),
        top_amount: top_source_amount,
        top_percentage: (top_source_amount / total_revenue.to_f * 100).round(2)
      }
    end

    def assess_team_performance(team, report)
      metrics = calculate_team_metrics(team, report)
      rank_info = calculate_team_rank(team, report)
      
      performance_score = case rank_info[:percentile]
                         when 80..100 then 'excellent'
                         when 60..79 then 'good'
                         when 40..59 then 'average'
                         when 20..39 then 'below_average'
                         else 'poor'
                         end
      
      {
        overall_score: performance_score,
        rank: rank_info[:rank],
        total_teams: rank_info[:total_teams],
        efficiency_score: metrics[:efficiency_score]
      }
    end

    def analyze_team_cost_efficiency(team, report)
      expenses = get_team_expenses(team, report.period_start, report.period_end)
      matches = team.matches.where(match_date: report.period_start..report.period_end)
      
      {
        cost_per_match: matches.any? ? (expenses.sum(:amount) / matches.count).round(2) : 0,
        cost_per_player: team.players.active.any? ? 
          (expenses.sum(:amount) / team.players.active.count).round(2) : 0,
        expense_breakdown: expenses.group(:category).sum(:amount)
      }
    end

    def identify_team_revenue_opportunities(team, report)
      opportunities = []
      
      # Check for missing revenue streams
      team_revenues = get_team_revenues(team, report.period_start, report.period_end)
      revenue_types = team_revenues.pluck(:revenue_type).uniq
      
      missing_types = %w[registration_fee membership_fee sponsor] - revenue_types
      missing_types.each do |type|
        opportunities << {
          type: type,
          description: "#{type}の収入機会が活用されていません",
          estimated_value: estimate_revenue_potential(type, team)
        }
      end
      
      opportunities
    end

    def generate_team_recommendations(team, report)
      recommendations = []
      
      # Based on performance
      performance = assess_team_performance(team, report)
      if performance[:overall_score] == 'poor' || performance[:overall_score] == 'below_average'
        recommendations << {
          priority: 'high',
          category: 'performance',
          action: 'チームの収支バランスを改善する必要があります'
        }
      end
      
      # Based on costs
      cost_analysis = analyze_team_cost_efficiency(team, report)
      avg_cost_per_match = @organization.expenses.sum(:amount) / @organization.matches.count rescue 0
      if cost_analysis[:cost_per_match] > avg_cost_per_match * 1.2
        recommendations << {
          priority: 'medium',
          category: 'cost',
          action: '試合あたりのコストが平均より20%高いため、削減を検討してください'
        }
      end
      
      recommendations
    end

    def analyze_revenue_trend(report)
      # Analyze revenue trends over time
      monthly_revenues = @organization.revenues
        .where(revenue_date: report.period_start..report.period_end)
        .group_by_month(:revenue_date)
        .sum(:amount)
      
      calculate_trend_metrics(monthly_revenues.values)
    end

    def analyze_expense_trend(report)
      # Analyze expense trends over time
      monthly_expenses = @organization.expenses
        .where(expense_date: report.period_start..report.period_end)
        .group_by_month(:expense_date)
        .sum(:amount)
      
      calculate_trend_metrics(monthly_expenses.values)
    end

    def calculate_trend_metrics(values)
      return {} if values.size < 2
      
      # Simple linear regression
      x = (0...values.size).to_a
      y = values
      
      n = values.size
      x_mean = x.sum.to_f / n
      y_mean = y.sum.to_f / n
      
      numerator = x.zip(y).map { |xi, yi| (xi - x_mean) * (yi - y_mean) }.sum
      denominator = x.map { |xi| (xi - x_mean) ** 2 }.sum
      
      slope = denominator.zero? ? 0 : numerator / denominator
      
      {
        direction: slope > 0 ? 'increasing' : 'decreasing',
        average_change: slope.round(2),
        volatility: calculate_volatility(values)
      }
    end

    def calculate_volatility(values)
      return 0 if values.empty? || values.size == 1
      
      mean = values.sum.to_f / values.size
      variance = values.map { |v| (v - mean) ** 2 }.sum / values.size
      std_dev = Math.sqrt(variance)
      
      mean.zero? ? 0 : (std_dev / mean * 100).round(2)
    end

    def identify_seasonal_patterns(report)
      # This would require more historical data
      # Simplified version
      {
        peak_months: [],
        low_months: [],
        seasonality_index: 1.0
      }
    end

    def project_future_growth(report)
      # Simple projection based on current trends
      revenue_trend = analyze_revenue_trend(report)
      expense_trend = analyze_expense_trend(report)
      
      {
        projected_revenue_growth: revenue_trend[:average_change] || 0,
        projected_expense_growth: expense_trend[:average_change] || 0,
        confidence_level: 'medium'
      }
    end

    def calculate_yoy_growth(current_report, previous_report)
      {
        revenue: previous_report.total_revenue.zero? ? 0 : 
          ((current_report.total_revenue - previous_report.total_revenue) / previous_report.total_revenue * 100).round(2),
        expense: previous_report.total_expense.zero? ? 0 :
          ((current_report.total_expense - previous_report.total_expense) / previous_report.total_expense * 100).round(2),
        net_income: previous_report.net_income.zero? ? 0 :
          ((current_report.net_income - previous_report.net_income) / previous_report.net_income.abs * 100).round(2)
      }
    end

    def calculate_projected_net_income(revenue_forecast, expense_forecast)
      # Extract realistic scenario values
      projected_revenue = revenue_forecast[:scenarios][:realistic][:total] || 0
      projected_expense = expense_forecast[:monthly_predictions].values.sum || 0
      
      projected_revenue - projected_expense
    end

    def estimate_revenue_potential(type, team)
      case type
      when 'registration_fee'
        50000 # Base registration fee
      when 'membership_fee'
        team.players.active.count * 5000 # 5000 yen per player
      when 'sponsor'
        30000 # Minimum sponsorship
      else
        10000
      end
    end

    def finalize_report(report)
      report.update!(
        status: 'published',
        generated_at: Time.current
      )
      
      # Send notifications
      notify_report_ready(report)
      
      # Archive if needed
      archive_old_reports if report.report_type == 'annual'
    end

    def notify_report_ready(report)
      Rails.logger.info "Financial report ready: #{report.report_type} - #{report.id}"
      
      # Send email notifications
      # OrganizationMailer.financial_report_ready(report).deliver_later
      
      # Create in-app notifications
      # Notification.create!(
      #   organization: @organization,
      #   title: "#{report.report_type.humanize}レポートが完成しました",
      #   message: "期間: #{report.period_start} - #{report.period_end}",
      #   notifiable: report
      # )
    end

    def archive_old_reports
      # Archive reports older than 3 years
      old_reports = @organization.financial_reports
        .where('created_at < ?', 3.years.ago)
        .where(status: 'published')
      
      old_reports.update_all(status: 'archived')
    end
  end
end