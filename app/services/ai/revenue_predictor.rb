# frozen_string_literal: true

module Ai
  class RevenuePredictor < OpenAiClient
    def initialize(organization:)
      super()
      @organization = organization
    end

    def predict_revenue(period_start:, period_end:)
      historical_data = gather_revenue_history
      external_factors = analyze_external_factors
      
      prompt = build_prediction_prompt(
        historical_data: historical_data,
        external_factors: external_factors,
        period_start: period_start,
        period_end: period_end
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: revenue_prediction_system_prompt
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

      parse_revenue_prediction(response)
    rescue StandardError => e
      Rails.logger.error "Revenue prediction failed: #{e.message}"
      fallback_prediction(period_start, period_end)
    end

    def identify_growth_opportunities
      current_revenue = analyze_current_revenue_streams
      market_analysis = perform_market_analysis
      competitor_data = estimate_competitor_performance
      
      opportunities = []
      
      # Analyze untapped revenue sources
      opportunities.concat(find_untapped_sources(current_revenue, market_analysis))
      
      # Identify optimization opportunities
      opportunities.concat(find_optimization_opportunities(current_revenue))
      
      # Generate AI recommendations
      enhance_opportunities_with_ai(opportunities, competitor_data)
    end

    def optimize_pricing_strategy
      current_pricing = analyze_current_pricing
      demand_elasticity = estimate_demand_elasticity
      competitor_pricing = estimate_competitor_pricing
      
      prompt = build_pricing_prompt(
        current_pricing: current_pricing,
        demand_elasticity: demand_elasticity,
        competitor_pricing: competitor_pricing
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: pricing_system_prompt
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

      format_pricing_recommendations(response)
    end

    private

    def revenue_prediction_system_prompt
      <<~PROMPT
        あなたは野球リーグの収益予測専門家です。
        過去のデータと市場動向から、高精度な収益予測を日本語で提供します。
        
        予測において考慮すべき要素：
        1. 季節性（シーズン中/オフシーズン）
        2. チーム数の増減
        3. スポンサー獲得の可能性
        4. 地域経済の状況
        5. 競合リーグの動向
        
        予測は保守的、現実的、楽観的の3つのシナリオで提供してください。
      PROMPT
    end

    def pricing_system_prompt
      <<~PROMPT
        あなたは価格戦略の専門家です。
        野球リーグの各種料金設定を最適化し、収益を最大化する提案を日本語で行います。
        
        価格設定で考慮すべき点：
        1. 価格感度（需要の弾力性）
        2. 競合との差別化
        3. 価値提供の明確化
        4. 段階的価格設定
        5. 早期割引やパッケージ割引
        
        提案は実装可能で、既存顧客への影響を最小限に抑えるものにしてください。
      PROMPT
    end

    def gather_revenue_history
      {
        monthly_revenue: calculate_monthly_revenue,
        revenue_by_type: analyze_revenue_by_type,
        growth_trends: calculate_growth_trends,
        seasonal_patterns: identify_revenue_seasonality,
        customer_metrics: analyze_customer_metrics
      }
    end

    def calculate_monthly_revenue
      @organization.revenues
        .group_by_month(:revenue_date, last: 24)
        .sum(:amount)
    end

    def analyze_revenue_by_type
      last_year = @organization.revenues.where(revenue_date: 1.year.ago..Date.current)
      
      types = last_year.group(:revenue_type).sum(:amount)
      
      types.transform_values do |amount|
        {
          amount: amount,
          percentage: (amount.to_f / last_year.sum(:amount) * 100).round(2),
          trend: calculate_type_trend(last_year, amount)
        }
      end
    end

    def calculate_type_trend(revenues, type_amount)
      # Simplified trend calculation
      six_months_ago_amount = revenues
        .where(revenue_date: 1.year.ago..6.months.ago)
        .sum(:amount)
      
      recent_amount = revenues
        .where(revenue_date: 6.months.ago..Date.current)
        .sum(:amount)
      
      return 'stable' if six_months_ago_amount.zero?
      
      growth = ((recent_amount - six_months_ago_amount) / six_months_ago_amount.to_f * 100).round(2)
      
      case growth
      when -Float::INFINITY..-5 then 'declining'
      when -5..5 then 'stable'
      when 5..Float::INFINITY then 'growing'
      end
    end

    def calculate_growth_trends
      yearly_revenue = @organization.revenues
        .group_by_year(:revenue_date, last: 3)
        .sum(:amount)
      
      quarterly_revenue = @organization.revenues
        .group_by_quarter(:revenue_date, last: 8)
        .sum(:amount)
      
      {
        yearly_growth: calculate_period_growth(yearly_revenue),
        quarterly_growth: calculate_period_growth(quarterly_revenue),
        acceleration: calculate_growth_acceleration(quarterly_revenue)
      }
    end

    def calculate_period_growth(period_data)
      return [] if period_data.size < 2
      
      periods = period_data.keys.sort
      growth_rates = []
      
      periods.each_cons(2) do |period1, period2|
        if period_data[period1] > 0
          rate = ((period_data[period2] - period_data[period1]) / period_data[period1].to_f * 100).round(2)
          growth_rates << { period: period2, rate: rate }
        end
      end
      
      growth_rates
    end

    def calculate_growth_acceleration(quarterly_data)
      growth_rates = calculate_period_growth(quarterly_data).map { |g| g[:rate] }
      return 'stable' if growth_rates.size < 3
      
      # Check if growth is accelerating or decelerating
      recent_growth = growth_rates.last(2).sum / 2.0
      older_growth = growth_rates[-4..-3].sum / 2.0
      
      if recent_growth > older_growth + 5
        'accelerating'
      elsif recent_growth < older_growth - 5
        'decelerating'
      else
        'stable'
      end
    end

    def identify_revenue_seasonality
      monthly_data = @organization.revenues
        .where(revenue_date: 3.years.ago..Date.current)
        .group_by_month(:revenue_date)
        .sum(:amount)
      
      # Calculate seasonal indices
      monthly_averages = {}
      total_average = monthly_data.values.sum.to_f / monthly_data.size
      
      (1..12).each do |month|
        month_values = monthly_data.select { |date, _| date.month == month }.values
        monthly_averages[month] = if month_values.any?
          (month_values.sum.to_f / month_values.size / total_average).round(3)
        else
          1.0
        end
      end
      
      {
        indices: monthly_averages,
        peak_months: monthly_averages.select { |_, idx| idx > 1.2 }.keys,
        low_months: monthly_averages.select { |_, idx| idx < 0.8 }.keys
      }
    end

    def analyze_customer_metrics
      teams = @organization.teams.active
      
      {
        total_teams: teams.count,
        new_teams_last_quarter: teams.where(created_at: 3.months.ago..Date.current).count,
        average_revenue_per_team: calculate_arpt,
        retention_rate: calculate_retention_rate,
        churn_rate: calculate_churn_rate
      }
    end

    def calculate_arpt
      return 0 if @organization.teams.count.zero?
      
      total_revenue = @organization.revenues
        .where(revenue_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      (total_revenue / @organization.teams.active.count).round(2)
    end

    def calculate_retention_rate
      # Simplified retention calculation
      teams_start = @organization.teams
        .where('created_at < ?', 1.year.ago)
        .count
      
      return 100 if teams_start.zero?
      
      teams_retained = @organization.teams
        .where('created_at < ?', 1.year.ago)
        .active
        .count
      
      (teams_retained.to_f / teams_start * 100).round(2)
    end

    def calculate_churn_rate
      100 - calculate_retention_rate
    end

    def analyze_external_factors
      {
        economic_indicators: {
          inflation_rate: 3.0, # Placeholder - could integrate with external API
          gdp_growth: 2.5,
          unemployment_rate: 3.5
        },
        market_conditions: {
          sports_participation_trend: 'growing',
          youth_baseball_interest: 'stable',
          competitive_landscape: 'moderate'
        },
        seasonal_factors: {
          upcoming_season: determine_upcoming_season,
          weather_forecast: 'normal',
          major_events: identify_major_events
        }
      }
    end

    def determine_upcoming_season
      current_month = Date.current.month
      case current_month
      when 1..3 then 'pre_season'
      when 4..9 then 'main_season'
      when 10..12 then 'off_season'
      end
    end

    def identify_major_events
      # Placeholder for major events that might impact revenue
      events = []
      
      # Check for holidays
      if [4, 5, 7, 8].include?(Date.current.month)
        events << 'peak_holiday_season'
      end
      
      # Check for local tournaments
      if @organization.leagues.active.any? { |l| l.matches.upcoming.count > 10 }
        events << 'major_tournament'
      end
      
      events
    end

    def analyze_current_revenue_streams
      revenues = @organization.revenues.last(12.months)
      
      revenue_streams = revenues.group(:revenue_type).sum(:amount)
      
      revenue_streams.transform_values do |amount|
        {
          amount: amount,
          percentage: (amount.to_f / revenues.sum(:amount) * 100).round(2),
          frequency: revenues.where(revenue_type: revenue_streams.key(amount)).count,
          average_transaction: amount / revenues.where(revenue_type: revenue_streams.key(amount)).count
        }
      end
    end

    def perform_market_analysis
      {
        market_size: estimate_market_size,
        growth_rate: estimate_market_growth,
        penetration: estimate_market_penetration,
        opportunities: identify_market_opportunities
      }
    end

    def estimate_market_size
      # Simplified market size estimation
      region_population = 1_000_000 # Placeholder
      youth_percentage = 0.15
      sports_participation_rate = 0.3
      baseball_preference = 0.2
      
      potential_players = region_population * youth_percentage * sports_participation_rate * baseball_preference
      average_team_size = 15
      
      {
        potential_teams: (potential_players / average_team_size).to_i,
        current_teams: @organization.teams.count,
        market_share: (@organization.teams.count.to_f / (potential_players / average_team_size) * 100).round(2)
      }
    end

    def estimate_market_growth
      # Placeholder growth estimation
      5.0 # 5% annual growth
    end

    def estimate_market_penetration
      market_size = estimate_market_size
      (market_size[:current_teams].to_f / market_size[:potential_teams] * 100).round(2)
    end

    def identify_market_opportunities
      opportunities = []
      
      penetration = estimate_market_penetration
      if penetration < 20
        opportunities << 'high_growth_potential'
      end
      
      if @organization.revenues.where(revenue_type: 'sponsor').sum(:amount) < @organization.revenues.sum(:amount) * 0.2
        opportunities << 'sponsorship_underdeveloped'
      end
      
      if @organization.revenues.where(revenue_type: 'merchandise').count.zero?
        opportunities << 'merchandise_opportunity'
      end
      
      opportunities
    end

    def estimate_competitor_performance
      # Simplified competitor analysis
      {
        estimated_competitors: 3,
        market_leader_revenue: @organization.revenues.last(12.months).sum(:amount) * 1.5,
        average_competitor_teams: (@organization.teams.count * 0.8).to_i,
        pricing_comparison: {
          our_registration_fee: 50000,
          competitor_average: 45000,
          premium_competitor: 60000
        }
      }
    end

    def find_untapped_sources(current_revenue, market_analysis)
      opportunities = []
      
      # Check for missing revenue types
      all_revenue_types = %w[
        registration_fee membership_fee sponsor ticket_sales
        merchandise donation subsidy other
      ]
      
      used_types = current_revenue.keys
      unused_types = all_revenue_types - used_types
      
      unused_types.each do |type|
        opportunity = {
          type: 'new_revenue_stream',
          revenue_type: type,
          potential_annual: estimate_revenue_potential(type, market_analysis),
          implementation_difficulty: assess_implementation_difficulty(type),
          recommendation: generate_stream_recommendation(type)
        }
        opportunities << opportunity
      end
      
      opportunities
    end

    def estimate_revenue_potential(type, market_analysis)
      base_revenue = @organization.revenues.last(12.months).sum(:amount)
      
      case type
      when 'sponsor'
        base_revenue * 0.3 # 30% of current revenue
      when 'merchandise'
        @organization.teams.count * 10000 # 10,000 yen per team
      when 'ticket_sales'
        @organization.matches.last(12.months).count * 500 * 50 # 500 yen * 50 attendees per match
      when 'donation'
        base_revenue * 0.05 # 5% of current revenue
      else
        base_revenue * 0.1 # 10% default
      end
    end

    def assess_implementation_difficulty(type)
      case type
      when 'registration_fee', 'membership_fee'
        'low'
      when 'sponsor', 'donation'
        'medium'
      when 'merchandise', 'ticket_sales'
        'high'
      else
        'medium'
      end
    end

    def generate_stream_recommendation(type)
      case type
      when 'sponsor'
        '地元企業との提携を開始し、冠大会やチームスポンサーシップを提供'
      when 'merchandise'
        'チームグッズ（ユニフォーム、帽子、タオル）の販売を開始'
      when 'ticket_sales'
        '主要な試合でのチケット販売を導入（決勝戦、オールスター戦など）'
      when 'donation'
        'クラウドファンディングや寄付プログラムの立ち上げ'
      else
        "#{type}の収益化を検討"
      end
    end

    def find_optimization_opportunities(current_revenue)
      opportunities = []
      
      current_revenue.each do |type, data|
        # Low frequency but high value
        if data[:frequency] < 10 && data[:average_transaction] > 50000
          opportunities << {
            type: 'increase_frequency',
            revenue_type: type,
            current_frequency: data[:frequency],
            potential_increase: data[:amount] * 0.5,
            recommendation: '取引頻度を増やすためのインセンティブプログラムを導入'
          }
        end
        
        # High frequency but low value
        if data[:frequency] > 50 && data[:average_transaction] < 10000
          opportunities << {
            type: 'increase_transaction_value',
            revenue_type: type,
            current_avg: data[:average_transaction],
            potential_increase: data[:frequency] * 2000,
            recommendation: 'アップセルやバンドル提供により平均取引額を向上'
          }
        end
      end
      
      opportunities
    end

    def enhance_opportunities_with_ai(opportunities, competitor_data)
      return opportunities if opportunities.empty?
      
      prompt = build_opportunity_enhancement_prompt(opportunities, competitor_data)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "あなたは収益最適化の専門家です。具体的で実行可能な収益向上策を日本語で提案します。"
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
      
      merge_ai_insights(opportunities, response)
    end

    def analyze_current_pricing
      # Analyze registration fees
      registration_fees = @organization.revenues
        .where(revenue_type: 'registration_fee')
        .last(12.months)
      
      membership_fees = @organization.revenues
        .where(revenue_type: 'membership_fee')
        .last(12.months)
      
      {
        registration: {
          current_price: registration_fees.average(:amount) || 50000,
          volume: registration_fees.count,
          total_revenue: registration_fees.sum(:amount)
        },
        membership: {
          current_price: membership_fees.average(:amount) || 5000,
          volume: membership_fees.count,
          total_revenue: membership_fees.sum(:amount)
        }
      }
    end

    def estimate_demand_elasticity
      # Simplified elasticity calculation based on historical data
      price_changes = analyze_historical_price_changes
      
      {
        registration_fee: calculate_elasticity(price_changes[:registration]),
        membership_fee: calculate_elasticity(price_changes[:membership]),
        overall_sensitivity: determine_price_sensitivity
      }
    end

    def analyze_historical_price_changes
      # Placeholder analysis - in production, would analyze actual price changes
      {
        registration: {
          price_changes: [
            { old_price: 45000, new_price: 50000, volume_change: -5 }
          ]
        },
        membership: {
          price_changes: [
            { old_price: 4500, new_price: 5000, volume_change: -2 }
          ]
        }
      }
    end

    def calculate_elasticity(price_data)
      return -1.0 if price_data[:price_changes].empty?
      
      # Simple elasticity calculation
      changes = price_data[:price_changes].first
      price_change_pct = (changes[:new_price] - changes[:old_price]).to_f / changes[:old_price] * 100
      volume_change_pct = changes[:volume_change]
      
      return -1.0 if price_change_pct.zero?
      
      (volume_change_pct / price_change_pct).round(2)
    end

    def determine_price_sensitivity
      # Analyze team characteristics to determine price sensitivity
      small_teams = @organization.teams.joins(:players).group('teams.id').having('COUNT(players.id) < 15').count
      total_teams = @organization.teams.count
      
      small_team_ratio = small_teams.to_f / total_teams
      
      if small_team_ratio > 0.5
        'high'
      elsif small_team_ratio > 0.3
        'medium'
      else
        'low'
      end
    end

    def estimate_competitor_pricing
      # Simplified competitor pricing estimation
      {
        direct_competitors: [
          { name: 'リーグA', registration: 45000, membership: 4500 },
          { name: 'リーグB', registration: 55000, membership: 6000 }
        ],
        market_average: {
          registration: 48000,
          membership: 5000
        },
        premium_offerings: {
          registration: 65000,
          membership: 8000,
          features: ['プロコーチ指導', '充実した設備', '全国大会出場権']
        }
      }
    end

    def build_prediction_prompt(historical_data:, external_factors:, period_start:, period_end:)
      <<~PROMPT
        以下のデータを基に、#{period_start}から#{period_end}までの収益を予測してください。

        ## 過去の収益データ
        月次収益: #{historical_data[:monthly_revenue].to_json}
        
        ## 収益タイプ別分析
        #{historical_data[:revenue_by_type].to_json}
        
        ## 成長トレンド
        #{historical_data[:growth_trends].to_json}
        
        ## 季節性パターン
        #{historical_data[:seasonal_patterns].to_json}
        
        ## 顧客指標
        #{historical_data[:customer_metrics].to_json}
        
        ## 外部要因
        #{external_factors.to_json}

        以下の形式で予測を提供してください：
        1. 月別収益予測（保守的/現実的/楽観的）
        2. 収益タイプ別予測
        3. 予測の根拠と仮定
        4. リスク要因
        5. 収益最大化のための提案
      PROMPT
    end

    def build_pricing_prompt(current_pricing:, demand_elasticity:, competitor_pricing:)
      <<~PROMPT
        以下のデータを基に、最適な価格戦略を提案してください。

        ## 現在の価格設定
        #{current_pricing.to_json}
        
        ## 需要の価格弾力性
        #{demand_elasticity.to_json}
        
        ## 競合の価格設定
        #{competitor_pricing.to_json}

        以下の観点で価格戦略を提案してください：
        1. 推奨価格（登録料、会費それぞれ）
        2. 価格変更の実施タイミング
        3. 段階的価格設定（早期割引、団体割引など）
        4. 価値提案の強化方法
        5. 既存顧客への配慮
        6. 期待される収益影響
      PROMPT
    end

    def build_opportunity_enhancement_prompt(opportunities, competitor_data)
      <<~PROMPT
        以下の収益機会について、より具体的な実施計画を提案してください。

        ## 識別された収益機会
        #{opportunities.to_json}
        
        ## 競合情報
        #{competitor_data.to_json}

        各機会について以下を含めてください：
        1. 実施の優先順位
        2. 具体的な実行ステップ（3-5段階）
        3. 必要なリソース
        4. 期待ROI
        5. 成功のKPI
      PROMPT
    end

    def parse_revenue_prediction(response)
      content = response.dig("choices", 0, "message", "content")
      return fallback_prediction(Date.current, Date.current + 3.months) unless content
      
      {
        monthly_predictions: extract_monthly_revenue_predictions(content),
        type_predictions: extract_type_predictions(content),
        scenarios: extract_scenarios(content),
        confidence_level: extract_confidence_level(content),
        risks: extract_prediction_risks(content),
        recommendations: extract_revenue_recommendations(content)
      }
    end

    def format_pricing_recommendations(response)
      content = response.dig("choices", 0, "message", "content")
      return default_pricing_recommendations unless content
      
      {
        recommended_prices: extract_recommended_prices(content),
        implementation_timeline: extract_pricing_timeline(content),
        discount_strategy: extract_discount_strategy(content),
        value_proposition: extract_value_proposition(content),
        transition_plan: extract_transition_plan(content),
        expected_impact: extract_revenue_impact(content)
      }
    end

    def merge_ai_insights(opportunities, response)
      content = response.dig("choices", 0, "message", "content")
      return opportunities unless content
      
      enhanced_opportunities = opportunities.map do |opp|
        opp.merge(
          priority: extract_opportunity_priority(content, opp[:type]),
          execution_steps: extract_execution_steps(content, opp[:type]),
          required_resources: extract_required_resources(content, opp[:type]),
          expected_roi: extract_expected_roi(content, opp[:type]),
          success_metrics: extract_success_metrics(content, opp[:type])
        )
      end
      
      enhanced_opportunities.sort_by { |o| priority_score(o[:priority]) }.reverse
    end

    def extract_monthly_revenue_predictions(content)
      predictions = {}
      
      # Extract conservative, realistic, and optimistic predictions
      scenarios = %w[保守的 現実的 楽観的]
      
      scenarios.each do |scenario|
        predictions[scenario] = {}
        section = content[/#{scenario}.*?(?=保守的|現実的|楽観的|$)/m]
        next unless section
        
        section.scan(/(\d+)月.*?([\d,]+)円/).each do |month, amount|
          predictions[scenario][month.to_i] = amount.delete(',').to_i
        end
      end
      
      predictions
    end

    def extract_type_predictions(content)
      predictions = {}
      
      Revenue::REVENUE_TYPES.each do |type|
        if match = content.match(/#{type}.*?([\d,]+)円/)
          predictions[type] = match[1].delete(',').to_i
        end
      end
      
      predictions
    end

    def extract_scenarios(content)
      {
        conservative: extract_scenario(content, '保守的'),
        realistic: extract_scenario(content, '現実的'),
        optimistic: extract_scenario(content, '楽観的')
      }
    end

    def extract_scenario(content, scenario_name)
      section = content[/#{scenario_name}.*?(?=保守的|現実的|楽観的|$)/m]
      return {} unless section
      
      total_match = section.match(/合計.*?([\d,]+)円/)
      growth_match = section.match(/成長率.*?([\d.]+)%/)
      
      {
        total: total_match ? total_match[1].delete(',').to_i : 0,
        growth_rate: growth_match ? growth_match[1].to_f : 0
      }
    end

    def extract_confidence_level(content)
      if match = content.match(/信頼度.*?(\d+)%/)
        match[1].to_i
      else
        70 # Default confidence
      end
    end

    def extract_prediction_risks(content)
      risks = []
      
      if risk_section = content[/リスク要因.*?(?=収益|$)/m]
        risks = risk_section.scan(/\d+\.\s*(.+)/).flatten
      end
      
      risks
    end

    def extract_revenue_recommendations(content)
      recommendations = []
      
      if rec_section = content[/収益最大化.*?$/m]
        recommendations = rec_section.scan(/\d+\.\s*(.+)/).flatten
      end
      
      recommendations
    end

    def extract_recommended_prices(content)
      prices = {}
      
      if reg_match = content.match(/登録料.*?([\d,]+)円/)
        prices[:registration_fee] = reg_match[1].delete(',').to_i
      end
      
      if mem_match = content.match(/会費.*?([\d,]+)円/)
        prices[:membership_fee] = mem_match[1].delete(',').to_i
      end
      
      prices
    end

    def extract_pricing_timeline(content)
      timeline = []
      
      if timeline_section = content[/実施タイミング.*?(?=段階的|$)/m]
        timeline = timeline_section.scan(/\d+\.\s*(.+)/).flatten
      end
      
      timeline
    end

    def extract_discount_strategy(content)
      discounts = {}
      
      if early_match = content.match(/早期割引.*?(\d+)%/)
        discounts[:early_bird] = early_match[1].to_i
      end
      
      if group_match = content.match(/団体割引.*?(\d+)%/)
        discounts[:group] = group_match[1].to_i
      end
      
      if volume_match = content.match(/ボリューム割引.*?(\d+)%/)
        discounts[:volume] = volume_match[1].to_i
      end
      
      discounts
    end

    def extract_value_proposition(content)
      props = []
      
      if value_section = content[/価値提案.*?(?=既存顧客|$)/m]
        props = value_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      
      props
    end

    def extract_transition_plan(content)
      plan = []
      
      if transition_section = content[/既存顧客.*?(?=期待|$)/m]
        plan = transition_section.scan(/\d+\.\s*(.+)/).flatten
      end
      
      plan
    end

    def extract_revenue_impact(content)
      impact = {}
      
      if revenue_match = content.match(/収益.*?(\d+)%.*?増/)
        impact[:revenue_increase_pct] = revenue_match[1].to_i
      end
      
      if amount_match = content.match(/年間.*?([\d,]+)円.*?増/)
        impact[:annual_increase_amount] = amount_match[1].delete(',').to_i
      end
      
      impact
    end

    def extract_opportunity_priority(content, type)
      if content.include?("#{type}.*高.*優先") || content.include?("#{type}.*最優先")
        'high'
      elsif content.include?("#{type}.*中.*優先")
        'medium'
      else
        'low'
      end
    end

    def extract_execution_steps(content, type)
      steps = []
      
      if step_section = content[/#{type}.*?実行ステップ.*?(?=必要|$)/m]
        steps = step_section.scan(/\d+\.\s*(.+)/).flatten
      end
      
      steps
    end

    def extract_required_resources(content, type)
      resources = []
      
      if resource_section = content[/#{type}.*?リソース.*?(?=期待|$)/m]
        resources = resource_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      
      resources
    end

    def extract_expected_roi(content, type)
      if roi_match = content.match(/#{type}.*?ROI.*?(\d+)%/)
        roi_match[1].to_i
      else
        20 # Default ROI
      end
    end

    def extract_success_metrics(content, type)
      metrics = []
      
      if metric_section = content[/#{type}.*?KPI.*?$/m]
        metrics = metric_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      
      metrics
    end

    def priority_score(priority)
      case priority
      when 'high' then 3
      when 'medium' then 2
      when 'low' then 1
      else 0
      end
    end

    def fallback_prediction(period_start, period_end)
      # Simple linear projection based on recent trends
      recent_revenue = @organization.revenues
        .where(revenue_date: 3.months.ago..Date.current)
        .sum(:amount)
      
      monthly_average = recent_revenue / 3
      months = ((period_end - period_start) / 30).to_i
      
      {
        monthly_predictions: {
          '保守的' => Hash[(1..months).map { |m| [m, (monthly_average * 0.9).to_i] }],
          '現実的' => Hash[(1..months).map { |m| [m, monthly_average.to_i] }],
          '楽観的' => Hash[(1..months).map { |m| [m, (monthly_average * 1.1).to_i] }]
        },
        type_predictions: {},
        scenarios: {
          conservative: { total: monthly_average * months * 0.9, growth_rate: -10 },
          realistic: { total: monthly_average * months, growth_rate: 0 },
          optimistic: { total: monthly_average * months * 1.1, growth_rate: 10 }
        },
        confidence_level: 50,
        risks: ['予測に十分なデータがありません'],
        recommendations: ['より多くのデータを収集してください']
      }
    end

    def default_pricing_recommendations
      {
        recommended_prices: {
          registration_fee: 50000,
          membership_fee: 5000
        },
        implementation_timeline: ['即時実施可能'],
        discount_strategy: {
          early_bird: 10,
          group: 15,
          volume: 20
        },
        value_proposition: ['高品質なリーグ運営', 'プロフェッショナルな審判'],
        transition_plan: ['既存顧客には段階的に適用'],
        expected_impact: {
          revenue_increase_pct: 5,
          annual_increase_amount: 500000
        }
      }
    end
  end
end