# frozen_string_literal: true

module Ai
  class CostAllocationEngine < OpenAiClient
    def initialize(organization:)
      super()
      @organization = organization
    end

    def allocate_match_costs(match:)
      # Gather all costs related to the match
      match_expenses = gather_match_expenses(match)
      participating_teams = match.teams
      
      # Determine allocation method
      allocation_method = determine_allocation_method(match, match_expenses)
      
      # Generate AI-enhanced allocation
      prompt = build_match_allocation_prompt(
        match: match,
        expenses: match_expenses,
        teams: participating_teams,
        method: allocation_method
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: cost_allocation_system_prompt
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

      parse_match_allocation(response, match, match_expenses)
    rescue StandardError => e
      Rails.logger.error "Match cost allocation failed: #{e.message}"
      fallback_match_allocation(match, match_expenses)
    end

    def allocate_season_costs(season:)
      # Gather all season-related costs
      season_expenses = gather_season_expenses(season)
      teams_in_season = season.teams
      
      # Analyze team participation and benefits
      team_metrics = analyze_team_metrics(teams_in_season, season)
      
      prompt = build_season_allocation_prompt(
        season: season,
        expenses: season_expenses,
        team_metrics: team_metrics
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: season_allocation_system_prompt
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

      format_season_allocation(response, season, season_expenses, teams_in_season)
    end

    def optimize_shared_costs
      # Identify all shared costs
      shared_expenses = identify_shared_expenses
      beneficiaries = identify_beneficiaries(shared_expenses)
      
      # Generate optimization recommendations
      prompt = build_optimization_prompt(
        expenses: shared_expenses,
        beneficiaries: beneficiaries
      )

      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: optimization_system_prompt
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

      parse_optimization_recommendations(response)
    end

    def generate_cost_report(start_date:, end_date:)
      allocations = analyze_historical_allocations(start_date, end_date)
      fairness_analysis = assess_allocation_fairness(allocations)
      
      prompt = build_report_prompt(
        allocations: allocations,
        fairness: fairness_analysis,
        period: { start: start_date, end: end_date }
      )

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

      format_cost_report(response, allocations)
    end

    private

    def cost_allocation_system_prompt
      <<~PROMPT
        あなたは野球リーグのコスト配分専門家です。
        公平で透明性の高いコスト配分方法を日本語で提案します。
        
        配分において考慮すべき原則：
        1. 受益者負担の原則
        2. 公平性と透明性
        3. 支払い能力の考慮
        4. インセンティブの適切な設計
        5. 管理コストの最小化
        
        すべての配分案は実装可能で、関係者が納得できる理由付けを含めてください。
      PROMPT
    end

    def season_allocation_system_prompt
      <<~PROMPT
        あなたはシーズン全体のコスト配分を最適化する専門家です。
        長期的な視点で公平かつ持続可能な配分方法を日本語で提案します。
        
        シーズンコストの配分で重視すべき点：
        1. チームの参加頻度と受益度
        2. チーム規模と支払い能力
        3. 固定費と変動費の適切な配分
        4. 新規チームへの配慮
        5. 長期参加へのインセンティブ
      PROMPT
    end

    def optimization_system_prompt
      <<~PROMPT
        あなたは共有コストの最適化専門家です。
        効率的で公平なコスト配分の改善策を日本語で提案します。
        
        最適化で目指すべきゴール：
        1. 総コストの削減
        2. 配分の簡素化
        3. 支払い遅延の削減
        4. 満足度の向上
        5. 管理負担の軽減
      PROMPT
    end

    def report_system_prompt
      <<~PROMPT
        あなたはコスト配分レポートの作成専門家です。
        経営陣とチームの両方が理解しやすいレポートを日本語で作成します。
        
        レポートに含めるべき要素：
        1. 配分の概要と根拠
        2. 公平性の評価
        3. 改善提案
        4. 将来の予測
        5. ベストプラクティス
      PROMPT
    end

    def gather_match_expenses(match)
      # Direct match expenses
      direct_expenses = @organization.expenses.where(match_id: match.id)
      
      # Venue expenses for the match date
      venue_expenses = if match.venue_id
        @organization.expenses
          .where(venue_id: match.venue_id)
          .where(expense_date: match.match_date)
      else
        Expense.none
      end
      
      # Referee fees (estimated if not directly linked)
      referee_expenses = @organization.expenses
        .where(category: 'referee_fees')
        .where(expense_date: match.match_date)
      
      {
        direct: direct_expenses,
        venue: venue_expenses,
        referee: referee_expenses,
        total: (direct_expenses + venue_expenses + referee_expenses).sum(:amount)
      }
    end

    def determine_allocation_method(match, expenses)
      # Determine the most appropriate allocation method
      if match.league.present? && match.league.ai_matching_config.present?
        config = match.league.ai_matching_config
        return config.cost_allocation_method if config.respond_to?(:cost_allocation_method)
      end
      
      # Default allocation methods based on match type
      case match.match_type
      when 'championship', 'final'
        'revenue_based' # Teams with more revenue pay more
      when 'friendly'
        'equal_split' # Equal split between teams
      else
        'hybrid' # Combination of equal and performance-based
      end
    end

    def gather_season_expenses(season)
      start_date = season.start_date
      end_date = season.end_date || Date.current
      
      # All expenses within the season period
      season_expenses = @organization.expenses
        .where(expense_date: start_date..end_date)
      
      # Categorize expenses
      {
        administrative: season_expenses.where(category: 'administrative'),
        venue: season_expenses.where(category: 'venue_rental'),
        referee: season_expenses.where(category: 'referee_fees'),
        equipment: season_expenses.where(category: 'equipment'),
        insurance: season_expenses.where(category: 'insurance'),
        marketing: season_expenses.where(category: 'marketing'),
        other: season_expenses.where(category: ['miscellaneous', 'prize_money']),
        total: season_expenses.sum(:amount)
      }
    end

    def analyze_team_metrics(teams, season)
      teams.map do |team|
        matches_played = team.matches.where(season_id: season.id).count
        matches_won = team.matches.where(season_id: season.id, winner_id: team.id).count
        
        # Revenue contribution
        team_revenue = @organization.revenues
          .where(team_id: team.id)
          .where(revenue_date: season.start_date..(season.end_date || Date.current))
          .sum(:amount)
        
        {
          team: team,
          matches_played: matches_played,
          win_rate: matches_played.zero? ? 0 : (matches_won.to_f / matches_played * 100).round(2),
          revenue_contribution: team_revenue,
          player_count: team.players.active.count,
          size_category: categorize_team_size(team.players.active.count)
        }
      end
    end

    def categorize_team_size(player_count)
      case player_count
      when 0..12 then 'small'
      when 13..18 then 'medium'
      else 'large'
      end
    end

    def identify_shared_expenses
      # Expenses not directly attributable to specific teams or matches
      @organization.expenses
        .where(team_id: nil)
        .where(match_id: nil)
        .where(expense_date: 3.months.ago..Date.current)
        .group_by(&:category)
    end

    def identify_beneficiaries(shared_expenses)
      beneficiaries = {}
      
      shared_expenses.each do |category, expenses|
        beneficiaries[category] = case category
        when 'insurance'
          @organization.teams.active # All teams benefit
        when 'administrative'
          @organization.teams.active # All teams benefit
        when 'marketing'
          @organization.teams.joins(:matches).where('matches.match_date > ?', 3.months.ago).distinct
        else
          @organization.teams.active
        end
      end
      
      beneficiaries
    end

    def analyze_historical_allocations(start_date, end_date)
      # Analyze how costs have been allocated historically
      expenses = @organization.expenses.where(expense_date: start_date..end_date)
      
      allocations = {
        by_team: {},
        by_category: {},
        total: expenses.sum(:amount)
      }
      
      # Group by team
      @organization.teams.each do |team|
        team_expenses = expenses.where(team_id: team.id)
        team_match_expenses = expenses.joins(:match).where('matches.home_team_id = ? OR matches.away_team_id = ?', team.id, team.id)
        
        allocations[:by_team][team.name] = {
          direct: team_expenses.sum(:amount),
          match_related: team_match_expenses.sum(:amount),
          total: team_expenses.sum(:amount) + team_match_expenses.sum(:amount)
        }
      end
      
      # Group by category
      Budget::CATEGORIES.each do |category|
        allocations[:by_category][category] = expenses.where(category: category).sum(:amount)
      end
      
      allocations
    end

    def assess_allocation_fairness(allocations)
      team_allocations = allocations[:by_team].values.map { |a| a[:total] }
      
      # Calculate fairness metrics
      mean = team_allocations.sum.to_f / team_allocations.size
      std_dev = Math.sqrt(team_allocations.map { |a| (a - mean) ** 2 }.sum / team_allocations.size)
      cv = mean.zero? ? 0 : std_dev / mean # Coefficient of variation
      
      # Gini coefficient for inequality measurement
      gini = calculate_gini_coefficient(team_allocations)
      
      {
        mean_allocation: mean,
        std_deviation: std_dev,
        coefficient_of_variation: cv,
        gini_coefficient: gini,
        fairness_score: calculate_fairness_score(cv, gini),
        interpretation: interpret_fairness(cv, gini)
      }
    end

    def calculate_gini_coefficient(values)
      return 0 if values.empty? || values.sum.zero?
      
      sorted_values = values.sort
      n = sorted_values.size
      
      sum = 0
      sorted_values.each_with_index do |value, i|
        sum += value * (n - i)
      end
      
      gini = (n + 1 - 2.0 * sum / sorted_values.sum) / n
      gini.round(3)
    end

    def calculate_fairness_score(cv, gini)
      # Score from 0-100, higher is more fair
      cv_score = [100 - (cv * 100), 0].max
      gini_score = (1 - gini) * 100
      
      ((cv_score + gini_score) / 2).round
    end

    def interpret_fairness(cv, gini)
      if gini < 0.2 && cv < 0.3
        "配分は非常に公平です"
      elsif gini < 0.3 && cv < 0.5
        "配分はおおむね公平です"
      elsif gini < 0.4 && cv < 0.7
        "配分に若干の不均衡があります"
      else
        "配分の公平性に改善の余地があります"
      end
    end

    def build_match_allocation_prompt(match:, expenses:, teams:, method:)
      <<~PROMPT
        以下の試合コストを参加チーム間で配分してください。

        ## 試合情報
        日付: #{match.match_date}
        ホームチーム: #{match.home_team.name}
        アウェイチーム: #{match.away_team.name}
        
        ## コスト内訳
        直接費用: #{expenses[:direct].sum(:amount)}円
        会場費: #{expenses[:venue].sum(:amount)}円
        審判費用: #{expenses[:referee].sum(:amount)}円
        合計: #{expenses[:total]}円
        
        ## 配分方法
        #{method}
        
        ## チーム情報
        #{teams.map { |t| "#{t.name}: 選手数 #{t.players.count}人" }.join("\n")}

        以下の形式で配分案を提供してください：
        1. 各チームの負担額と計算根拠
        2. 配分の公平性の説明
        3. 特別な考慮事項
        4. 支払い方法の提案
      PROMPT
    end

    def build_season_allocation_prompt(season:, expenses:, team_metrics:)
      <<~PROMPT
        #{season.name}のシーズンコストを参加チーム間で配分してください。

        ## シーズン情報
        期間: #{season.start_date} 〜 #{season.end_date || '継続中'}
        参加チーム数: #{team_metrics.size}
        
        ## コスト内訳
        管理費: #{expenses[:administrative].sum(:amount)}円
        会場費: #{expenses[:venue].sum(:amount)}円
        審判費用: #{expenses[:referee].sum(:amount)}円
        設備費: #{expenses[:equipment].sum(:amount)}円
        保険料: #{expenses[:insurance].sum(:amount)}円
        広告費: #{expenses[:marketing].sum(:amount)}円
        その他: #{expenses[:other].sum(:amount)}円
        合計: #{expenses[:total]}円
        
        ## チーム別指標
        #{team_metrics.map { |m| format_team_metrics(m) }.join("\n\n")}

        以下の観点で配分案を作成してください：
        1. 基本配分（固定費の配分方法）
        2. 変動費の配分（使用量に応じた配分）
        3. インセンティブ設計（早期支払い割引など）
        4. 新規チームへの優遇措置
        5. 支払いスケジュール
      PROMPT
    end

    def format_team_metrics(metrics)
      <<~METRICS
        チーム: #{metrics[:team].name}
        - 試合数: #{metrics[:matches_played]}
        - 勝率: #{metrics[:win_rate]}%
        - 収入貢献: #{metrics[:revenue_contribution]}円
        - 選手数: #{metrics[:player_count]}人 (#{metrics[:size_category]})
      METRICS
    end

    def build_optimization_prompt(expenses:, beneficiaries:)
      <<~PROMPT
        以下の共有コストの配分を最適化してください。

        ## 共有コスト
        #{expenses.map { |cat, exps| "#{cat}: #{exps.sum(&:amount)}円 (#{exps.count}件)" }.join("\n")}
        
        ## 受益者
        #{beneficiaries.map { |cat, teams| "#{cat}: #{teams.count}チーム" }.join("\n")}

        以下の改善提案を行ってください：
        1. 現在の配分方法の問題点
        2. 改善された配分方法
        3. コスト削減の機会
        4. 配分プロセスの簡素化
        5. 実装のロードマップ
      PROMPT
    end

    def build_report_prompt(allocations:, fairness:, period:)
      <<~PROMPT
        #{period[:start]}から#{period[:end]}までのコスト配分レポートを作成してください。

        ## 配分実績
        総額: #{allocations[:total]}円
        
        チーム別配分:
        #{allocations[:by_team].map { |name, data| "#{name}: #{data[:total]}円" }.join("\n")}
        
        カテゴリ別配分:
        #{allocations[:by_category].map { |cat, amount| "#{cat}: #{amount}円" }.join("\n")}
        
        ## 公平性評価
        平均配分額: #{fairness[:mean_allocation]}円
        変動係数: #{fairness[:coefficient_of_variation]}
        ジニ係数: #{fairness[:gini_coefficient]}
        公平性スコア: #{fairness[:fairness_score]}/100
        評価: #{fairness[:interpretation]}

        以下の構成でレポートを作成してください：
        1. エグゼクティブサマリー
        2. 配分の詳細分析
        3. 公平性の評価と改善提案
        4. ベストプラクティス
        5. 次期の推奨事項
      PROMPT
    end

    def parse_match_allocation(response, match, expenses)
      content = response.dig("choices", 0, "message", "content")
      return fallback_match_allocation(match, expenses) unless content
      
      {
        allocations: extract_team_allocations(content, match),
        rationale: extract_allocation_rationale(content),
        considerations: extract_special_considerations(content),
        payment_terms: extract_payment_terms(content),
        total_allocated: expenses[:total]
      }
    end

    def format_season_allocation(response, season, expenses, teams)
      content = response.dig("choices", 0, "message", "content")
      return default_season_allocation(season, expenses, teams) unless content
      
      {
        base_allocation: extract_base_allocation(content, teams),
        variable_allocation: extract_variable_allocation(content),
        incentives: extract_incentive_structure(content),
        new_team_benefits: extract_new_team_benefits(content),
        payment_schedule: extract_payment_schedule(content),
        total_amount: expenses[:total],
        allocation_summary: generate_allocation_summary(content, teams, expenses)
      }
    end

    def parse_optimization_recommendations(response)
      content = response.dig("choices", 0, "message", "content")
      return default_optimization_recommendations unless content
      
      {
        current_issues: extract_current_issues(content),
        improved_methods: extract_improved_methods(content),
        cost_reduction_opportunities: extract_cost_reductions(content),
        simplification_measures: extract_simplifications(content),
        implementation_roadmap: extract_roadmap(content)
      }
    end

    def format_cost_report(response, allocations)
      content = response.dig("choices", 0, "message", "content")
      return default_cost_report(allocations) unless content
      
      {
        executive_summary: extract_executive_summary(content),
        detailed_analysis: extract_detailed_analysis(content),
        fairness_evaluation: extract_fairness_evaluation(content),
        best_practices: extract_best_practices(content),
        recommendations: extract_report_recommendations(content),
        data: allocations
      }
    end

    # Extraction helper methods
    def extract_team_allocations(content, match)
      allocations = {}
      
      # Extract home team allocation
      if home_match = content.match(/#{match.home_team.name}.*?([\d,]+)円/)
        allocations[match.home_team.id] = {
          team_name: match.home_team.name,
          amount: home_match[1].delete(',').to_i
        }
      end
      
      # Extract away team allocation
      if away_match = content.match(/#{match.away_team.name}.*?([\d,]+)円/)
        allocations[match.away_team.id] = {
          team_name: match.away_team.name,
          amount: away_match[1].delete(',').to_i
        }
      end
      
      allocations
    end

    def extract_allocation_rationale(content)
      if rationale_section = content[/計算根拠[:：]?\s*(.+?)(?=配分の公平性|$)/m]
        rationale_section.strip
      else
        "均等配分による"
      end
    end

    def extract_special_considerations(content)
      considerations = []
      if considerations_section = content[/特別な考慮事項[:：]?\s*(.+?)(?=支払い方法|$)/m]
        considerations = considerations_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      considerations
    end

    def extract_payment_terms(content)
      if payment_section = content[/支払い方法[:：]?\s*(.+?)$/m]
        payment_section.strip
      else
        "試合後30日以内に支払い"
      end
    end

    def extract_base_allocation(content, teams)
      allocations = {}
      
      teams.each do |team|
        if match = content.match(/#{team.name}.*?基本.*?([\d,]+)円/)
          allocations[team.id] = match[1].delete(',').to_i
        end
      end
      
      allocations
    end

    def extract_variable_allocation(content)
      methods = []
      if variable_section = content[/変動費の配分[:：]?\s*(.+?)(?=インセンティブ|$)/m]
        methods = variable_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      methods
    end

    def extract_incentive_structure(content)
      incentives = {}
      
      # Early payment discount
      if early_match = content.match(/早期.*?(\d+)%.*?割引/)
        incentives[:early_payment_discount] = early_match[1].to_i
      end
      
      # Volume discount
      if volume_match = content.match(/ボリューム.*?(\d+)%.*?割引/)
        incentives[:volume_discount] = volume_match[1].to_i
      end
      
      incentives
    end

    def extract_new_team_benefits(content)
      benefits = []
      if benefits_section = content[/新規チーム.*?優遇[:：]?\s*(.+?)(?=支払い|$)/m]
        benefits = benefits_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      benefits
    end

    def extract_payment_schedule(content)
      schedule = []
      if schedule_section = content[/支払いスケジュール[:：]?\s*(.+?)$/m]
        schedule = schedule_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      schedule
    end

    def generate_allocation_summary(content, teams, expenses)
      # Generate a summary of allocations
      total_allocated = 0
      summary = teams.map do |team|
        # Try to extract allocation for this team
        if match = content.match(/#{team.name}.*?合計.*?([\d,]+)円/)
          amount = match[1].delete(',').to_i
          total_allocated += amount
          { team_id: team.id, team_name: team.name, allocated_amount: amount }
        else
          # Fallback to equal allocation
          amount = expenses[:total] / teams.count
          total_allocated += amount
          { team_id: team.id, team_name: team.name, allocated_amount: amount }
        end
      end
      
      summary
    end

    def extract_current_issues(content)
      issues = []
      if issues_section = content[/現在.*?問題点[:：]?\s*(.+?)(?=改善|$)/m]
        issues = issues_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      issues
    end

    def extract_improved_methods(content)
      methods = []
      if methods_section = content[/改善.*?配分方法[:：]?\s*(.+?)(?=コスト削減|$)/m]
        methods = methods_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      methods
    end

    def extract_cost_reductions(content)
      opportunities = []
      if cost_section = content[/コスト削減.*?機会[:：]?\s*(.+?)(?=簡素化|$)/m]
        opportunities = cost_section.scan(/[・\d]+\.\s*(.+)/).flatten.map do |opp|
          # Try to extract savings amount
          if savings_match = opp.match(/([\d,]+)円/)
            { description: opp, amount: savings_match[1].delete(',').to_i }
          else
            { description: opp, amount: 0 }
          end
        end
      end
      opportunities
    end

    def extract_simplifications(content)
      measures = []
      if simplify_section = content[/簡素化[:：]?\s*(.+?)(?=実装|$)/m]
        measures = simplify_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      measures
    end

    def extract_roadmap(content)
      steps = []
      if roadmap_section = content[/ロードマップ[:：]?\s*(.+?)$/m]
        steps = roadmap_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      steps
    end

    def extract_executive_summary(content)
      if summary_section = content[/エグゼクティブサマリー[:：]?\s*(.+?)(?=詳細分析|$)/m]
        summary_section.strip
      else
        "コスト配分の概要"
      end
    end

    def extract_detailed_analysis(content)
      if analysis_section = content[/詳細分析[:：]?\s*(.+?)(?=公平性|$)/m]
        analysis_section.strip
      else
        ""
      end
    end

    def extract_fairness_evaluation(content)
      if fairness_section = content[/公平性.*?評価[:：]?\s*(.+?)(?=ベスト|$)/m]
        fairness_section.strip
      else
        ""
      end
    end

    def extract_best_practices(content)
      practices = []
      if practices_section = content[/ベストプラクティス[:：]?\s*(.+?)(?=推奨|$)/m]
        practices = practices_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      practices
    end

    def extract_report_recommendations(content)
      recommendations = []
      if rec_section = content[/推奨事項[:：]?\s*(.+?)$/m]
        recommendations = rec_section.scan(/[・\d]+\.\s*(.+)/).flatten
      end
      recommendations
    end

    # Fallback methods
    def fallback_match_allocation(match, expenses)
      # Simple 50-50 split
      per_team = expenses[:total] / 2
      
      {
        allocations: {
          match.home_team_id => {
            team_name: match.home_team.name,
            amount: per_team
          },
          match.away_team_id => {
            team_name: match.away_team.name,
            amount: per_team
          }
        },
        rationale: "均等配分（各チーム50%負担）",
        considerations: ["試合の重要度による調整は行っていません"],
        payment_terms: "試合後30日以内",
        total_allocated: expenses[:total]
      }
    end

    def default_season_allocation(season, expenses, teams)
      per_team = expenses[:total] / teams.count
      
      {
        base_allocation: teams.each_with_object({}) { |team, hash| hash[team.id] = per_team },
        variable_allocation: ["試合数に応じた追加配分"],
        incentives: { early_payment_discount: 5 },
        new_team_benefits: ["初年度20%割引"],
        payment_schedule: ["四半期ごとの分割払い"],
        total_amount: expenses[:total],
        allocation_summary: teams.map { |t| { team_id: t.id, team_name: t.name, allocated_amount: per_team } }
      }
    end

    def default_optimization_recommendations
      {
        current_issues: ["配分方法が複雑"],
        improved_methods: ["カテゴリ別の固定配分率を設定"],
        cost_reduction_opportunities: [{ description: "一括購入による割引", amount: 50000 }],
        simplification_measures: ["配分計算の自動化"],
        implementation_roadmap: ["システム要件定義", "開発", "テスト", "導入"]
      }
    end

    def default_cost_report(allocations)
      {
        executive_summary: "期間中の総コストは#{allocations[:total]}円でした。",
        detailed_analysis: "詳細な分析にはさらなるデータが必要です。",
        fairness_evaluation: "配分の公平性は概ね良好です。",
        best_practices: ["定期的な配分見直し", "透明性の確保"],
        recommendations: ["配分ルールの文書化", "異議申し立てプロセスの確立"],
        data: allocations
      }
    end
  end
end