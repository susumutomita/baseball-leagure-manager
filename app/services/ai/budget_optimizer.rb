# frozen_string_literal: true

module Ai
  class BudgetOptimizer < OpenAiClient
    def initialize(organization:)
      super()
      @organization = organization
    end

    def optimize_budget_allocation(budget_period_start:, budget_period_end:)
      historical_data = gather_historical_data
      current_budgets = @organization.budgets.for_current_period
      
      prompt = build_optimization_prompt(
        historical_data: historical_data,
        current_budgets: current_budgets,
        period_start: budget_period_start,
        period_end: budget_period_end
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: system_prompt
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

      parse_optimization_response(response)
    rescue StandardError => e
      Rails.logger.error "Budget optimization failed: #{e.message}"
      fallback_optimization
    end

    def analyze_spending_patterns
      expenses = @organization.expenses.includes(:budget).last(6.months)
      
      patterns = {
        by_category: analyze_category_spending(expenses),
        by_time: analyze_temporal_patterns(expenses),
        anomalies: detect_spending_anomalies(expenses),
        efficiency_score: calculate_efficiency_score(expenses)
      }

      generate_spending_insights(patterns)
    end

    def recommend_cost_savings
      current_expenses = @organization.expenses.last(3.months)
      budgets = @organization.budgets.active
      
      opportunities = identify_saving_opportunities(current_expenses, budgets)
      
      prompt = build_savings_prompt(opportunities)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: cost_saving_system_prompt
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

      format_savings_recommendations(response)
    end

    private

    def system_prompt
      <<~PROMPT
        あなたは野球リーグの財務アドバイザーです。
        予算配分の最適化、コスト削減、収益向上のための具体的で実行可能な提案を日本語で行います。
        
        提案する際は以下の点を考慮してください：
        1. リーグ運営の継続性と品質維持
        2. チーム間の公平性
        3. 選手と観客の満足度
        4. 長期的な財務健全性
        5. リスク管理
        
        数値は具体的に示し、実装可能な行動計画を含めてください。
      PROMPT
    end

    def cost_saving_system_prompt
      <<~PROMPT
        あなたは野球リーグのコスト削減専門家です。
        品質を維持しながら支出を最適化する方法を日本語で提案します。
        
        以下の観点から分析してください：
        1. 無駄な支出の特定
        2. 効率化による削減機会
        3. 代替案の提示
        4. 実装の優先順位
        5. 期待される削減額
        
        各提案には具体的な数値と実行手順を含めてください。
      PROMPT
    end

    def build_optimization_prompt(historical_data:, current_budgets:, period_start:, period_end:)
      <<~PROMPT
        以下のデータを基に、#{period_start}から#{period_end}までの予算配分を最適化してください。

        ## 過去のデータ
        #{historical_data.to_json}

        ## 現在の予算配分
        #{current_budgets.map { |b| budget_summary(b) }.join("\n")}

        ## 最適化の目標
        1. 支出効率の向上（無駄の削減）
        2. 収益機会の最大化
        3. リスクの最小化
        4. チーム満足度の維持・向上

        以下の形式で回答してください：
        1. 推奨予算配分（カテゴリ別）
        2. 配分の根拠
        3. 期待される効果
        4. 実装のタイムライン
        5. リスクと対策
      PROMPT
    end

    def build_savings_prompt(opportunities)
      <<~PROMPT
        以下の支出削減機会を分析し、具体的な削減計画を立ててください。

        ## 削減機会
        #{opportunities.to_json}

        ## 制約条件
        - リーグの品質は維持する
        - 安全性に妥協しない
        - チームの公平性を保つ

        以下の形式で削減案を提示してください：
        1. 削減項目と金額
        2. 実装方法
        3. 影響評価
        4. 代替案
        5. 実施スケジュール
      PROMPT
    end

    def gather_historical_data
      {
        revenue_trends: calculate_revenue_trends,
        expense_trends: calculate_expense_trends,
        budget_performance: analyze_budget_performance,
        seasonal_patterns: identify_seasonal_patterns
      }
    end

    def calculate_revenue_trends
      @organization.revenues
        .group_by_month(:revenue_date, last: 12)
        .group(:revenue_type)
        .sum(:amount)
    end

    def calculate_expense_trends
      @organization.expenses
        .group_by_month(:expense_date, last: 12)
        .group(:category)
        .sum(:amount)
    end

    def analyze_budget_performance
      @organization.budgets.includes(:expenses, :revenues).map do |budget|
        {
          name: budget.name,
          allocated: budget.amount,
          spent: budget.spent_amount,
          revenue: budget.revenue_amount,
          efficiency: budget.utilization_rate
        }
      end
    end

    def identify_seasonal_patterns
      monthly_data = @organization.expenses
        .group_by_month(:expense_date, last: 24)
        .sum(:amount)
      
      # Simple seasonal analysis
      monthly_averages = {}
      (1..12).each do |month|
        month_values = monthly_data.select { |date, _| date.month == month }.values
        monthly_averages[month] = month_values.sum.to_f / month_values.size
      end
      
      monthly_averages
    end

    def analyze_category_spending(expenses)
      expenses.group_by(&:category).transform_values do |category_expenses|
        {
          total: category_expenses.sum(&:amount),
          average: category_expenses.sum(&:amount) / category_expenses.size,
          count: category_expenses.size,
          trend: calculate_trend(category_expenses)
        }
      end
    end

    def analyze_temporal_patterns(expenses)
      {
        by_month: expenses.group_by { |e| e.expense_date.beginning_of_month },
        by_day_of_week: expenses.group_by { |e| e.expense_date.wday },
        peak_periods: identify_peak_spending_periods(expenses)
      }
    end

    def detect_spending_anomalies(expenses)
      expenses_by_category = expenses.group_by(&:category)
      
      anomalies = []
      expenses_by_category.each do |category, category_expenses|
        amounts = category_expenses.map(&:amount)
        mean = amounts.sum.to_f / amounts.size
        std_dev = Math.sqrt(amounts.map { |a| (a - mean) ** 2 }.sum / amounts.size)
        
        category_expenses.each do |expense|
          z_score = (expense.amount - mean) / std_dev
          if z_score.abs > 2
            anomalies << {
              expense: expense,
              z_score: z_score,
              category: category
            }
          end
        end
      end
      
      anomalies
    end

    def calculate_efficiency_score(expenses)
      total_budget = @organization.budgets.active.sum(:amount)
      total_spent = expenses.sum(&:amount)
      revenue_generated = @organization.revenues.where(
        revenue_date: expenses.first.expense_date..expenses.last.expense_date
      ).sum(:amount)
      
      return 0 if total_spent.zero?
      
      roi = (revenue_generated - total_spent) / total_spent * 100
      utilization = total_spent / total_budget * 100 if total_budget > 0
      
      {
        roi: roi.round(2),
        utilization: utilization&.round(2) || 0,
        overall_score: calculate_overall_efficiency(roi, utilization)
      }
    end

    def calculate_overall_efficiency(roi, utilization)
      return 0 if roi.nil? || utilization.nil?
      
      # Weighted score: 60% ROI, 40% utilization
      score = (roi * 0.6 + (100 - (utilization - 80).abs) * 0.4)
      score.clamp(0, 100).round(2)
    end

    def identify_saving_opportunities(expenses, budgets)
      opportunities = []
      
      # Analyze over-budget categories
      budgets.each do |budget|
        if budget.utilization_rate > 90
          opportunities << {
            type: 'over_budget',
            category: budget.category,
            amount: budget.spent_amount - budget.amount,
            suggestion: 'Review and reduce spending'
          }
        end
      end
      
      # Find duplicate or similar expenses
      similar_expenses = find_similar_expenses(expenses)
      opportunities.concat(similar_expenses)
      
      # Identify seasonal optimization opportunities
      seasonal_opportunities = find_seasonal_optimizations(expenses)
      opportunities.concat(seasonal_opportunities)
      
      opportunities
    end

    def find_similar_expenses(expenses)
      opportunities = []
      expenses_by_date = expenses.group_by(&:expense_date)
      
      expenses_by_date.each do |date, day_expenses|
        day_expenses.combination(2).each do |exp1, exp2|
          if similar_expense?(exp1, exp2)
            opportunities << {
              type: 'potential_duplicate',
              expenses: [exp1.id, exp2.id],
              amount: [exp1.amount, exp2.amount].min,
              suggestion: 'Review for potential consolidation'
            }
          end
        end
      end
      
      opportunities
    end

    def similar_expense?(exp1, exp2)
      return false if exp1.category != exp2.category
      
      name_similarity = calculate_string_similarity(exp1.name, exp2.name)
      amount_similarity = 1 - (exp1.amount - exp2.amount).abs / [exp1.amount, exp2.amount].max
      
      name_similarity > 0.8 || (name_similarity > 0.6 && amount_similarity > 0.9)
    end

    def calculate_string_similarity(str1, str2)
      longer = [str1.length, str2.length].max
      return 0.0 if longer.zero?
      
      edit_distance = levenshtein_distance(str1.downcase, str2.downcase)
      (longer - edit_distance) / longer.to_f
    end

    def levenshtein_distance(str1, str2)
      matrix = Array.new(str1.length + 1) { Array.new(str2.length + 1) }
      
      (0..str1.length).each { |i| matrix[i][0] = i }
      (0..str2.length).each { |j| matrix[0][j] = j }
      
      (1..str1.length).each do |i|
        (1..str2.length).each do |j|
          cost = str1[i - 1] == str2[j - 1] ? 0 : 1
          matrix[i][j] = [
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          ].min
        end
      end
      
      matrix[str1.length][str2.length]
    end

    def find_seasonal_optimizations(expenses)
      # Group by month and category
      monthly_category_spending = expenses.group_by { |e| 
        [e.expense_date.month, e.category] 
      }.transform_values { |exps| 
        exps.sum(&:amount) 
      }
      
      opportunities = []
      
      # Find categories with high seasonal variance
      Budget::CATEGORIES.each do |category|
        monthly_amounts = (1..12).map { |month| 
          monthly_category_spending[[month, category]] || 0 
        }
        
        variance = calculate_variance(monthly_amounts)
        if variance > 0.3 # High variance threshold
          opportunities << {
            type: 'seasonal_optimization',
            category: category,
            variance: variance,
            peak_months: identify_peak_months(monthly_amounts),
            suggestion: 'Consider seasonal contracts or bulk purchasing'
          }
        end
      end
      
      opportunities
    end

    def calculate_variance(amounts)
      return 0 if amounts.empty? || amounts.all?(&:zero?)
      
      mean = amounts.sum.to_f / amounts.size
      variance = amounts.map { |a| (a - mean) ** 2 }.sum / amounts.size
      std_dev = Math.sqrt(variance)
      
      std_dev / mean # Coefficient of variation
    end

    def identify_peak_months(monthly_amounts)
      mean = monthly_amounts.sum.to_f / monthly_amounts.size
      monthly_amounts.each_with_index
        .select { |amount, _| amount > mean * 1.5 }
        .map { |_, index| index + 1 }
    end

    def calculate_trend(expenses)
      return 'stable' if expenses.size < 3
      
      sorted_expenses = expenses.sort_by(&:expense_date)
      recent = sorted_expenses.last(3).sum(&:amount) / 3
      previous = sorted_expenses.first(3).sum(&:amount) / 3
      
      change_rate = (recent - previous) / previous * 100
      
      case change_rate
      when -Float::INFINITY..-10 then 'decreasing'
      when -10..10 then 'stable'
      when 10..Float::INFINITY then 'increasing'
      end
    end

    def identify_peak_spending_periods(expenses)
      daily_spending = expenses.group_by(&:expense_date)
        .transform_values { |exps| exps.sum(&:amount) }
      
      threshold = daily_spending.values.sum.to_f / daily_spending.size * 1.5
      
      daily_spending.select { |_, amount| amount > threshold }.keys
    end

    def generate_spending_insights(patterns)
      insights = []
      
      # Category insights
      patterns[:by_category].each do |category, data|
        if data[:trend] == 'increasing' && data[:total] > 10000
          insights << {
            type: 'trend_alert',
            category: category,
            message: "#{category}の支出が増加傾向にあります。予算の見直しを検討してください。",
            severity: 'medium'
          }
        end
      end
      
      # Anomaly insights
      if patterns[:anomalies].any?
        insights << {
          type: 'anomaly_detected',
          count: patterns[:anomalies].size,
          message: "通常と異なる支出パターンを#{patterns[:anomalies].size}件検出しました。",
          severity: 'high'
        }
      end
      
      # Efficiency insights
      efficiency = patterns[:efficiency_score]
      if efficiency[:roi] < 0
        insights << {
          type: 'negative_roi',
          roi: efficiency[:roi],
          message: "投資収益率がマイナスです。収入源の拡大または支出削減が必要です。",
          severity: 'critical'
        }
      end
      
      insights
    end

    def parse_optimization_response(response)
      content = response.dig("choices", 0, "message", "content")
      return fallback_optimization unless content
      
      {
        recommendations: extract_recommendations(content),
        allocation_plan: extract_allocation_plan(content),
        expected_savings: extract_expected_savings(content),
        implementation_timeline: extract_timeline(content),
        risk_assessment: extract_risks(content)
      }
    end

    def extract_recommendations(content)
      # Extract recommendations section
      recommendations_section = content[/推奨予算配分.*?(?=配分の根拠|$)/m]
      return [] unless recommendations_section
      
      recommendations_section.scan(/\d+\.\s*(.+)/).map(&:first)
    end

    def extract_allocation_plan(content)
      # Extract allocation amounts
      allocations = {}
      content.scan(/(\w+)[:：]\s*([\d,]+)円/).each do |category, amount|
        allocations[category] = amount.delete(',').to_i
      end
      allocations
    end

    def extract_expected_savings(content)
      # Extract savings amount
      savings_match = content.match(/削減.*?([\d,]+)円/)
      savings_match ? savings_match[1].delete(',').to_i : 0
    end

    def extract_timeline(content)
      # Extract timeline items
      timeline_section = content[/実装のタイムライン.*?(?=リスク|$)/m]
      return [] unless timeline_section
      
      timeline_section.scan(/\d+\.\s*(.+)/).map(&:first)
    end

    def extract_risks(content)
      # Extract risk items
      risk_section = content[/リスクと対策.*?$/m]
      return [] unless risk_section
      
      risk_section.scan(/\d+\.\s*(.+)/).map(&:first)
    end

    def format_savings_recommendations(response)
      content = response.dig("choices", 0, "message", "content")
      return [] unless content
      
      recommendations = []
      
      # Parse structured recommendations
      content.scan(/削減項目[:：]\s*(.+?)\n.*?金額[:：]\s*([\d,]+)円.*?実装方法[:：]\s*(.+?)(?=削減項目|$)/m).each do |item, amount, method|
        recommendations << {
          item: item.strip,
          amount: amount.delete(',').to_i,
          method: method.strip,
          priority: determine_priority(amount.delete(',').to_i),
          difficulty: estimate_difficulty(method)
        }
      end
      
      recommendations.sort_by { |r| -r[:amount] }
    end

    def determine_priority(amount)
      case amount
      when 0..10000 then 'low'
      when 10001..50000 then 'medium'
      else 'high'
      end
    end

    def estimate_difficulty(method)
      case method
      when /契約.*?見直し|交渉/ then 'medium'
      when /システム|自動化/ then 'high'
      else 'low'
      end
    end

    def budget_summary(budget)
      <<~SUMMARY
        予算名: #{budget.name}
        種別: #{budget.budget_type}
        金額: #{budget.amount}円
        使用率: #{budget.utilization_rate}%
        残額: #{budget.remaining_amount}円
      SUMMARY
    end

    def fallback_optimization
      {
        recommendations: [
          "現在の支出パターンを継続的に監視してください",
          "カテゴリー別の予算上限を設定することを推奨します",
          "四半期ごとに予算の見直しを行ってください"
        ],
        allocation_plan: generate_default_allocation,
        expected_savings: 0,
        implementation_timeline: ["即時実行可能"],
        risk_assessment: ["大きなリスクは検出されていません"]
      }
    end

    def generate_default_allocation
      total_budget = @organization.budgets.active.sum(:amount)
      
      {
        "venue_rental" => (total_budget * 0.3).to_i,
        "referee_fees" => (total_budget * 0.2).to_i,
        "equipment" => (total_budget * 0.1).to_i,
        "administrative" => (total_budget * 0.15).to_i,
        "insurance" => (total_budget * 0.1).to_i,
        "marketing" => (total_budget * 0.05).to_i,
        "miscellaneous" => (total_budget * 0.1).to_i
      }
    end
  end
end