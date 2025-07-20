# frozen_string_literal: true

module Ai
  class FinancialAdvisor < OpenAiClient
    def initialize(organization:)
      super()
      @organization = organization
    end

    def generate_financial_advice
      financial_health = assess_financial_health
      cash_flow_analysis = analyze_cash_flow
      risk_assessment = assess_financial_risks
      
      prompt = build_advice_prompt(
        health: financial_health,
        cash_flow: cash_flow_analysis,
        risks: risk_assessment
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: financial_advisor_system_prompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }
      )

      format_financial_advice(response, financial_health)
    rescue StandardError => e
      Rails.logger.error "Financial advice generation failed: #{e.message}"
      generate_fallback_advice(financial_health)
    end

    def create_budget_plan(period_start:, period_end:, objectives: [])
      current_state = analyze_current_financial_state
      forecasts = generate_financial_forecasts(period_start, period_end)
      
      prompt = build_budget_plan_prompt(
        current_state: current_state,
        forecasts: forecasts,
        objectives: objectives,
        period_start: period_start,
        period_end: period_end
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: budget_planning_system_prompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.6,
          max_tokens: 2000
        }
      )

      parse_budget_plan(response)
    end

    def analyze_investment_opportunities
      surplus_funds = calculate_surplus_funds
      current_investments = analyze_current_investments
      opportunities = identify_investment_opportunities
      
      return { message: "現在投資可能な余剰資金がありません。" } if surplus_funds <= 0
      
      prompt = build_investment_prompt(
        surplus: surplus_funds,
        current: current_investments,
        opportunities: opportunities
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: investment_advisor_system_prompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.6,
          max_tokens: 1500
        }
      )

      format_investment_recommendations(response)
    end

    private

    def financial_advisor_system_prompt
      <<~PROMPT
        あなたは野球リーグ専門の財務アドバイザーです。
        組織の財務健全性を向上させる具体的で実行可能なアドバイスを日本語で提供します。
        
        アドバイスにおいて重視すべき点：
        1. キャッシュフローの安定性
        2. 収益の多様化
        3. コスト効率の最適化
        4. リスク管理
        5. 持続可能な成長
        
        すべての提案は、野球リーグの特性（季節性、チーム数の変動など）を考慮してください。
      PROMPT
    end

    def budget_planning_system_prompt
      <<~PROMPT
        あなたは予算計画の専門家です。
        野球リーグの特性を理解し、実現可能な予算計画を日本語で作成します。
        
        予算計画で考慮すべき要素：
        1. 収入の季節性（シーズン中とオフシーズン）
        2. 固定費と変動費の適切な配分
        3. 緊急時の予備費
        4. 成長投資のための予算
        5. キャッシュフロー管理
        
        計画は具体的な数値と実行スケジュールを含めてください。
      PROMPT
    end

    def investment_advisor_system_prompt
      <<~PROMPT
        あなたは野球リーグの投資アドバイザーです。
        余剰資金を効果的に活用し、組織の長期的な成長を支援する投資戦略を日本語で提案します。
        
        投資提案で重視すべき点：
        1. リスクとリターンのバランス
        2. 流動性の確保
        3. リーグ運営との相乗効果
        4. 実現可能性
        5. 投資回収期間
        
        すべての提案は保守的なアプローチを基本とし、リスクを明確に説明してください。
      PROMPT
    end

    def assess_financial_health
      revenues = @organization.revenues.last(12.months)
      expenses = @organization.expenses.last(12.months)
      
      total_revenue = revenues.sum(:amount)
      total_expense = expenses.sum(:amount)
      net_income = total_revenue - total_expense
      
      # Calculate key ratios
      profit_margin = total_revenue.zero? ? 0 : (net_income / total_revenue * 100).round(2)
      expense_ratio = total_revenue.zero? ? 0 : (total_expense / total_revenue * 100).round(2)
      
      # Liquidity analysis
      current_assets = estimate_current_assets
      current_liabilities = estimate_current_liabilities
      current_ratio = current_liabilities.zero? ? 0 : (current_assets / current_liabilities).round(2)
      
      # Trend analysis
      revenue_trend = calculate_trend(revenues.group_by_month(:revenue_date).sum(:amount))
      expense_trend = calculate_trend(expenses.group_by_month(:expense_date).sum(:amount))
      
      {
        total_revenue: total_revenue,
        total_expense: total_expense,
        net_income: net_income,
        profit_margin: profit_margin,
        expense_ratio: expense_ratio,
        current_ratio: current_ratio,
        revenue_trend: revenue_trend,
        expense_trend: expense_trend,
        health_score: calculate_health_score(profit_margin, current_ratio, revenue_trend)
      }
    end

    def analyze_cash_flow
      # Past 3 months cash flow
      three_months_ago = 3.months.ago.beginning_of_month
      
      monthly_cash_flow = (0..2).map do |months_back|
        month_start = three_months_ago + months_back.months
        month_end = month_start.end_of_month
        
        month_revenues = @organization.revenues
          .where(revenue_date: month_start..month_end)
          .where(payment_status: 'received')
          .sum(:amount)
        
        month_expenses = @organization.expenses
          .where(expense_date: month_start..month_end)
          .where(payment_status: 'paid')
          .sum(:amount)
        
        {
          month: month_start.strftime('%Y年%m月'),
          inflow: month_revenues,
          outflow: month_expenses,
          net_flow: month_revenues - month_expenses
        }
      end
      
      # Future cash flow projection
      future_receivables = @organization.revenues
        .where(payment_status: 'pending')
        .where('revenue_date <= ?', Date.current)
        .sum(:amount)
      
      future_payables = @organization.expenses
        .where(payment_status: 'pending')
        .where('expense_date <= ?', Date.current)
        .sum(:amount)
      
      {
        historical: monthly_cash_flow,
        average_monthly_flow: monthly_cash_flow.sum { |m| m[:net_flow] } / 3.0,
        future_receivables: future_receivables,
        future_payables: future_payables,
        projected_position: future_receivables - future_payables,
        days_cash_on_hand: calculate_days_cash_on_hand
      }
    end

    def assess_financial_risks
      risks = []
      
      # Revenue concentration risk
      revenue_concentration = analyze_revenue_concentration
      if revenue_concentration[:top_source_percentage] > 50
        risks << {
          type: 'revenue_concentration',
          severity: 'high',
          description: "収入の#{revenue_concentration[:top_source_percentage]}%が単一ソースに依存",
          impact: 'high',
          mitigation: '収入源の多様化が急務'
        }
      end
      
      # Cash flow risk
      cash_flow = analyze_cash_flow
      if cash_flow[:days_cash_on_hand] < 30
        risks << {
          type: 'liquidity',
          severity: 'critical',
          description: "現金保有日数が#{cash_flow[:days_cash_on_hand]}日と危険水準",
          impact: 'critical',
          mitigation: '即座の現金確保が必要'
        }
      end
      
      # Expense growth risk
      expense_growth = calculate_expense_growth_rate
      if expense_growth > 20
        risks << {
          type: 'expense_growth',
          severity: 'medium',
          description: "支出が年率#{expense_growth}%で増加",
          impact: 'medium',
          mitigation: 'コスト管理の強化が必要'
        }
      end
      
      # Seasonal risk
      seasonal_variance = calculate_seasonal_variance
      if seasonal_variance > 0.5
        risks << {
          type: 'seasonality',
          severity: 'medium',
          description: '収入の季節変動が大きい',
          impact: 'medium',
          mitigation: 'オフシーズンの収入源確保が必要'
        }
      end
      
      risks
    end

    def analyze_current_financial_state
      {
        assets: {
          cash: estimate_cash_balance,
          receivables: calculate_receivables,
          total_current: estimate_current_assets
        },
        liabilities: {
          payables: calculate_payables,
          total_current: estimate_current_liabilities
        },
        monthly_burn_rate: calculate_monthly_burn_rate,
        revenue_sources: analyze_revenue_sources,
        expense_categories: analyze_expense_categories
      }
    end

    def generate_financial_forecasts(period_start, period_end)
      # Use existing services for predictions
      revenue_predictor = RevenuePredictor.new(organization: @organization)
      expense_analyzer = ExpenseAnalyzer.new(organization: @organization)
      
      months_ahead = ((period_end - period_start) / 30).to_i
      
      {
        revenue_forecast: revenue_predictor.predict_revenue(
          period_start: period_start,
          period_end: period_end
        ),
        expense_forecast: expense_analyzer.predict_future_expenses(
          months_ahead: months_ahead
        ),
        cash_flow_projection: project_cash_flow(period_start, period_end),
        break_even_analysis: perform_break_even_analysis
      }
    end

    def calculate_surplus_funds
      cash = estimate_cash_balance
      min_reserve = calculate_minimum_reserve
      
      [cash - min_reserve, 0].max
    end

    def analyze_current_investments
      # Placeholder for current investment analysis
      {
        equipment: {
          amount: 500000,
          age: 2,
          return: 'operational_efficiency'
        },
        technology: {
          amount: 300000,
          age: 1,
          return: 'cost_savings'
        }
      }
    end

    def identify_investment_opportunities
      [
        {
          type: 'technology',
          name: 'オンライン登録システム',
          cost: 1000000,
          expected_return: 15,
          payback_period: 24,
          risk: 'low'
        },
        {
          type: 'facility',
          name: '練習場設備の改善',
          cost: 2000000,
          expected_return: 10,
          payback_period: 36,
          risk: 'medium'
        },
        {
          type: 'marketing',
          name: 'デジタルマーケティングキャンペーン',
          cost: 500000,
          expected_return: 25,
          payback_period: 12,
          risk: 'medium'
        }
      ]
    end

    def build_advice_prompt(health:, cash_flow:, risks:)
      <<~PROMPT
        以下の財務状況を分析し、包括的な財務アドバイスを提供してください。

        ## 財務健全性指標
        総収入: #{health[:total_revenue]}円
        総支出: #{health[:total_expense]}円
        純利益: #{health[:net_income]}円
        利益率: #{health[:profit_margin]}%
        支出比率: #{health[:expense_ratio]}%
        流動比率: #{health[:current_ratio]}
        健全性スコア: #{health[:health_score]}/100

        ## キャッシュフロー分析
        過去3ヶ月の推移:
        #{cash_flow[:historical].map { |m| "#{m[:month]}: #{m[:net_flow]}円" }.join("\n")}
        
        平均月次キャッシュフロー: #{cash_flow[:average_monthly_flow]}円
        未収金: #{cash_flow[:future_receivables]}円
        未払金: #{cash_flow[:future_payables]}円
        現金保有日数: #{cash_flow[:days_cash_on_hand]}日

        ## 識別されたリスク
        #{risks.map { |r| "- #{r[:type]}: #{r[:description]} (深刻度: #{r[:severity]})" }.join("\n")}

        以下の構成でアドバイスを提供してください：
        1. 現状の総合評価（3-5行）
        2. 優先的に対処すべき課題（3-5項目）
        3. 短期的改善策（1-3ヶ月）
        4. 中長期的戦略（6-12ヶ月）
        5. 具体的なアクションプラン（優先順位付き）
      PROMPT
    end

    def build_budget_plan_prompt(current_state:, forecasts:, objectives:, period_start:, period_end:)
      <<~PROMPT
        #{period_start}から#{period_end}までの予算計画を作成してください。

        ## 現在の財務状態
        #{current_state.to_json}

        ## 財務予測
        #{forecasts.to_json}

        ## 計画の目標
        #{objectives.join("\n")}

        以下の要素を含む予算計画を作成してください：
        1. 収入予算（月別、カテゴリ別）
        2. 支出予算（月別、カテゴリ別）
        3. 投資予算
        4. 予備費
        5. キャッシュフロー計画
        6. 主要KPIと目標値
        7. リスク対応計画
      PROMPT
    end

    def build_investment_prompt(surplus:, current:, opportunities:)
      <<~PROMPT
        以下の状況で最適な投資戦略を提案してください。

        ## 利用可能な余剰資金
        #{surplus}円

        ## 現在の投資状況
        #{current.to_json}

        ## 投資機会
        #{opportunities.to_json}

        以下の観点で投資提案を行ってください：
        1. 推奨投資配分
        2. 各投資の優先順位と理由
        3. 期待リターンとリスク評価
        4. 実施スケジュール
        5. 成功指標とモニタリング方法
      PROMPT
    end

    # Helper calculation methods
    def estimate_current_assets
      cash = estimate_cash_balance
      receivables = calculate_receivables
      cash + receivables
    end

    def estimate_current_liabilities
      calculate_payables
    end

    def estimate_cash_balance
      # Simplified estimation based on recent cash flows
      recent_revenues = @organization.revenues
        .where(payment_status: 'received')
        .where(revenue_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      recent_expenses = @organization.expenses
        .where(payment_status: 'paid')
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      [recent_revenues - recent_expenses, 0].max
    end

    def calculate_receivables
      @organization.revenues
        .where(payment_status: 'pending')
        .sum(:amount)
    end

    def calculate_payables
      @organization.expenses
        .where(payment_status: 'pending')
        .sum(:amount)
    end

    def calculate_trend(monthly_data)
      return 'stable' if monthly_data.size < 2
      
      values = monthly_data.values
      first_half_avg = values.first(values.size / 2).sum.to_f / (values.size / 2)
      second_half_avg = values.last(values.size / 2).sum.to_f / (values.size / 2)
      
      return 'stable' if first_half_avg.zero?
      
      growth = ((second_half_avg - first_half_avg) / first_half_avg * 100).round(2)
      
      case growth
      when -Float::INFINITY..-10 then 'declining'
      when -10..10 then 'stable'
      when 10..Float::INFINITY then 'growing'
      end
    end

    def calculate_health_score(profit_margin, current_ratio, revenue_trend)
      score = 0
      
      # Profit margin score (0-40 points)
      score += case profit_margin
               when 20..Float::INFINITY then 40
               when 10..20 then 30
               when 5..10 then 20
               when 0..5 then 10
               else 0
               end
      
      # Current ratio score (0-30 points)
      score += case current_ratio
               when 2.0..Float::INFINITY then 30
               when 1.5..2.0 then 25
               when 1.0..1.5 then 15
               when 0.5..1.0 then 5
               else 0
               end
      
      # Revenue trend score (0-30 points)
      score += case revenue_trend
               when 'growing' then 30
               when 'stable' then 20
               when 'declining' then 0
               end
      
      score
    end

    def calculate_days_cash_on_hand
      cash = estimate_cash_balance
      daily_expenses = @organization.expenses
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount) / 90.0
      
      return 0 if daily_expenses.zero?
      
      (cash / daily_expenses).round
    end

    def analyze_revenue_concentration
      total_revenue = @organization.revenues.last(12.months).sum(:amount)
      revenue_by_type = @organization.revenues
        .last(12.months)
        .group(:revenue_type)
        .sum(:amount)
      
      top_source = revenue_by_type.max_by { |_, amount| amount }
      
      {
        top_source: top_source[0],
        top_source_amount: top_source[1],
        top_source_percentage: (top_source[1].to_f / total_revenue * 100).round(2)
      }
    end

    def calculate_expense_growth_rate
      current_year = @organization.expenses
        .where(expense_date: Date.current.beginning_of_year..Date.current)
        .sum(:amount)
      
      last_year = @organization.expenses
        .where(expense_date: 1.year.ago.beginning_of_year..1.year.ago.end_of_year)
        .sum(:amount)
      
      return 0 if last_year.zero?
      
      ((current_year - last_year) / last_year.to_f * 100).round(2)
    end

    def calculate_seasonal_variance
      monthly_revenues = @organization.revenues
        .where(revenue_date: 1.year.ago..Date.current)
        .group_by_month(:revenue_date)
        .sum(:amount)
        .values
      
      return 0 if monthly_revenues.empty?
      
      mean = monthly_revenues.sum.to_f / monthly_revenues.size
      variance = monthly_revenues.map { |r| (r - mean) ** 2 }.sum / monthly_revenues.size
      std_dev = Math.sqrt(variance)
      
      std_dev / mean
    end

    def calculate_monthly_burn_rate
      @organization.expenses
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount) / 3.0
    end

    def analyze_revenue_sources
      @organization.revenues
        .group(:revenue_type)
        .sum(:amount)
        .transform_values { |v| v.round(2) }
    end

    def analyze_expense_categories
      @organization.expenses
        .group(:category)
        .sum(:amount)
        .transform_values { |v| v.round(2) }
    end

    def project_cash_flow(period_start, period_end)
      months = ((period_end - period_start) / 30).to_i
      projections = []
      
      current_cash = estimate_cash_balance
      
      (1..months).each do |month|
        projected_revenue = @organization.revenues
          .where(revenue_date: 3.months.ago..Date.current)
          .sum(:amount) / 3.0
        
        projected_expense = @organization.expenses
          .where(expense_date: 3.months.ago..Date.current)
          .sum(:amount) / 3.0
        
        net_flow = projected_revenue - projected_expense
        current_cash += net_flow
        
        projections << {
          month: month,
          revenue: projected_revenue,
          expense: projected_expense,
          net_flow: net_flow,
          cash_balance: current_cash
        }
      end
      
      projections
    end

    def perform_break_even_analysis
      fixed_costs = estimate_fixed_costs
      variable_cost_ratio = calculate_variable_cost_ratio
      average_revenue_per_unit = calculate_average_revenue_per_team
      
      break_even_units = fixed_costs / (average_revenue_per_unit * (1 - variable_cost_ratio))
      
      {
        fixed_costs: fixed_costs,
        variable_cost_ratio: variable_cost_ratio,
        average_revenue_per_unit: average_revenue_per_unit,
        break_even_units: break_even_units.round,
        current_units: @organization.teams.active.count,
        margin_of_safety: ((@organization.teams.active.count - break_even_units) / @organization.teams.active.count * 100).round(2)
      }
    end

    def estimate_fixed_costs
      # Categories typically fixed
      fixed_categories = %w[administrative insurance]
      
      @organization.expenses
        .where(category: fixed_categories)
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount) / 3.0
    end

    def calculate_variable_cost_ratio
      variable_categories = %w[venue_rental referee_fees]
      
      total_expense = @organization.expenses
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      variable_expense = @organization.expenses
        .where(category: variable_categories)
        .where(expense_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      return 0 if total_expense.zero?
      
      variable_expense.to_f / total_expense
    end

    def calculate_average_revenue_per_team
      return 50000 if @organization.teams.count.zero? # Default value
      
      total_revenue = @organization.revenues
        .where(revenue_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      total_revenue / @organization.teams.active.count
    end

    def calculate_minimum_reserve
      # Minimum 2 months of operating expenses
      monthly_expenses = calculate_monthly_burn_rate
      monthly_expenses * 2
    end

    def format_financial_advice(response, health)
      content = response.dig("choices", 0, "message", "content")
      return generate_fallback_advice(health) unless content
      
      {
        summary: extract_summary(content),
        priority_issues: extract_priority_issues(content),
        short_term_actions: extract_short_term_actions(content),
        long_term_strategy: extract_long_term_strategy(content),
        action_plan: extract_action_plan(content),
        metrics: {
          health_score: health[:health_score],
          profit_margin: health[:profit_margin],
          current_ratio: health[:current_ratio]
        }
      }
    end

    def parse_budget_plan(response)
      content = response.dig("choices", 0, "message", "content")
      return default_budget_plan unless content
      
      {
        revenue_budget: extract_revenue_budget(content),
        expense_budget: extract_expense_budget(content),
        investment_budget: extract_investment_budget(content),
        reserve_fund: extract_reserve_fund(content),
        cash_flow_plan: extract_cash_flow_plan(content),
        kpis: extract_kpis(content),
        risk_plan: extract_risk_plan(content)
      }
    end

    def format_investment_recommendations(response)
      content = response.dig("choices", 0, "message", "content")
      return default_investment_recommendations unless content
      
      {
        recommended_allocation: extract_allocation(content),
        prioritized_investments: extract_prioritized_investments(content),
        risk_return_analysis: extract_risk_return(content),
        implementation_schedule: extract_implementation_schedule(content),
        success_metrics: extract_success_metrics(content)
      }
    end

    # Content extraction methods
    def extract_summary(content)
      if summary_section = content[/現状の総合評価[:：]\s*(.+?)(?=優先的|$)/m]
        summary_section.strip
      else
        "財務状況の詳細な分析が必要です。"
      end
    end

    def extract_priority_issues(content)
      issues = []
      if issues_section = content[/優先的に対処すべき課題[:：]?\s*(.+?)(?=短期的|$)/m]
        issues = issues_section.scan(/\d+\.\s*(.+)/).flatten
      end
      issues
    end

    def extract_short_term_actions(content)
      actions = []
      if actions_section = content[/短期的改善策[:：]?\s*(.+?)(?=中長期|$)/m]
        actions = actions_section.scan(/\d+\.\s*(.+)/).flatten
      end
      actions
    end

    def extract_long_term_strategy(content)
      strategies = []
      if strategy_section = content[/中長期的戦略[:：]?\s*(.+?)(?=具体的|$)/m]
        strategies = strategy_section.scan(/\d+\.\s*(.+)/).flatten
      end
      strategies
    end

    def extract_action_plan(content)
      actions = []
      if plan_section = content[/アクションプラン[:：]?\s*(.+?)$/m]
        actions = plan_section.scan(/\d+\.\s*(.+)/).map do |action|
          priority = 'medium'
          priority = 'high' if action[0].include?('即') || action[0].include?('緊急')
          priority = 'low' if action[0].include?('検討') || action[0].include?('将来')
          
          { action: action[0], priority: priority }
        end
      end
      actions
    end

    def extract_revenue_budget(content)
      budget = {}
      if budget_section = content[/収入予算[:：]?\s*(.+?)(?=支出予算|$)/m]
        budget_section.scan(/(\w+)[:：]\s*([\d,]+)円/).each do |category, amount|
          budget[category] = amount.delete(',').to_i
        end
      end
      budget
    end

    def extract_expense_budget(content)
      budget = {}
      if budget_section = content[/支出予算[:：]?\s*(.+?)(?=投資予算|$)/m]
        budget_section.scan(/(\w+)[:：]\s*([\d,]+)円/).each do |category, amount|
          budget[category] = amount.delete(',').to_i
        end
      end
      budget
    end

    def extract_investment_budget(content)
      if match = content.match(/投資予算[:：]?\s*([\d,]+)円/)
        match[1].delete(',').to_i
      else
        0
      end
    end

    def extract_reserve_fund(content)
      if match = content.match(/予備費[:：]?\s*([\d,]+)円/)
        match[1].delete(',').to_i
      else
        0
      end
    end

    def extract_cash_flow_plan(content)
      plan = []
      if flow_section = content[/キャッシュフロー計画[:：]?\s*(.+?)(?=主要KPI|$)/m]
        plan = flow_section.scan(/\d+月[:：]\s*([\d,]+)円/).map do |amount|
          amount[0].delete(',').to_i
        end
      end
      plan
    end

    def extract_kpis(content)
      kpis = {}
      if kpi_section = content[/主要KPI[:：]?\s*(.+?)(?=リスク|$)/m]
        kpi_section.scan(/(\w+)[:：]\s*([\d.]+)/).each do |kpi, value|
          kpis[kpi] = value.to_f
        end
      end
      kpis
    end

    def extract_risk_plan(content)
      risks = []
      if risk_section = content[/リスク対応計画[:：]?\s*(.+?)$/m]
        risks = risk_section.scan(/\d+\.\s*(.+)/).flatten
      end
      risks
    end

    def extract_allocation(content)
      allocation = {}
      if alloc_section = content[/推奨投資配分[:：]?\s*(.+?)(?=優先順位|$)/m]
        alloc_section.scan(/(\w+)[:：]\s*([\d,]+)円/).each do |type, amount|
          allocation[type] = amount.delete(',').to_i
        end
      end
      allocation
    end

    def extract_prioritized_investments(content)
      investments = []
      if priority_section = content[/優先順位[:：]?\s*(.+?)(?=期待リターン|$)/m]
        investments = priority_section.scan(/\d+\.\s*(.+)/).flatten
      end
      investments
    end

    def extract_risk_return(content)
      analysis = {}
      if rr_section = content[/リスク評価[:：]?\s*(.+?)(?=実施スケジュール|$)/m]
        rr_section.scan(/(\w+).*?リスク[:：]\s*(\w+).*?リターン[:：]\s*([\d.]+)%/).each do |name, risk, return_rate|
          analysis[name] = { risk: risk, expected_return: return_rate.to_f }
        end
      end
      analysis
    end

    def extract_implementation_schedule(content)
      schedule = []
      if schedule_section = content[/実施スケジュール[:：]?\s*(.+?)(?=成功指標|$)/m]
        schedule = schedule_section.scan(/\d+\.\s*(.+)/).flatten
      end
      schedule
    end

    def extract_success_metrics(content)
      metrics = []
      if metrics_section = content[/成功指標[:：]?\s*(.+?)$/m]
        metrics = metrics_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      metrics
    end

    # Fallback methods
    def generate_fallback_advice(health)
      {
        summary: "現在の財務健全性スコアは#{health[:health_score]}/100です。",
        priority_issues: [
          health[:profit_margin] < 10 ? "利益率の改善（現在: #{health[:profit_margin]}%）" : nil,
          health[:current_ratio] < 1.0 ? "流動性の改善（現在の流動比率: #{health[:current_ratio]}）" : nil
        ].compact,
        short_term_actions: [
          "未収金の早期回収",
          "不要な支出の削減",
          "キャッシュフロー管理の強化"
        ],
        long_term_strategy: [
          "収入源の多様化",
          "コスト構造の最適化",
          "成長投資の計画的実行"
        ],
        action_plan: [
          { action: "財務レポートの月次作成", priority: "high" },
          { action: "予算管理プロセスの確立", priority: "high" },
          { action: "収益性分析の実施", priority: "medium" }
        ],
        metrics: {
          health_score: health[:health_score],
          profit_margin: health[:profit_margin],
          current_ratio: health[:current_ratio]
        }
      }
    end

    def default_budget_plan
      {
        revenue_budget: {},
        expense_budget: {},
        investment_budget: 0,
        reserve_fund: 0,
        cash_flow_plan: [],
        kpis: {},
        risk_plan: ["予算計画の詳細化にはさらなる分析が必要です"]
      }
    end

    def default_investment_recommendations
      {
        recommended_allocation: {},
        prioritized_investments: ["投資機会の詳細な評価が必要です"],
        risk_return_analysis: {},
        implementation_schedule: [],
        success_metrics: []
      }
    end
  end
end