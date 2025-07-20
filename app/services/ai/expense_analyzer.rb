# frozen_string_literal: true

module Ai
  class ExpenseAnalyzer < OpenAiClient
    def initialize(organization:)
      super()
      @organization = organization
    end

    def analyze_expense_patterns(period: 3.months)
      expenses = @organization.expenses
        .includes(:budget, :team, :venue)
        .where(expense_date: period.ago..Date.current)
      
      analysis = {
        total_spent: expenses.sum(:amount),
        expense_count: expenses.count,
        categories: analyze_by_category(expenses),
        trends: identify_trends(expenses),
        anomalies: detect_anomalies(expenses),
        correlations: find_correlations(expenses)
      }

      generate_ai_insights(analysis)
    end

    def identify_cost_reduction_opportunities
      recent_expenses = @organization.expenses.last(6.months)
      budgets = @organization.budgets.active
      
      opportunities = []
      
      # Analyze recurring expenses
      opportunities.concat(analyze_recurring_expenses(recent_expenses))
      
      # Find inefficient spending
      opportunities.concat(find_inefficient_spending(recent_expenses, budgets))
      
      # Identify consolidation opportunities
      opportunities.concat(find_consolidation_opportunities(recent_expenses))
      
      # Generate AI recommendations
      enhance_with_ai_recommendations(opportunities)
    end

    def predict_future_expenses(months_ahead: 3)
      historical_data = prepare_historical_data
      
      prompt = build_prediction_prompt(historical_data, months_ahead)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: prediction_system_prompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 1500
        }
      )

      parse_prediction_response(response)
    end

    def generate_expense_report(start_date:, end_date:)
      expenses = @organization.expenses
        .includes(:budget, :team, :venue)
        .where(expense_date: start_date..end_date)
      
      report_data = compile_report_data(expenses, start_date, end_date)
      
      prompt = build_report_prompt(report_data)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: report_system_prompt
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

      format_expense_report(response, report_data)
    end

    private

    def prediction_system_prompt
      <<~PROMPT
        あなたは財務予測の専門家です。
        過去のデータを分析し、将来の支出を高精度で予測します。
        
        予測を行う際は以下を考慮してください：
        1. 季節性要因
        2. トレンド
        3. 周期的パターン
        4. 外部要因（天候、経済状況など）
        5. 組織の成長率
        
        予測は具体的な数値と信頼区間を含めて日本語で提供してください。
      PROMPT
    end

    def report_system_prompt
      <<~PROMPT
        あなたは財務レポートの専門家です。
        支出データを分析し、経営陣が意思決定に使える洞察を日本語で提供します。
        
        レポートには以下を含めてください：
        1. エグゼクティブサマリー
        2. 主要な発見事項
        3. 改善提案
        4. リスク要因
        5. 次のアクション
      PROMPT
    end

    def analyze_by_category(expenses)
      categories = expenses.group_by(&:category)
      
      categories.transform_values do |category_expenses|
        amounts = category_expenses.map(&:amount)
        {
          total: amounts.sum,
          average: amounts.sum.to_f / amounts.size,
          count: amounts.size,
          percentage: (amounts.sum.to_f / expenses.sum(:amount) * 100).round(2),
          max: amounts.max,
          min: amounts.min,
          std_dev: calculate_std_dev(amounts)
        }
      end
    end

    def identify_trends(expenses)
      monthly_expenses = expenses.group_by { |e| e.expense_date.beginning_of_month }
        .transform_values { |exps| exps.sum(&:amount) }
      
      return {} if monthly_expenses.size < 2
      
      months = monthly_expenses.keys.sort
      amounts = months.map { |m| monthly_expenses[m] }
      
      {
        direction: calculate_trend_direction(amounts),
        growth_rate: calculate_growth_rate(amounts),
        forecast_next_month: forecast_next_value(amounts),
        volatility: calculate_volatility(amounts)
      }
    end

    def detect_anomalies(expenses)
      anomalies = []
      
      # Statistical anomalies
      expenses_by_category = expenses.group_by(&:category)
      expenses_by_category.each do |category, cat_expenses|
        amounts = cat_expenses.map(&:amount)
        mean = amounts.sum.to_f / amounts.size
        std_dev = calculate_std_dev(amounts)
        
        cat_expenses.each do |expense|
          z_score = std_dev.zero? ? 0 : (expense.amount - mean) / std_dev
          if z_score.abs > 2.5
            anomalies << {
              expense_id: expense.id,
              category: category,
              amount: expense.amount,
              z_score: z_score.round(2),
              type: 'statistical',
              severity: z_score.abs > 3 ? 'high' : 'medium'
            }
          end
        end
      end
      
      # Pattern anomalies
      anomalies.concat(detect_pattern_anomalies(expenses))
      
      anomalies
    end

    def find_correlations(expenses)
      correlations = {}
      
      # Time-based correlations
      by_day_of_week = expenses.group_by { |e| e.expense_date.wday }
        .transform_values { |exps| exps.sum(&:amount) }
      
      by_day_of_month = expenses.group_by { |e| e.expense_date.day }
        .transform_values { |exps| exps.sum(&:amount) }
      
      correlations[:day_of_week_pattern] = analyze_day_pattern(by_day_of_week)
      correlations[:day_of_month_pattern] = analyze_day_pattern(by_day_of_month)
      
      # Category correlations
      correlations[:category_relationships] = analyze_category_relationships(expenses)
      
      correlations
    end

    def analyze_recurring_expenses(expenses)
      opportunities = []
      
      # Group by name similarity
      expense_groups = group_by_similarity(expenses)
      
      expense_groups.each do |group_name, group_expenses|
        if group_expenses.size >= 3 # At least 3 occurrences
          amounts = group_expenses.map(&:amount)
          avg_amount = amounts.sum.to_f / amounts.size
          
          if calculate_std_dev(amounts) / avg_amount < 0.1 # Low variance
            opportunities << {
              type: 'recurring_expense',
              name: group_name,
              frequency: group_expenses.size,
              average_amount: avg_amount.round(2),
              total_impact: amounts.sum,
              recommendation: '定期契約や年間契約を検討することで、5-15%の削減が可能です。',
              priority: 'medium'
            }
          end
        end
      end
      
      opportunities
    end

    def find_inefficient_spending(expenses, budgets)
      opportunities = []
      
      # Over-budget categories
      budgets.each do |budget|
        if budget.utilization_rate > 100
          related_expenses = expenses.select { |e| e.budget_id == budget.id }
          
          opportunities << {
            type: 'over_budget',
            budget_name: budget.name,
            overage_amount: budget.spent_amount - budget.amount,
            overage_percentage: ((budget.utilization_rate - 100).round(2)),
            top_expenses: related_expenses.sort_by(&:amount).reverse.first(3).map(&:name),
            recommendation: '予算超過を防ぐため、承認プロセスの強化と代替案の検討が必要です。',
            priority: 'high'
          }
        end
      end
      
      # Inefficient timing
      opportunities.concat(analyze_timing_inefficiencies(expenses))
      
      opportunities
    end

    def find_consolidation_opportunities(expenses)
      opportunities = []
      
      # Multiple vendors for same category
      expenses_by_category = expenses.group_by(&:category)
      
      expenses_by_category.each do |category, cat_expenses|
        vendors = extract_vendors(cat_expenses)
        
        if vendors.size > 3
          opportunities << {
            type: 'vendor_consolidation',
            category: category,
            vendor_count: vendors.size,
            potential_savings: (cat_expenses.sum(&:amount) * 0.1).round(2),
            recommendation: 'ベンダーを統合することで、ボリュームディスカウントと管理コストの削減が可能です。',
            priority: 'medium'
          }
        end
      end
      
      # Same-day multiple expenses
      opportunities.concat(analyze_same_day_expenses(expenses))
      
      opportunities
    end

    def enhance_with_ai_recommendations(opportunities)
      return opportunities if opportunities.empty?
      
      prompt = build_enhancement_prompt(opportunities)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "あなたはコスト削減の専門家です。具体的で実行可能な提案を日本語で行います。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        }
      )
      
      enhanced_opportunities = parse_enhancement_response(response, opportunities)
      enhanced_opportunities.sort_by { |o| -o[:potential_savings].to_f }
    end

    def prepare_historical_data
      {
        monthly_totals: calculate_monthly_totals,
        category_trends: calculate_category_trends,
        seasonal_factors: calculate_seasonal_factors,
        growth_metrics: calculate_growth_metrics
      }
    end

    def calculate_monthly_totals
      @organization.expenses
        .group_by_month(:expense_date, last: 24)
        .sum(:amount)
    end

    def calculate_category_trends
      @organization.expenses
        .group_by_month(:expense_date, last: 12)
        .group(:category)
        .sum(:amount)
    end

    def calculate_seasonal_factors
      monthly_data = @organization.expenses
        .group_by_month(:expense_date, last: 36)
        .sum(:amount)
      
      seasonal_indices = {}
      (1..12).each do |month|
        month_values = monthly_data.select { |date, _| date.month == month }.values
        seasonal_indices[month] = if month_values.any?
          month_values.sum.to_f / month_values.size / (monthly_data.values.sum.to_f / monthly_data.size)
        else
          1.0
        end
      end
      
      seasonal_indices
    end

    def calculate_growth_metrics
      yearly_data = @organization.expenses
        .group_by_year(:expense_date, last: 3)
        .sum(:amount)
      
      return {} if yearly_data.size < 2
      
      years = yearly_data.keys.sort
      growth_rates = []
      
      years.each_cons(2) do |year1, year2|
        if yearly_data[year1] > 0
          growth_rate = (yearly_data[year2] - yearly_data[year1]) / yearly_data[year1].to_f * 100
          growth_rates << growth_rate
        end
      end
      
      {
        average_growth: growth_rates.sum.to_f / growth_rates.size,
        last_year_growth: growth_rates.last
      }
    end

    def build_prediction_prompt(historical_data, months_ahead)
      <<~PROMPT
        以下の過去のデータを基に、今後#{months_ahead}ヶ月の支出を予測してください。

        ## 月次支出総額（過去24ヶ月）
        #{historical_data[:monthly_totals].to_json}

        ## カテゴリ別トレンド（過去12ヶ月）
        #{historical_data[:category_trends].to_json}

        ## 季節性指数
        #{historical_data[:seasonal_factors].to_json}

        ## 成長指標
        #{historical_data[:growth_metrics].to_json}

        以下の形式で予測を提供してください：
        1. 月別予測金額（上限・中央値・下限）
        2. カテゴリ別予測
        3. 予測の根拠
        4. リスク要因
        5. 信頼度（％）
      PROMPT
    end

    def compile_report_data(expenses, start_date, end_date)
      {
        period: "#{start_date} 〜 #{end_date}",
        total_amount: expenses.sum(:amount),
        expense_count: expenses.count,
        by_category: expenses.group(:category).sum(:amount),
        by_team: expenses.joins(:team).group('teams.name').sum(:amount),
        by_payment_status: expenses.group(:payment_status).count,
        top_expenses: expenses.order(amount: :desc).limit(10),
        budget_performance: calculate_budget_performance_for_period(start_date, end_date),
        trends: analyze_period_trends(expenses),
        comparisons: compare_with_previous_period(expenses, start_date, end_date)
      }
    end

    def calculate_budget_performance_for_period(start_date, end_date)
      budgets = @organization.budgets
        .where('period_start <= ? AND period_end >= ?', end_date, start_date)
      
      budgets.map do |budget|
        period_expenses = budget.expenses.where(expense_date: start_date..end_date)
        {
          budget_name: budget.name,
          allocated: budget.amount,
          spent: period_expenses.sum(:amount),
          utilization: (period_expenses.sum(:amount) / budget.amount * 100).round(2)
        }
      end
    end

    def analyze_period_trends(expenses)
      return {} if expenses.empty?
      
      daily_amounts = expenses.group_by(&:expense_date)
        .transform_values { |exps| exps.sum(&:amount) }
      
      {
        peak_day: daily_amounts.max_by { |_, amount| amount }&.first,
        lowest_day: daily_amounts.min_by { |_, amount| amount }&.first,
        average_daily: daily_amounts.values.sum.to_f / daily_amounts.size,
        volatility: calculate_std_dev(daily_amounts.values)
      }
    end

    def compare_with_previous_period(expenses, start_date, end_date)
      period_length = (end_date - start_date).to_i
      previous_start = start_date - period_length.days
      previous_end = start_date - 1.day
      
      previous_expenses = @organization.expenses
        .where(expense_date: previous_start..previous_end)
      
      current_total = expenses.sum(:amount)
      previous_total = previous_expenses.sum(:amount)
      
      {
        previous_period: "#{previous_start} 〜 #{previous_end}",
        current_total: current_total,
        previous_total: previous_total,
        change_amount: current_total - previous_total,
        change_percentage: previous_total.zero? ? 0 : ((current_total - previous_total) / previous_total * 100).round(2)
      }
    end

    def build_report_prompt(report_data)
      <<~PROMPT
        以下の支出データを分析し、包括的なレポートを作成してください。

        ## レポート期間
        #{report_data[:period]}

        ## 支出サマリー
        総額: #{report_data[:total_amount]}円
        件数: #{report_data[:expense_count]}件

        ## カテゴリ別支出
        #{report_data[:by_category].to_json}

        ## 予算執行状況
        #{report_data[:budget_performance].to_json}

        ## 前期間との比較
        #{report_data[:comparisons].to_json}

        以下の構成でレポートを作成してください：
        1. エグゼクティブサマリー（3-5行）
        2. 主要な発見事項（3-5項目）
        3. 改善提案（3-5項目）
        4. リスクと注意点
        5. 推奨アクション（優先順位付き）
      PROMPT
    end

    def build_enhancement_prompt(opportunities)
      <<~PROMPT
        以下のコスト削減機会について、より具体的な実施方法と期待効果を提案してください。

        ## 識別されたコスト削減機会
        #{opportunities.map { |o| "- #{o[:type]}: #{o[:recommendation]}" }.join("\n")}

        各機会について以下を提供してください：
        1. 具体的な実施ステップ
        2. 必要なリソース
        3. 実施期間
        4. 期待される削減額（％）
        5. 潜在的なリスクと対策
      PROMPT
    end

    def generate_ai_insights(analysis)
      prompt = <<~PROMPT
        以下の支出分析結果から、重要な洞察と改善提案を生成してください。

        ## 分析結果
        #{analysis.to_json}

        以下の観点で洞察を提供してください：
        1. 最も注意が必要な支出パターン
        2. 即座に実行可能な改善策
        3. 中長期的な最適化戦略
        4. ベンチマークとの比較（推定）
        5. 予測されるリスク
      PROMPT
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "あなたは財務分析の専門家です。データから実用的な洞察を導き出し、具体的な改善提案を日本語で行います。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        }
      )
      
      parse_insights_response(response, analysis)
    end

    def parse_prediction_response(response)
      content = response.dig("choices", 0, "message", "content")
      return default_prediction unless content
      
      {
        monthly_predictions: extract_monthly_predictions(content),
        category_predictions: extract_category_predictions(content),
        confidence_score: extract_confidence_score(content),
        risk_factors: extract_risk_factors(content),
        recommendations: extract_recommendations(content)
      }
    end

    def parse_enhancement_response(response, original_opportunities)
      content = response.dig("choices", 0, "message", "content")
      return original_opportunities unless content
      
      enhanced = original_opportunities.map do |opportunity|
        opportunity.merge(
          implementation_steps: extract_implementation_steps(content, opportunity[:type]),
          expected_savings_percentage: extract_savings_percentage(content, opportunity[:type]),
          timeline: extract_timeline(content, opportunity[:type]),
          risks: extract_risks(content, opportunity[:type])
        )
      end
      
      enhanced
    end

    def parse_insights_response(response, analysis)
      content = response.dig("choices", 0, "message", "content")
      return default_insights(analysis) unless content
      
      {
        key_insights: extract_key_insights(content),
        immediate_actions: extract_immediate_actions(content),
        long_term_strategy: extract_long_term_strategy(content),
        risk_assessment: extract_risk_assessment(content),
        savings_potential: calculate_total_savings_potential(analysis)
      }
    end

    def format_expense_report(response, report_data)
      content = response.dig("choices", 0, "message", "content")
      return default_report(report_data) unless content
      
      {
        executive_summary: extract_executive_summary(content),
        key_findings: extract_key_findings(content),
        recommendations: extract_report_recommendations(content),
        risks: extract_report_risks(content),
        action_items: extract_action_items(content),
        data: report_data
      }
    end

    # Helper methods
    def calculate_std_dev(values)
      return 0 if values.empty? || values.size == 1
      
      mean = values.sum.to_f / values.size
      variance = values.map { |v| (v - mean) ** 2 }.sum / values.size
      Math.sqrt(variance)
    end

    def calculate_trend_direction(amounts)
      return 'stable' if amounts.size < 2
      
      first_half = amounts.first(amounts.size / 2).sum.to_f / (amounts.size / 2)
      second_half = amounts.last(amounts.size / 2).sum.to_f / (amounts.size / 2)
      
      change = ((second_half - first_half) / first_half * 100).round(2)
      
      case change
      when -Float::INFINITY..-5 then 'decreasing'
      when -5..5 then 'stable'
      when 5..Float::INFINITY then 'increasing'
      end
    end

    def calculate_growth_rate(amounts)
      return 0 if amounts.size < 2 || amounts.first.zero?
      
      ((amounts.last - amounts.first) / amounts.first.to_f * 100).round(2)
    end

    def forecast_next_value(amounts)
      return amounts.last if amounts.size < 2
      
      # Simple linear regression
      n = amounts.size
      x = (0...n).to_a
      y = amounts
      
      x_mean = x.sum.to_f / n
      y_mean = y.sum.to_f / n
      
      numerator = x.zip(y).map { |xi, yi| (xi - x_mean) * (yi - y_mean) }.sum
      denominator = x.map { |xi| (xi - x_mean) ** 2 }.sum
      
      return y_mean if denominator.zero?
      
      slope = numerator / denominator
      intercept = y_mean - slope * x_mean
      
      (slope * n + intercept).round(2)
    end

    def calculate_volatility(amounts)
      return 0 if amounts.empty? || amounts.sum.zero?
      
      std_dev = calculate_std_dev(amounts)
      mean = amounts.sum.to_f / amounts.size
      
      (std_dev / mean * 100).round(2)
    end

    def detect_pattern_anomalies(expenses)
      anomalies = []
      
      # Weekend expenses
      weekend_expenses = expenses.select { |e| [0, 6].include?(e.expense_date.wday) }
      if weekend_expenses.any? && weekend_expenses.sum(&:amount) > expenses.sum(:amount) * 0.3
        anomalies << {
          type: 'unusual_weekend_spending',
          amount: weekend_expenses.sum(&:amount),
          percentage: (weekend_expenses.sum(&:amount).to_f / expenses.sum(:amount) * 100).round(2),
          severity: 'medium'
        }
      end
      
      # Duplicate expenses
      same_day_groups = expenses.group_by { |e| [e.expense_date, e.category, e.amount] }
      same_day_groups.each do |(date, category, amount), group|
        if group.size > 1
          anomalies << {
            type: 'potential_duplicate',
            date: date,
            category: category,
            amount: amount,
            count: group.size,
            severity: 'high'
          }
        end
      end
      
      anomalies
    end

    def analyze_day_pattern(day_data)
      return {} if day_data.empty?
      
      total = day_data.values.sum
      average = total.to_f / day_data.size
      
      patterns = day_data.transform_values do |amount|
        {
          amount: amount,
          percentage: (amount.to_f / total * 100).round(2),
          deviation: ((amount - average) / average * 100).round(2)
        }
      end
      
      {
        patterns: patterns,
        peak_days: patterns.select { |_, v| v[:deviation] > 50 }.keys,
        low_days: patterns.select { |_, v| v[:deviation] < -50 }.keys
      }
    end

    def analyze_category_relationships(expenses)
      categories = expenses.map(&:category).uniq
      relationships = {}
      
      categories.combination(2).each do |cat1, cat2|
        cat1_expenses = expenses.select { |e| e.category == cat1 }
        cat2_expenses = expenses.select { |e| e.category == cat2 }
        
        # Check if expenses often occur on same days
        cat1_dates = cat1_expenses.map(&:expense_date)
        cat2_dates = cat2_expenses.map(&:expense_date)
        
        common_dates = cat1_dates & cat2_dates
        if common_dates.size > [cat1_dates.size, cat2_dates.size].min * 0.3
          relationships["#{cat1}_#{cat2}"] = {
            correlation_strength: (common_dates.size.to_f / [cat1_dates.size, cat2_dates.size].min).round(2),
            common_occurrences: common_dates.size
          }
        end
      end
      
      relationships
    end

    def group_by_similarity(expenses)
      groups = {}
      
      expenses.each do |expense|
        matched = false
        
        groups.each do |group_name, group_expenses|
          if similar_expense_name?(expense.name, group_name)
            group_expenses << expense
            matched = true
            break
          end
        end
        
        unless matched
          groups[expense.name] = [expense]
        end
      end
      
      groups
    end

    def similar_expense_name?(name1, name2)
      return false if name1.nil? || name2.nil?
      
      # Normalize names
      normalized1 = name1.downcase.gsub(/[^a-z0-9]/, '')
      normalized2 = name2.downcase.gsub(/[^a-z0-9]/, '')
      
      # Check exact match after normalization
      return true if normalized1 == normalized2
      
      # Check if one contains the other
      return true if normalized1.include?(normalized2) || normalized2.include?(normalized1)
      
      # Calculate similarity
      similarity = calculate_string_similarity(normalized1, normalized2)
      similarity > 0.8
    end

    def calculate_string_similarity(str1, str2)
      longer = [str1.length, str2.length].max
      return 0.0 if longer.zero?
      
      edit_distance = levenshtein_distance(str1, str2)
      (longer - edit_distance) / longer.to_f
    end

    def levenshtein_distance(str1, str2)
      m = str1.length
      n = str2.length
      return m if n.zero?
      return n if m.zero?
      
      d = Array.new(m + 1) { Array.new(n + 1) }
      
      (0..m).each { |i| d[i][0] = i }
      (0..n).each { |j| d[0][j] = j }
      
      (1..n).each do |j|
        (1..m).each do |i|
          cost = str1[i - 1] == str2[j - 1] ? 0 : 1
          d[i][j] = [
            d[i - 1][j] + 1,
            d[i][j - 1] + 1,
            d[i - 1][j - 1] + cost
          ].min
        end
      end
      
      d[m][n]
    end

    def analyze_timing_inefficiencies(expenses)
      opportunities = []
      
      # Late payments incurring penalties
      late_expenses = expenses.select { |e| e.payment_status == 'pending' && e.expense_date < 30.days.ago }
      if late_expenses.any?
        opportunities << {
          type: 'late_payment_risk',
          count: late_expenses.size,
          total_amount: late_expenses.sum(&:amount),
          oldest_date: late_expenses.min_by(&:expense_date).expense_date,
          recommendation: '支払い遅延により、遅延損害金や信用低下のリスクがあります。支払いプロセスの自動化を検討してください。',
          priority: 'high'
        }
      end
      
      # Early payment discounts missed
      expenses_by_vendor = group_by_vendor(expenses)
      expenses_by_vendor.each do |vendor, vendor_expenses|
        if vendor_expenses.size > 5
          opportunities << {
            type: 'early_payment_opportunity',
            vendor: vendor,
            transaction_count: vendor_expenses.size,
            total_amount: vendor_expenses.sum(&:amount),
            potential_discount: (vendor_expenses.sum(&:amount) * 0.02).round(2),
            recommendation: '早期支払い割引の交渉により、2-3%の削減が可能な場合があります。',
            priority: 'medium'
          }
        end
      end
      
      opportunities
    end

    def extract_vendors(expenses)
      # Extract vendor names from expense descriptions or names
      vendors = expenses.map do |expense|
        # Simple extraction - could be enhanced with NLP
        expense.name.split(/[（(]/).first.strip
      end.uniq
      
      vendors
    end

    def group_by_vendor(expenses)
      expenses.group_by { |e| extract_vendor_name(e) }
    end

    def extract_vendor_name(expense)
      # Simple vendor extraction - in production, this could use NLP or regex patterns
      expense.name.split(/[（(－-]/).first.strip
    end

    def analyze_same_day_expenses(expenses)
      opportunities = []
      
      expenses_by_date = expenses.group_by(&:expense_date)
      
      expenses_by_date.each do |date, day_expenses|
        if day_expenses.size > 5
          categories = day_expenses.map(&:category).uniq
          if categories.size == 1 # Multiple expenses in same category on same day
            opportunities << {
              type: 'same_day_consolidation',
              date: date,
              category: categories.first,
              transaction_count: day_expenses.size,
              total_amount: day_expenses.sum(&:amount),
              potential_savings: (day_expenses.sum(&:amount) * 0.05).round(2),
              recommendation: '同日の複数取引を統合することで、処理コストと手数料を削減できます。',
              priority: 'low'
            }
          end
        end
      end
      
      opportunities
    end

    # Extraction helper methods
    def extract_monthly_predictions(content)
      # Extract prediction data from AI response
      predictions = {}
      content.scan(/(\d+)月.*?([\d,]+)円/).each do |month, amount|
        predictions[month.to_i] = amount.delete(',').to_i
      end
      predictions
    end

    def extract_category_predictions(content)
      # Extract category predictions
      predictions = {}
      Budget::CATEGORIES.each do |category|
        if match = content.match(/#{category}.*?([\d,]+)円/)
          predictions[category] = match[1].delete(',').to_i
        end
      end
      predictions
    end

    def extract_confidence_score(content)
      if match = content.match(/信頼度.*?(\d+)%/)
        match[1].to_i
      else
        75 # Default confidence
      end
    end

    def extract_risk_factors(content)
      risks = []
      if risk_section = content[/リスク要因.*?(?=\n\n|$)/m]
        risks = risk_section.scan(/\d+\.\s*(.+)/).flatten
      end
      risks
    end

    def extract_recommendations(content)
      recommendations = []
      if rec_section = content[/推奨.*?(?=\n\n|$)/m]
        recommendations = rec_section.scan(/\d+\.\s*(.+)/).flatten
      end
      recommendations
    end

    def extract_implementation_steps(content, type)
      # Extract steps for specific opportunity type
      steps = []
      if section = content[/#{type}.*?実施ステップ.*?(?=\n\n|$)/m]
        steps = section.scan(/\d+\.\s*(.+)/).flatten
      end
      steps
    end

    def extract_savings_percentage(content, type)
      if match = content.match(/#{type}.*?(\d+)%.*?削減/)
        match[1].to_i
      else
        5 # Default savings estimate
      end
    end

    def extract_timeline(content, type)
      if match = content.match(/#{type}.*?(\d+)[週月]/)
        duration = match[1].to_i
        unit = match[0].include?('週') ? 'weeks' : 'months'
        "#{duration} #{unit}"
      else
        '1-3 months'
      end
    end

    def extract_risks(content, type)
      risks = []
      if risk_section = content[/#{type}.*?リスク.*?(?=\n\n|$)/m]
        risks = risk_section.scan(/・\s*(.+)/).flatten
      end
      risks
    end

    def extract_key_insights(content)
      insights = []
      if insight_section = content[/注意が必要.*?(?=\n\n|$)/m]
        insights = insight_section.scan(/\d+\.\s*(.+)/).flatten
      end
      insights
    end

    def extract_immediate_actions(content)
      actions = []
      if action_section = content[/即座に実行可能.*?(?=\n\n|$)/m]
        actions = action_section.scan(/\d+\.\s*(.+)/).flatten
      end
      actions
    end

    def extract_long_term_strategy(content)
      strategies = []
      if strategy_section = content[/中長期.*?(?=\n\n|$)/m]
        strategies = strategy_section.scan(/\d+\.\s*(.+)/).flatten
      end
      strategies
    end

    def extract_risk_assessment(content)
      if match = content.match(/リスク.*?(高|中|低)/)
        match[1]
      else
        'medium'
      end
    end

    def extract_executive_summary(content)
      if summary = content[/エグゼクティブサマリー.*?\n\n/m]
        summary.gsub(/エグゼクティブサマリー[:：]\s*/, '').strip
      else
        ''
      end
    end

    def extract_key_findings(content)
      findings = []
      if findings_section = content[/主要な発見事項.*?(?=\n\n|$)/m]
        findings = findings_section.scan(/\d+\.\s*(.+)/).flatten
      end
      findings
    end

    def extract_report_recommendations(content)
      recommendations = []
      if rec_section = content[/改善提案.*?(?=\n\n|$)/m]
        recommendations = rec_section.scan(/\d+\.\s*(.+)/).flatten
      end
      recommendations
    end

    def extract_report_risks(content)
      risks = []
      if risk_section = content[/リスクと注意点.*?(?=\n\n|$)/m]
        risks = risk_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      risks
    end

    def extract_action_items(content)
      items = []
      if action_section = content[/推奨アクション.*?$/m]
        items = action_section.scan(/\d+\.\s*(.+)/).map do |item|
          priority = 'medium'
          priority = 'high' if item[0].include?('緊急') || item[0].include?('即')
          priority = 'low' if item[0].include?('検討') || item[0].include?('将来')
          
          {
            action: item[0],
            priority: priority
          }
        end
      end
      items
    end

    def calculate_total_savings_potential(analysis)
      base_amount = analysis[:total_spent]
      
      # Estimate savings based on findings
      savings = 0
      
      # Anomaly-based savings (2-5%)
      if analysis[:anomalies].any?
        savings += base_amount * 0.03
      end
      
      # Efficiency improvements (1-3%)
      efficiency = analysis[:correlations][:category_relationships].size
      if efficiency > 0
        savings += base_amount * 0.02
      end
      
      savings.round(2)
    end

    # Default fallback methods
    def default_prediction
      {
        monthly_predictions: {},
        category_predictions: {},
        confidence_score: 50,
        risk_factors: ['予測に十分なデータがありません'],
        recommendations: ['より多くのデータを収集してください']
      }
    end

    def default_insights(analysis)
      {
        key_insights: [
          "総支出: #{analysis[:total_spent]}円",
          "支出件数: #{analysis[:expense_count]}件"
        ],
        immediate_actions: ['支出の承認プロセスを確認してください'],
        long_term_strategy: ['予算管理システムの導入を検討してください'],
        risk_assessment: 'medium',
        savings_potential: 0
      }
    end

    def default_report(data)
      {
        executive_summary: "期間中の総支出は#{data[:total_amount]}円でした。",
        key_findings: ['詳細な分析には追加データが必要です'],
        recommendations: ['定期的な支出レビューを実施してください'],
        risks: ['データ不足により完全な分析ができません'],
        action_items: [{ action: 'データ収集の改善', priority: 'high' }],
        data: data
      }
    end
  end
end