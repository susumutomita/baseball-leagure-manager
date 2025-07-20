# frozen_string_literal: true

module Ai
  class MatchingEngine
    attr_reader :league, :config, :options

    def initialize(league, options = {})
      @league = league
      @config = league.ai_matching_config || build_default_config
      @options = options
    end

    def generate_proposal
      ActiveRecord::Base.transaction do
        proposal = create_proposal
        matches = generate_matches
        
        matches.each do |match_data|
          proposal.match_proposal_details.create!(match_data)
        end

        # Calculate scores
        calculate_proposal_scores(proposal)
        
        # AI analysis if enabled
        if config.use_ai_analysis? && config.active_model?
          perform_ai_analysis(proposal)
        end

        proposal
      end
    rescue StandardError => e
      Rails.logger.error "MatchingEngine error: #{e.message}"
      raise
    end

    def optimize_existing_schedule(match_proposal)
      optimizer = TravelDistanceOptimizer.new(match_proposal)
      optimized_schedule = optimizer.optimize

      constraint_checker = ScheduleConstraintChecker.new(match_proposal, config)
      violations = constraint_checker.check_all_constraints

      if violations.empty?
        apply_optimized_schedule(match_proposal, optimized_schedule)
      else
        handle_constraint_violations(match_proposal, violations)
      end
    end

    private

    def build_default_config
      AiMatchingConfig.new(
        league: league,
        algorithm_type: :balanced,
        ai_provider: :local,
        organization_id: league.organization_id
      )
    end

    def create_proposal
      MatchProposal.create!(
        league: league,
        ai_matching_config: config,
        status: :draft,
        organization_id: league.organization_id,
        proposal_metadata: {
          generated_at: Time.current,
          algorithm_type: config.algorithm_type,
          team_count: league.teams.count,
          options: options
        }
      )
    end

    def generate_matches
      case config.algorithm_type
      when 'balanced'
        generate_balanced_matches
      when 'travel_optimized'
        generate_travel_optimized_matches
      when 'strength_based'
        generate_strength_based_matches
      when 'custom'
        generate_custom_matches
      else
        generate_balanced_matches
      end
    end

    def generate_balanced_matches
      teams = league.teams.to_a
      matches = []
      
      # Round-robin tournament
      if options[:double_round_robin]
        # Each team plays home and away against every other team
        teams.combination(2).each do |team1, team2|
          matches << create_match_data(team1, team2, calculate_match_date(matches.size))
          matches << create_match_data(team2, team1, calculate_match_date(matches.size + 1))
        end
      else
        # Single round-robin
        teams.combination(2).each_with_index do |(team1, team2), index|
          # Alternate home/away assignment
          if index.even?
            matches << create_match_data(team1, team2, calculate_match_date(index))
          else
            matches << create_match_data(team2, team1, calculate_match_date(index))
          end
        end
      end

      # Balance home/away games
      balance_home_away_assignments(matches, teams)
      
      matches
    end

    def generate_travel_optimized_matches
      optimizer = TravelDistanceOptimizer.new(league)
      teams = league.teams.to_a
      matches = []

      # Group teams by proximity
      team_clusters = optimizer.cluster_teams_by_location(teams)
      
      # Generate matches within clusters first
      team_clusters.each do |cluster|
        cluster.combination(2).each do |team1, team2|
          matches << create_match_data(team1, team2, calculate_match_date(matches.size))
        end
      end

      # Then generate inter-cluster matches
      team_clusters.combination(2).each do |cluster1, cluster2|
        # Select representative teams from each cluster for inter-cluster play
        cluster1.first(2).product(cluster2.first(2)).each do |(team1, team2)|
          matches << create_match_data(team1, team2, calculate_match_date(matches.size))
        end
      end

      matches
    end

    def generate_strength_based_matches
      analyzer = TeamStrengthAnalyzer.new(league)
      teams = analyzer.teams_by_strength
      matches = []

      # Group teams by strength tiers
      tiers = create_strength_tiers(teams)
      
      # Generate matches within tiers
      tiers.each do |tier|
        tier.combination(2).each do |team1, team2|
          matches << create_match_data(team1, team2, calculate_match_date(matches.size))
        end
      end

      # Generate some cross-tier matches for variety
      if tiers.size > 1
        tiers.each_cons(2) do |tier1, tier2|
          # Top teams from lower tier vs bottom teams from higher tier
          tier1.last(2).product(tier2.first(2)).each do |(team1, team2)|
            matches << create_match_data(team1, team2, calculate_match_date(matches.size))
          end
        end
      end

      matches
    end

    def generate_custom_matches
      # Implement custom rules from config
      rules = config.custom_rules || {}
      
      if rules['algorithm'].present?
        # Execute custom algorithm if specified
        custom_algorithm_class = "Ai::CustomAlgorithms::#{rules['algorithm']}".safe_constantize
        if custom_algorithm_class
          return custom_algorithm_class.new(league, rules).generate_matches
        end
      end

      # Fall back to balanced if custom algorithm not found
      generate_balanced_matches
    end

    def create_match_data(home_team, away_team, datetime)
      {
        home_team: home_team,
        away_team: away_team,
        proposed_datetime: datetime,
        proposed_venue: home_team.home_venue || "#{home_team.city} Stadium",
        organization_id: league.organization_id,
        metadata: {
          travel_distance: calculate_travel_distance(home_team, away_team),
          strength_difference: calculate_strength_difference(home_team, away_team)
        }
      }
    end

    def calculate_match_date(match_index)
      base_date = options[:start_date] || league.start_date || 1.week.from_now
      
      # Schedule matches on weekends
      weeks_offset = match_index / 2  # 2 matches per week
      days_offset = (match_index % 2) * 1  # Saturday or Sunday
      
      match_date = base_date + weeks_offset.weeks + days_offset.days
      
      # Ensure it's a weekend
      while !match_date.saturday? && !match_date.sunday?
        match_date += 1.day
      end

      # Set match time (morning or afternoon)
      match_date + (match_index.even? ? 10 : 14).hours
    end

    def balance_home_away_assignments(matches, teams)
      home_games_count = Hash.new(0)
      away_games_count = Hash.new(0)

      matches.each do |match|
        home_games_count[match[:home_team].id] += 1
        away_games_count[match[:away_team].id] += 1
      end

      # Find imbalanced teams
      teams.each do |team|
        home_count = home_games_count[team.id]
        away_count = away_games_count[team.id]
        
        if (home_count - away_count).abs > 1
          # Find matches to swap
          rebalance_team_matches(matches, team, home_count, away_count)
        end
      end

      matches
    end

    def rebalance_team_matches(matches, team, home_count, away_count)
      if home_count > away_count + 1
        # Find a home match to convert to away
        match = matches.find { |m| m[:home_team] == team }
        if match && can_swap_match?(match)
          match[:home_team], match[:away_team] = match[:away_team], match[:home_team]
          match[:proposed_venue] = match[:home_team].home_venue || "#{match[:home_team].city} Stadium"
        end
      elsif away_count > home_count + 1
        # Find an away match to convert to home
        match = matches.find { |m| m[:away_team] == team }
        if match && can_swap_match?(match)
          match[:home_team], match[:away_team] = match[:away_team], match[:home_team]
          match[:proposed_venue] = match[:home_team].home_venue || "#{match[:home_team].city} Stadium"
        end
      end
    end

    def can_swap_match?(match)
      # Check if swapping would violate constraints
      checker = ScheduleConstraintChecker.new(nil, config)
      !checker.would_violate_consecutive_games?(match[:home_team], match[:away_team])
    end

    def calculate_travel_distance(home_team, away_team)
      return 0.0 unless home_team.latitude && home_team.longitude &&
                        away_team.latitude && away_team.longitude

      # Haversine formula (same as in MatchProposalDetail)
      rad_per_deg = Math::PI / 180
      rkm = 6371

      dlat_rad = (away_team.latitude - home_team.latitude) * rad_per_deg
      dlon_rad = (away_team.longitude - home_team.longitude) * rad_per_deg

      lat1_rad = home_team.latitude * rad_per_deg
      lat2_rad = away_team.latitude * rad_per_deg

      a = Math.sin(dlat_rad / 2) ** 2 + 
          Math.cos(lat1_rad) * Math.cos(lat2_rad) * 
          Math.sin(dlon_rad / 2) ** 2
      
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      rkm * c
    end

    def calculate_strength_difference(home_team, away_team)
      home_strength = home_team.current_strength_metric&.overall_rating || 0.5
      away_strength = away_team.current_strength_metric&.overall_rating || 0.5
      
      (home_strength - away_strength).abs
    end

    def create_strength_tiers(teams)
      # Sort teams by strength
      sorted_teams = teams.sort_by { |t| -(t.current_strength_metric&.overall_rating || 0.5) }
      
      # Create tiers
      tier_size = (sorted_teams.size / 3.0).ceil
      sorted_teams.each_slice(tier_size).to_a
    end

    def calculate_proposal_scores(proposal)
      calculator = FairnessCalculator.new(proposal)
      
      proposal.strength_balance_score = calculator.calculate_strength_balance
      proposal.travel_efficiency_score = calculator.calculate_travel_efficiency
      proposal.schedule_preference_score = calculator.calculate_schedule_preference
      proposal.home_away_balance_score = calculator.calculate_home_away_balance
      
      proposal.calculate_overall_score
      proposal.save!
    end

    def perform_ai_analysis(proposal)
      ai_client = create_ai_client
      return unless ai_client

      prompt = build_ai_analysis_prompt(proposal)
      response = ai_client.analyze(prompt)

      proposal.update!(
        ai_analysis_result: {
          summary: response[:summary],
          suggestions: response[:suggestions],
          concerns: response[:concerns],
          analyzed_at: Time.current
        }
      )
    end

    def create_ai_client
      case config.ai_provider
      when 'openai'
        Ai::OpenAiClient.new(config.api_key)
      when 'claude'
        Ai::ClaudeClient.new(config.api_key)
      else
        nil
      end
    end

    def build_ai_analysis_prompt(proposal)
      teams_info = proposal.affected_teams.map do |team|
        strength = team.current_strength_metric
        {
          name: team.name,
          city: team.city,
          strength_rating: strength&.overall_rating || 0.5,
          recent_form: strength&.recent_form_rating || 0.5,
          games_played: strength&.games_played || 0
        }
      end

      matches_info = proposal.match_proposal_details.map do |detail|
        {
          home_team: detail.home_team.name,
          away_team: detail.away_team.name,
          date: detail.proposed_datetime.strftime("%Y-%m-%d %H:%M"),
          travel_distance: detail.travel_distance_km.round(1),
          strength_difference: detail.strength_difference.round(3)
        }
      end

      <<~PROMPT
        草野球リーグのマッチングスケジュールを分析してください。

        リーグ情報:
        - リーグ名: #{league.name}
        - チーム数: #{teams_info.size}
        - 試合数: #{matches_info.size}

        チーム情報:
        #{teams_info.to_json}

        提案された試合:
        #{matches_info.to_json}

        評価スコア:
        - 戦力バランス: #{proposal.strength_balance_score&.round(3) || 'N/A'}
        - 移動効率: #{proposal.travel_efficiency_score&.round(3) || 'N/A'}
        - スケジュール選好: #{proposal.schedule_preference_score&.round(3) || 'N/A'}
        - ホーム/アウェイバランス: #{proposal.home_away_balance_score&.round(3) || 'N/A'}

        以下の観点で分析してください:
        1. 全体的な公平性と競争バランス
        2. 移動負担の分散
        3. 強豪チーム同士の対戦機会
        4. 改善可能な点
        5. 潜在的な問題点

        JSON形式で以下の構造で回答してください:
        {
          "summary": "全体的な評価の要約",
          "suggestions": ["改善提案1", "改善提案2", ...],
          "concerns": ["懸念事項1", "懸念事項2", ...]
        }
      PROMPT
    end

    def apply_optimized_schedule(match_proposal, optimized_schedule)
      match_proposal.match_proposal_details.each_with_index do |detail, index|
        if optimized_schedule[index]
          detail.update!(
            proposed_datetime: optimized_schedule[index][:datetime],
            proposed_venue: optimized_schedule[index][:venue]
          )
        end
      end

      match_proposal.update!(
        proposal_metadata: match_proposal.proposal_metadata.merge(
          optimized_at: Time.current,
          optimization_type: 'travel_distance'
        )
      )
    end

    def handle_constraint_violations(match_proposal, violations)
      match_proposal.update!(
        status: :rejected,
        rejection_reasons: violations.map { |v| v[:message] }
      )
    end
  end
end