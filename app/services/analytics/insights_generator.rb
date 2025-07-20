# frozen_string_literal: true

module Analytics
  class InsightsGenerator
    attr_reader :errors

    def initialize
      @errors = []
    end

    # Generate optimal lineup recommendations
    def generate_lineup_recommendations(team, opponent: nil, weather_conditions: nil)
      return nil unless valid_team?(team)

      available_players = fetch_available_players(team)
      return nil if available_players.empty?

      lineup_options = []
      
      # Generate multiple lineup options
      3.times do |i|
        strategy = [:balanced, :power_focused, :contact_focused][i]
        lineup = build_optimal_lineup(available_players, strategy: strategy, opponent: opponent)
        
        if lineup
          lineup_score = evaluate_lineup(lineup, opponent, weather_conditions)
          
          lineup_options << {
            strategy: strategy,
            lineup: lineup,
            score: lineup_score,
            strengths: identify_lineup_strengths(lineup),
            weaknesses: identify_lineup_weaknesses(lineup),
            key_matchups: analyze_key_matchups(lineup, opponent)
          }
        end
      end

      # Sort by score and return best options
      lineup_options.sort_by! { |opt| -opt[:score] }

      {
        team_id: team.id,
        team_name: team.name,
        opponent: opponent&.name,
        recommendations: lineup_options,
        weather_impact: analyze_weather_impact(weather_conditions),
        generated_at: Time.current
      }
    end

    # Generate player development plans
    def generate_player_development_plan(player)
      return nil unless valid_player?(player)

      analytics = player.player_analytics.order(calculated_at: :desc).first
      recent_stats = player.player_stats.recent.limit(20)
      
      return nil if analytics.nil? || recent_stats.empty?

      # Analyze current performance
      performance_analysis = analyze_player_performance(player, analytics, recent_stats)
      
      # Identify areas for improvement
      improvement_areas = identify_improvement_areas(performance_analysis)
      
      # Generate specific recommendations
      training_plan = generate_training_recommendations(player, improvement_areas)
      
      # Set realistic goals
      performance_goals = set_performance_goals(player, analytics, improvement_areas)

      {
        player_id: player.id,
        player_name: player.name,
        current_performance: performance_analysis,
        improvement_areas: improvement_areas,
        training_plan: training_plan,
        performance_goals: performance_goals,
        timeline: generate_development_timeline(improvement_areas),
        priority_focus: determine_priority_focus(improvement_areas)
      }
    end

    # Analyze matchup advantages
    def analyze_player_matchups(batter, pitcher_team)
      return nil unless batter && pitcher_team

      # Get pitcher statistics from the opposing team
      pitchers = pitcher_team.players.where(position: 'pitcher')
      
      matchup_data = []
      
      pitchers.each do |pitcher|
        historical_matchup = analyze_historical_matchup(batter, pitcher)
        predicted_success = predict_matchup_success(batter, pitcher)
        
        matchup_data << {
          pitcher_id: pitcher.id,
          pitcher_name: pitcher.name,
          historical_data: historical_matchup,
          predicted_success_rate: predicted_success,
          advantage: determine_matchup_advantage(predicted_success),
          key_factors: identify_matchup_factors(batter, pitcher)
        }
      end

      {
        batter_id: batter.id,
        batter_name: batter.name,
        vs_team: pitcher_team.name,
        matchups: matchup_data.sort_by { |m| -m[:predicted_success_rate] },
        overall_advantage: calculate_overall_advantage(matchup_data),
        recommendations: generate_matchup_recommendations(batter, matchup_data)
      }
    end

    # Generate team strategy insights
    def generate_team_strategy_insights(team, upcoming_matches: 5)
      return nil unless valid_team?(team)

      upcoming_opponents = fetch_upcoming_opponents(team, upcoming_matches)
      team_analytics = team.team_analytics.order(calculated_at: :desc).first
      
      strategy_insights = {
        team_id: team.id,
        team_name: team.name,
        current_form: analyze_current_form(team),
        opponent_analysis: [],
        tactical_recommendations: [],
        roster_adjustments: []
      }

      # Analyze each upcoming opponent
      upcoming_opponents.each do |opponent|
        opponent_analysis = analyze_opponent(team, opponent)
        strategy_insights[:opponent_analysis] << opponent_analysis
        
        # Generate specific tactical recommendations
        tactics = generate_tactical_recommendations(team, opponent, opponent_analysis)
        strategy_insights[:tactical_recommendations] << tactics
      end

      # Suggest roster adjustments
      strategy_insights[:roster_adjustments] = suggest_roster_adjustments(team, team_analytics)
      
      # Overall strategic direction
      strategy_insights[:strategic_direction] = determine_strategic_direction(team, strategy_insights)

      strategy_insights
    end

    # Generate competitive balance insights
    def analyze_competitive_balance(organization, season: nil)
      teams = organization.teams.includes(:team_analytics, :players)
      
      balance_metrics = {
        organization_id: organization.id,
        season_id: season&.id,
        team_strength_distribution: calculate_strength_distribution(teams, season),
        competitive_index: calculate_competitive_index(teams, season),
        parity_analysis: analyze_parity(teams, season),
        recommendations: []
      }

      # Identify imbalances
      imbalances = identify_competitive_imbalances(balance_metrics)
      
      # Generate recommendations for improving balance
      if imbalances.any?
        balance_metrics[:recommendations] = generate_balance_recommendations(imbalances, teams)
      end

      balance_metrics
    end

    private

    def valid_team?(team)
      if team.nil? || !team.is_a?(Team)
        @errors << "Invalid team object"
        return false
      end
      true
    end

    def valid_player?(player)
      if player.nil? || !player.is_a?(Player)
        @errors << "Invalid player object"
        return false
      end
      true
    end

    def fetch_available_players(team)
      team.players
          .includes(:player_analytics)
          .where(active: true)
          .select { |p| p.player_analytics.any? }
    end

    def build_optimal_lineup(players, strategy:, opponent: nil)
      positions = ['catcher', 'first_base', 'second_base', 'third_base', 
                   'shortstop', 'left_field', 'center_field', 'right_field']
      
      lineup = []
      used_players = []

      # Fill positions first
      positions.each do |position|
        position_players = players.select { |p| p.position == position && !used_players.include?(p) }
        
        if position_players.any?
          best_player = select_best_for_position(position_players, strategy)
          lineup << best_player
          used_players << best_player
        end
      end

      # Add designated hitter or additional players
      remaining_players = players - used_players
      if remaining_players.any?
        dh = select_best_hitter(remaining_players, strategy)
        lineup << dh if dh
      end

      # Order lineup optimally
      order_lineup(lineup, strategy)
    end

    def select_best_for_position(players, strategy)
      case strategy
      when :power_focused
        players.max_by { |p| p.player_analytics.first&.slugging_percentage || 0 }
      when :contact_focused
        players.max_by { |p| p.player_analytics.first&.batting_average || 0 }
      else # balanced
        players.max_by { |p| p.player_analytics.first&.ops || 0 }
      end
    end

    def select_best_hitter(players, strategy)
      case strategy
      when :power_focused
        players.max_by { |p| p.player_analytics.first&.slugging_percentage || 0 }
      when :contact_focused
        players.max_by { |p| p.player_analytics.first&.batting_average || 0 }
      else
        players.max_by { |p| p.player_analytics.first&.ops || 0 }
      end
    end

    def order_lineup(players, strategy)
      return [] if players.empty?

      analytics_data = players.map do |player|
        analytics = player.player_analytics.first
        {
          player: player,
          ops: analytics&.ops || 0,
          obp: analytics&.on_base_percentage || 0,
          slg: analytics&.slugging_percentage || 0,
          avg: analytics&.batting_average || 0,
          speed: estimate_speed(player)
        }
      end

      ordered = []
      
      # Traditional lineup construction
      # 1. Leadoff - High OBP, good speed
      leadoff = analytics_data.max_by { |d| d[:obp] * 0.7 + d[:speed] * 0.3 }
      ordered << leadoff[:player]
      analytics_data.delete(leadoff)

      # 2. Second - Contact hitter, good bat control
      second = analytics_data.max_by { |d| d[:avg] * 0.6 + d[:obp] * 0.4 }
      ordered << second[:player] if second
      analytics_data.delete(second) if second

      # 3. Best hitter
      third = analytics_data.max_by { |d| d[:ops] }
      ordered << third[:player] if third
      analytics_data.delete(third) if third

      # 4. Cleanup - Power hitter
      cleanup = analytics_data.max_by { |d| d[:slg] }
      ordered << cleanup[:player] if cleanup
      analytics_data.delete(cleanup) if cleanup

      # 5-9. Remaining by OPS
      remaining = analytics_data.sort_by { |d| -d[:ops] }
      remaining.each { |d| ordered << d[:player] }

      ordered
    end

    def estimate_speed(player)
      # Estimate based on stolen bases and position
      stats = player.player_stats.recent.limit(20)
      stolen_bases = stats.sum(:stolen_bases)
      
      # Adjust for position (middle infielders and outfielders typically faster)
      position_modifier = case player.position
                         when 'second_base', 'shortstop', 'center_field'
                           1.2
                         when 'left_field', 'right_field', 'third_base'
                           1.0
                         else
                           0.8
                         end
      
      (stolen_bases.to_f / stats.count * position_modifier).round(3)
    end

    def evaluate_lineup(lineup, opponent, weather_conditions)
      return 0.0 if lineup.empty?

      score = 0.0
      
      # Evaluate individual player contributions
      lineup.each_with_index do |player, index|
        analytics = player.player_analytics.first
        next unless analytics

        # Position in lineup matters
        position_weight = case index
                         when 0..2 then 1.2  # Top of order
                         when 3..4 then 1.3  # Heart of order
                         else 1.0
                         end

        player_score = analytics.ops * position_weight
        score += player_score
      end

      # Adjust for opponent if provided
      if opponent
        opponent_factor = calculate_opponent_adjustment(lineup, opponent)
        score *= opponent_factor
      end

      # Adjust for weather if provided
      if weather_conditions
        weather_factor = calculate_weather_adjustment(lineup, weather_conditions)
        score *= weather_factor
      end

      score.round(3)
    end

    def calculate_opponent_adjustment(lineup, opponent)
      # Simplified opponent adjustment based on their pitching strength
      opponent_era = opponent.team_analytics.first&.team_era || 4.50
      
      # Lower ERA = stronger pitching = lower adjustment factor
      adjustment = 4.50 / opponent_era
      [adjustment, 1.5].min
    end

    def calculate_weather_adjustment(lineup, conditions)
      return 1.0 unless conditions

      # Simplified weather impact
      case conditions[:type]
      when 'rain'
        0.9  # Reduces offense
      when 'wind'
        conditions[:direction] == 'out' ? 1.1 : 0.95
      when 'cold'
        0.95  # Cold weather typically reduces offense
      else
        1.0
      end
    end

    def identify_lineup_strengths(lineup)
      strengths = []
      
      # Calculate aggregate stats
      total_ops = lineup.sum { |p| p.player_analytics.first&.ops || 0 }
      avg_ops = total_ops / lineup.count
      
      strengths << "High overall OPS (#{avg_ops.round(3)})" if avg_ops > 0.750
      
      # Check for power
      total_hr = lineup.sum { |p| p.player_stats.recent.limit(20).sum(:home_runs) }
      strengths << "Strong power hitting (#{total_hr} HR in last 20 games)" if total_hr > lineup.count * 2
      
      # Check for speed
      total_sb = lineup.sum { |p| p.player_stats.recent.limit(20).sum(:stolen_bases) }
      strengths << "Good team speed (#{total_sb} SB in last 20 games)" if total_sb > lineup.count
      
      strengths
    end

    def identify_lineup_weaknesses(lineup)
      weaknesses = []
      
      # Check for low batting averages
      low_avg_count = lineup.count { |p| (p.player_analytics.first&.batting_average || 0) < 0.230 }
      weaknesses << "#{low_avg_count} players batting below .230" if low_avg_count > 2
      
      # Check for high strikeout rates
      high_k_players = lineup.select do |p|
        stats = p.player_stats.recent.limit(10)
        k_rate = stats.sum(:strikeouts).to_f / stats.sum(:at_bats) rescue 0
        k_rate > 0.25
      end
      weaknesses << "High strikeout rate (#{high_k_players.count} players)" if high_k_players.count > 3
      
      weaknesses
    end

    def analyze_key_matchups(lineup, opponent)
      return [] unless opponent
      
      key_matchups = []
      
      # Simplified matchup analysis
      opponent_pitchers = opponent.players.where(position: 'pitcher').limit(3)
      
      lineup.first(4).each do |batter|
        opponent_pitchers.each do |pitcher|
          matchup_score = rand(0.200..0.400)  # Simplified - would use historical data
          
          key_matchups << {
            batter: batter.name,
            pitcher: pitcher.name,
            projected_avg: matchup_score.round(3),
            advantage: matchup_score > 0.300 ? 'batter' : 'pitcher'
          }
        end
      end
      
      key_matchups.sort_by { |m| -m[:projected_avg] }.first(5)
    end

    def analyze_weather_impact(conditions)
      return nil unless conditions
      
      {
        condition: conditions[:type],
        impact_on_hitting: weather_hitting_impact(conditions),
        impact_on_pitching: weather_pitching_impact(conditions),
        impact_on_fielding: weather_fielding_impact(conditions),
        overall_recommendation: weather_recommendation(conditions)
      }
    end

    def weather_hitting_impact(conditions)
      case conditions[:type]
      when 'rain'
        "Reduced visibility and grip may lower batting averages"
      when 'wind'
        conditions[:direction] == 'out' ? 
          "Wind blowing out favors fly balls and home runs" : 
          "Wind blowing in suppresses fly balls"
      when 'cold'
        "Cold weather typically reduces ball flight distance"
      else
        "Neutral conditions for hitting"
      end
    end

    def weather_pitching_impact(conditions)
      case conditions[:type]
      when 'rain'
        "Wet conditions may affect grip and control"
      when 'wind'
        "Wind may affect breaking ball movement"
      when 'cold'
        "Cold weather may reduce pitcher flexibility"
      else
        "Neutral conditions for pitching"
      end
    end

    def weather_fielding_impact(conditions)
      case conditions[:type]
      when 'rain'
        "Wet field increases error probability"
      when 'wind'
        "Wind affects fly ball tracking"
      when 'cold'
        "Cold weather may affect fielder reaction time"
      else
        "Neutral conditions for fielding"
      end
    end

    def weather_recommendation(conditions)
      case conditions[:type]
      when 'rain'
        "Focus on contact hitting and sure-handed fielders"
      when 'wind'
        conditions[:direction] == 'out' ? 
          "Consider power hitters in lineup" : 
          "Emphasize contact hitters and ground ball approach"
      when 'cold'
        "Warm up thoroughly and focus on fundamentals"
      else
        "Standard game approach recommended"
      end
    end

    def analyze_player_performance(player, analytics, recent_stats)
      {
        current_level: {
          batting_average: analytics.batting_average,
          ops: analytics.ops,
          fielding_percentage: analytics.fielding_percentage,
          consistency_score: analytics.consistency_score
        },
        recent_trend: analytics.performance_trend,
        strengths: identify_player_strengths(analytics),
        weaknesses: identify_player_weaknesses(analytics),
        comparison_to_position: {
          ops_rank: analytics.position_rank,
          percentile: calculate_percentile(analytics.position_rank, player.position)
        }
      }
    end

    def identify_player_strengths(analytics)
      strengths = []
      
      strengths << "Elite OPS (#{analytics.ops})" if analytics.ops > 0.850
      strengths << "High batting average (#{analytics.batting_average})" if analytics.batting_average > 0.300
      strengths << "Excellent fielding (#{analytics.fielding_percentage})" if analytics.fielding_percentage > 0.980
      strengths << "Very consistent performer" if analytics.consistency_score > 0.75
      
      strengths
    end

    def identify_player_weaknesses(analytics)
      weaknesses = []
      
      weaknesses << "Low batting average (#{analytics.batting_average})" if analytics.batting_average < 0.230
      weaknesses << "Below average OPS (#{analytics.ops})" if analytics.ops < 0.650
      weaknesses << "Fielding needs work (#{analytics.errors_count} errors)" if analytics.errors_count > 10
      weaknesses << "Inconsistent performance" if analytics.consistency_score < 0.40
      
      weaknesses
    end

    def identify_improvement_areas(performance_analysis)
      areas = []
      
      current = performance_analysis[:current_level]
      
      # Batting improvements
      if current[:batting_average] < 0.250
        areas << {
          area: 'batting_average',
          current: current[:batting_average],
          target: 0.270,
          priority: 'high',
          focus: 'contact_hitting'
        }
      end
      
      if current[:ops] < 0.700
        areas << {
          area: 'on_base_plus_slugging',
          current: current[:ops],
          target: 0.750,
          priority: 'high',
          focus: 'plate_discipline_and_power'
        }
      end
      
      # Fielding improvements
      if current[:fielding_percentage] < 0.970
        areas << {
          area: 'fielding',
          current: current[:fielding_percentage],
          target: 0.975,
          priority: 'medium',
          focus: 'defensive_fundamentals'
        }
      end
      
      # Consistency improvements
      if current[:consistency_score] < 0.60
        areas << {
          area: 'consistency',
          current: current[:consistency_score],
          target: 0.70,
          priority: 'medium',
          focus: 'mental_preparation'
        }
      end
      
      areas.sort_by { |a| a[:priority] == 'high' ? 0 : 1 }
    end

    def generate_training_recommendations(player, improvement_areas)
      recommendations = []
      
      improvement_areas.each do |area|
        case area[:focus]
        when 'contact_hitting'
          recommendations << {
            type: 'batting_practice',
            focus: 'Contact drills with emphasis on bat control',
            frequency: 'Daily',
            duration: '45 minutes',
            specific_drills: [
              'Tee work focusing on opposite field hitting',
              'Soft toss with two-strike approach',
              'Live pitching with contact-only goals'
            ]
          }
        when 'plate_discipline_and_power'
          recommendations << {
            type: 'hitting_development',
            focus: 'Improve pitch recognition and power generation',
            frequency: '5 times per week',
            duration: '60 minutes',
            specific_drills: [
              'Video analysis of pitch recognition',
              'Weighted bat training for power',
              'Strike zone awareness drills'
            ]
          }
        when 'defensive_fundamentals'
          recommendations << {
            type: 'fielding_practice',
            focus: 'Improve glove work and footwork',
            frequency: '4 times per week',
            duration: '30 minutes',
            specific_drills: [
              'Ground ball repetitions',
              'Double play turns',
              'Backhand and forehand practice'
            ]
          }
        when 'mental_preparation'
          recommendations << {
            type: 'mental_training',
            focus: 'Develop consistent pre-game routines',
            frequency: 'Before every game',
            duration: '20 minutes',
            specific_drills: [
              'Visualization exercises',
              'Breathing techniques',
              'Game situation mental rehearsal'
            ]
          }
        end
      end
      
      recommendations
    end

    def set_performance_goals(player, analytics, improvement_areas)
      goals = []
      
      # Set 30-day, 60-day, and season goals
      improvement_areas.each do |area|
        current_value = area[:current]
        target_value = area[:target]
        
        # Calculate incremental goals
        improvement_needed = target_value - current_value
        
        goals << {
          metric: area[:area],
          current: current_value,
          goals: {
            '30_days': (current_value + improvement_needed * 0.3).round(3),
            '60_days': (current_value + improvement_needed * 0.6).round(3),
            'season_end': target_value
          },
          tracking_method: determine_tracking_method(area[:area])
        }
      end
      
      goals
    end

    def determine_tracking_method(metric)
      case metric
      when 'batting_average'
        'Monitor weekly batting average over minimum 20 at-bats'
      when 'on_base_plus_slugging'
        'Track OPS in 10-game rolling windows'
      when 'fielding'
        'Record errors and total chances weekly'
      when 'consistency'
        'Calculate game-to-game variance in performance'
      else
        'Regular statistical tracking'
      end
    end

    def generate_development_timeline(improvement_areas)
      {
        immediate: improvement_areas.select { |a| a[:priority] == 'high' }
                                   .map { |a| "Focus on #{a[:focus].humanize}" },
        short_term: "First 30 days: Establish new training routines and measure baseline",
        medium_term: "30-60 days: Expect to see initial improvements in key metrics",
        long_term: "Full season: Achieve target performance levels and maintain consistency"
      }
    end

    def determine_priority_focus(improvement_areas)
      high_priority = improvement_areas.find { |a| a[:priority] == 'high' }
      
      return "No urgent areas identified" unless high_priority
      
      case high_priority[:focus]
      when 'contact_hitting'
        "Primary focus: Improving contact rate and batting average through mechanical adjustments"
      when 'plate_discipline_and_power'
        "Primary focus: Enhancing pitch selection and power generation"
      when 'defensive_fundamentals'
        "Primary focus: Reducing errors through improved fielding technique"
      else
        "Primary focus: Building consistency through mental preparation"
      end
    end

    def calculate_percentile(rank, position)
      return nil unless rank
      
      # Estimate based on typical number of players per position
      estimated_total = 30  # Rough estimate for league size
      
      percentile = ((estimated_total - rank + 1).to_f / estimated_total * 100).round(0)
      [percentile, 100].min
    end

    def analyze_historical_matchup(batter, pitcher)
      # In a real implementation, would query historical match data
      # For now, return simulated data
      {
        at_bats: 0,
        hits: 0,
        home_runs: 0,
        strikeouts: 0,
        batting_average: 0.000,
        sample_size: 'no_data'
      }
    end

    def predict_matchup_success(batter, pitcher)
      # Simplified prediction based on player analytics
      batter_analytics = batter.player_analytics.first
      pitcher_analytics = pitcher.player_analytics.first
      
      return 0.250 unless batter_analytics  # Default batting average
      
      # Simple prediction: batter's OPS adjusted by pitcher's ERA
      base_success = batter_analytics.batting_average
      
      if pitcher_analytics && pitcher_analytics.respond_to?(:era)
        era_factor = 4.50 / (pitcher_analytics.era || 4.50)
        success_rate = base_success * era_factor
      else
        success_rate = base_success
      end
      
      [success_rate, 0.500].min.round(3)
    end

    def determine_matchup_advantage(success_rate)
      case success_rate
      when 0.300..1.000
        'batter'
      when 0.250..0.300
        'neutral'
      else
        'pitcher'
      end
    end

    def identify_matchup_factors(batter, pitcher)
      factors = []
      
      batter_analytics = batter.player_analytics.first
      return factors unless batter_analytics
      
      # Simplified factor identification
      factors << "Batter has high OPS (#{batter_analytics.ops})" if batter_analytics.ops > 0.800
      factors << "Batter struggles with consistency" if batter_analytics.consistency_score < 0.50
      
      factors
    end

    def calculate_overall_advantage(matchup_data)
      return 'neutral' if matchup_data.empty?
      
      advantages = matchup_data.map { |m| m[:advantage] }
      batter_advantages = advantages.count('batter')
      pitcher_advantages = advantages.count('pitcher')
      
      if batter_advantages > pitcher_advantages * 1.5
        'strong_batter_advantage'
      elsif batter_advantages > pitcher_advantages
        'slight_batter_advantage'
      elsif pitcher_advantages > batter_advantages * 1.5
        'strong_pitcher_advantage'
      elsif pitcher_advantages > batter_advantages
        'slight_pitcher_advantage'
      else
        'neutral'
      end
    end

    def generate_matchup_recommendations(batter, matchup_data)
      recommendations = []
      
      favorable_matchups = matchup_data.select { |m| m[:advantage] == 'batter' }
      difficult_matchups = matchup_data.select { |m| m[:advantage] == 'pitcher' }
      
      if favorable_matchups.any?
        recommendations << "Look to be aggressive against: #{favorable_matchups.first[:pitcher_name]}"
      end
      
      if difficult_matchups.any?
        recommendations << "Be patient and work counts against: #{difficult_matchups.first[:pitcher_name]}"
      end
      
      recommendations
    end

    def fetch_upcoming_opponents(team, count)
      team.matches
          .upcoming
          .limit(count)
          .map { |match| match.home_team == team ? match.away_team : match.home_team }
          .compact
    end

    def analyze_current_form(team)
      recent_matches = team.matches.completed.recent.limit(10)
      
      wins = recent_matches.count { |m| m.winner == team }
      win_rate = recent_matches.any? ? (wins.to_f / recent_matches.count).round(3) : 0.0
      
      {
        last_10_record: "#{wins}-#{recent_matches.count - wins}",
        win_rate: win_rate,
        form_rating: form_rating(win_rate),
        recent_results: recent_matches.map { |m| m.winner == team ? 'W' : 'L' }.join('-')
      }
    end

    def form_rating(win_rate)
      case win_rate
      when 0.700..1.000
        'excellent'
      when 0.550..0.700
        'good'
      when 0.450..0.550
        'average'
      when 0.300..0.450
        'poor'
      else
        'struggling'
      end
    end

    def analyze_opponent(team, opponent)
      opponent_analytics = opponent.team_analytics.order(calculated_at: :desc).first
      
      {
        opponent_id: opponent.id,
        opponent_name: opponent.name,
        strength_rating: opponent_analytics&.winning_percentage || 0.500,
        key_players: opponent_analytics&.top_performers || [],
        weaknesses: identify_team_weaknesses(opponent_analytics),
        recent_form: analyze_current_form(opponent)
      }
    end

    def identify_team_weaknesses(team_analytics)
      weaknesses = []
      
      return weaknesses unless team_analytics
      
      weaknesses << "Low team batting average" if team_analytics.team_batting_average < 0.240
      weaknesses << "Poor pitching (high ERA)" if team_analytics.team_era > 5.00
      weaknesses << "Weak defense" if team_analytics.team_fielding_percentage < 0.970
      
      # Check position weaknesses
      if team_analytics.position_strength_analysis
        weak_positions = team_analytics.position_strength_analysis.select do |pos, data|
          data[:average_ops] < 0.650
        end
        
        weaknesses << "Weak at: #{weak_positions.keys.join(', ')}" if weak_positions.any?
      end
      
      weaknesses
    end

    def generate_tactical_recommendations(team, opponent, analysis)
      recommendations = {
        opponent: opponent.name,
        offensive_strategy: [],
        defensive_strategy: [],
        key_matchups: []
      }
      
      # Offensive recommendations based on opponent weaknesses
      if analysis[:weaknesses].any? { |w| w.include?('pitching') }
        recommendations[:offensive_strategy] << "Be aggressive early in counts"
        recommendations[:offensive_strategy] << "Look for extra-base hit opportunities"
      end
      
      # Defensive recommendations
      if analysis[:key_players].any?
        top_hitter = analysis[:key_players].first
        recommendations[:defensive_strategy] << "Focus on containing #{top_hitter[:name]}"
      end
      
      recommendations
    end

    def suggest_roster_adjustments(team, team_analytics)
      suggestions = []
      
      return suggestions unless team_analytics
      
      # Check for underperforming positions
      if team_analytics.position_strength_analysis
        weak_positions = team_analytics.position_strength_analysis.select do |pos, data|
          data[:average_ops] < 0.650
        end
        
        weak_positions.each do |position, data|
          suggestions << {
            position: position,
            current_performance: data[:average_ops],
            recommendation: "Consider lineup adjustment or player development for #{position}"
          }
        end
      end
      
      # Check for declining players
      if team_analytics.improvement_candidates && team_analytics.improvement_candidates.any?
        team_analytics.improvement_candidates.first(2).each do |player_data|
          suggestions << {
            player: player_data[:name],
            issue: "Performance decline detected",
            recommendation: "Consider reduced playing time or development focus"
          }
        end
      end
      
      suggestions
    end

    def determine_strategic_direction(team, insights)
      current_form = insights[:current_form][:form_rating]
      
      direction = {
        overall_approach: nil,
        focus_areas: [],
        timeline: nil
      }
      
      case current_form
      when 'excellent'
        direction[:overall_approach] = "Maintain current strategies and momentum"
        direction[:focus_areas] = ["Consistency", "Injury prevention", "Mental edge"]
        direction[:timeline] = "Continue current approach through next 10 games"
      when 'good'
        direction[:overall_approach] = "Build on strengths while addressing minor weaknesses"
        direction[:focus_areas] = ["Capitalize on favorable matchups", "Develop bench players"]
        direction[:timeline] = "Implement minor adjustments over next 5 games"
      when 'average', 'poor'
        direction[:overall_approach] = "Strategic adjustments needed to improve results"
        direction[:focus_areas] = ["Address roster weaknesses", "Tactical flexibility", "Player development"]
        direction[:timeline] = "Immediate changes with reassessment in 7 games"
      when 'struggling'
        direction[:overall_approach] = "Significant changes required"
        direction[:focus_areas] = ["Major lineup changes", "Intensive practice", "Mental reset"]
        direction[:timeline] = "Urgent intervention with daily monitoring"
      end
      
      direction
    end

    def calculate_strength_distribution(teams, season)
      team_strengths = teams.map do |team|
        analytics = team.team_analytics.find_by(season_id: season&.id)
        {
          team_id: team.id,
          team_name: team.name,
          strength_score: calculate_team_strength_score(analytics),
          winning_percentage: analytics&.winning_percentage || 0.500
        }
      end
      
      team_strengths.sort_by { |t| -t[:strength_score] }
    end

    def calculate_team_strength_score(analytics)
      return 0.500 unless analytics
      
      # Composite score based on multiple factors
      factors = {
        winning_percentage: analytics.winning_percentage || 0.500,
        team_ops: normalize_ops(analytics.team_batting_average),
        pitching: normalize_era(analytics.team_era),
        defense: analytics.team_fielding_percentage || 0.970
      }
      
      # Weighted average
      weights = { winning_percentage: 0.4, team_ops: 0.3, pitching: 0.2, defense: 0.1 }
      
      score = factors.sum { |factor, value| value * weights[factor] }
      score.round(3)
    end

    def normalize_ops(batting_average)
      # Convert batting average to 0-1 scale
      # .300 is excellent, .200 is poor
      return 0.5 unless batting_average
      
      normalized = (batting_average - 0.200) / 0.100
      [[normalized, 0.0].max, 1.0].min
    end

    def normalize_era(era)
      # Convert ERA to 0-1 scale (inverted - lower is better)
      # 3.00 is excellent, 6.00 is poor
      return 0.5 unless era
      
      normalized = 1.0 - ((era - 3.00) / 3.00)
      [[normalized, 0.0].max, 1.0].min
    end

    def calculate_competitive_index(teams, season)
      strengths = teams.map do |team|
        analytics = team.team_analytics.find_by(season_id: season&.id)
        analytics&.winning_percentage || 0.500
      end
      
      return 0.500 if strengths.empty?
      
      # Calculate standard deviation
      mean = strengths.sum / strengths.count
      variance = strengths.map { |s| (s - mean) ** 2 }.sum / strengths.count
      std_dev = Math.sqrt(variance)
      
      # Convert to competitive index (0-1, where 1 is perfect parity)
      # Lower std_dev = higher competitive balance
      competitive_index = 1.0 - [std_dev * 4, 1.0].min
      competitive_index.round(3)
    end

    def analyze_parity(teams, season)
      win_percentages = teams.map do |team|
        analytics = team.team_analytics.find_by(season_id: season&.id)
        analytics&.winning_percentage || 0.500
      end
      
      {
        highest_win_pct: win_percentages.max,
        lowest_win_pct: win_percentages.min,
        spread: win_percentages.max - win_percentages.min,
        teams_above_600: win_percentages.count { |pct| pct > 0.600 },
        teams_below_400: win_percentages.count { |pct| pct < 0.400 },
        classification: classify_parity(win_percentages)
      }
    end

    def classify_parity(win_percentages)
      spread = win_percentages.max - win_percentages.min
      
      case spread
      when 0.0..0.200
        'excellent_parity'
      when 0.200..0.350
        'good_parity'
      when 0.350..0.500
        'moderate_parity'
      else
        'poor_parity'
      end
    end

    def identify_competitive_imbalances(metrics)
      imbalances = []
      
      # Check competitive index
      if metrics[:competitive_index] < 0.6
        imbalances << {
          type: 'competitive_balance',
          severity: 'high',
          description: 'Significant disparity in team strengths'
        }
      end
      
      # Check parity spread
      parity = metrics[:parity_analysis]
      if parity[:spread] > 0.400
        imbalances << {
          type: 'win_percentage_spread',
          severity: 'high',
          description: 'Large gap between best and worst teams'
        }
      end
      
      # Check concentration of strong teams
      if parity[:teams_above_600] > teams.count * 0.3
        imbalances << {
          type: 'top_heavy',
          severity: 'medium',
          description: 'Too many dominant teams'
        }
      end
      
      # Check concentration of weak teams
      if parity[:teams_below_400] > teams.count * 0.3
        imbalances << {
          type: 'bottom_heavy',
          severity: 'medium',
          description: 'Too many struggling teams'
        }
      end
      
      imbalances
    end

    def generate_balance_recommendations(imbalances, teams)
      recommendations = []
      
      imbalances.each do |imbalance|
        case imbalance[:type]
        when 'competitive_balance'
          recommendations << {
            category: 'roster_management',
            priority: 'high',
            suggestion: 'Consider implementing salary cap or player distribution rules',
            impact: 'Would help level playing field between teams'
          }
        when 'win_percentage_spread'
          recommendations << {
            category: 'player_development',
            priority: 'high',
            suggestion: 'Provide additional resources to struggling teams',
            impact: 'Would help weaker teams improve faster'
          }
        when 'top_heavy'
          recommendations << {
            category: 'competition_structure',
            priority: 'medium',
            suggestion: 'Consider draft system favoring weaker teams',
            impact: 'Would distribute talent more evenly'
          }
        when 'bottom_heavy'
          recommendations << {
            category: 'support_programs',
            priority: 'medium',
            suggestion: 'Implement coaching clinics and player development programs',
            impact: 'Would raise overall competition level'
          }
        end
      end
      
      recommendations.uniq { |r| r[:suggestion] }
    end
  end
end