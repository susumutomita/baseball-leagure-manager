# frozen_string_literal: true

module Ai
  class FairnessCalculator
    attr_reader :match_proposal

    def initialize(match_proposal)
      @match_proposal = match_proposal
    end

    def calculate_all_scores
      {
        strength_balance: calculate_strength_balance,
        travel_efficiency: calculate_travel_efficiency,
        schedule_preference: calculate_schedule_preference,
        home_away_balance: calculate_home_away_balance,
        overall: calculate_overall_fairness
      }
    end

    def calculate_strength_balance
      details = match_proposal.match_proposal_details.includes(
        home_team: :current_strength_metric,
        away_team: :current_strength_metric
      )

      return 0.0 if details.empty?

      strength_differences = details.map do |detail|
        home_strength = detail.home_team.current_strength_metric&.overall_rating || 0.5
        away_strength = detail.away_team.current_strength_metric&.overall_rating || 0.5
        (home_strength - away_strength).abs
      end

      # Lower difference is better, so invert the score
      avg_difference = strength_differences.sum / strength_differences.size.to_f
      1.0 - [avg_difference, 1.0].min
    end

    def calculate_travel_efficiency
      details = match_proposal.match_proposal_details
      return 1.0 if details.empty?

      # Calculate total and average travel distances
      travel_distances = details.map(&:travel_distance_km)
      return 1.0 if travel_distances.all?(&:zero?)

      avg_distance = travel_distances.sum / travel_distances.size.to_f
      max_acceptable_distance = match_proposal.ai_matching_config.max_travel_distance_km || 100.0

      # Score based on how well we stay under the max acceptable distance
      efficiency_score = 1.0 - (avg_distance / max_acceptable_distance).clamp(0, 1)

      # Also consider variance in travel distances (lower variance is better)
      variance = calculate_variance(travel_distances, avg_distance)
      variance_penalty = (variance / (avg_distance + 1)).clamp(0, 0.2)

      [efficiency_score - variance_penalty, 0.0].max
    end

    def calculate_schedule_preference
      # This would integrate with team preferences if available
      # For now, we'll score based on match distribution over time
      
      details = match_proposal.match_proposal_details.order(:proposed_datetime)
      return 1.0 if details.size < 2

      # Check spacing between matches
      match_dates = details.pluck(:proposed_datetime)
      intervals = match_dates.each_cons(2).map { |a, b| (b - a).to_i / 1.day }
      
      min_days = match_proposal.ai_matching_config.min_days_between_matches
      
      # Count violations
      violations = intervals.count { |interval| interval < min_days }
      violation_rate = violations.to_f / intervals.size

      # Also check for good distribution (not too many matches in a short period)
      distribution_score = calculate_schedule_distribution(match_dates)

      # Combined score
      preference_score = (1.0 - violation_rate) * 0.7 + distribution_score * 0.3
      preference_score.clamp(0, 1)
    end

    def calculate_home_away_balance
      teams = match_proposal.affected_teams
      return 1.0 if teams.empty?

      details = match_proposal.match_proposal_details
      
      imbalances = teams.map do |team|
        home_games = details.count { |d| d.home_team_id == team.id }
        away_games = details.count { |d| d.away_team_id == team.id }
        total_games = home_games + away_games
        
        next 0 if total_games == 0
        
        # Perfect balance would be 50-50
        ideal_ratio = 0.5
        actual_ratio = home_games.to_f / total_games
        
        (ideal_ratio - actual_ratio).abs
      end

      avg_imbalance = imbalances.sum / imbalances.size.to_f
      
      # Also check consecutive home/away games
      consecutive_penalty = calculate_consecutive_games_penalty
      
      # Convert to score (lower imbalance is better)
      balance_score = 1.0 - (avg_imbalance * 2).clamp(0, 1)
      [balance_score - consecutive_penalty, 0.0].max
    end

    def calculate_overall_fairness
      config = match_proposal.ai_matching_config
      
      # Use configured weights
      weighted_sum = 
        config.weight_strength_balance * calculate_strength_balance +
        config.weight_travel_distance * calculate_travel_efficiency +
        config.weight_schedule_preference * calculate_schedule_preference +
        config.weight_home_away_balance * calculate_home_away_balance
      
      weighted_sum.clamp(0, 1)
    end

    def detailed_analysis
      scores = calculate_all_scores
      
      {
        scores: scores,
        issues: identify_fairness_issues(scores),
        suggestions: generate_improvement_suggestions(scores),
        team_analysis: analyze_team_fairness
      }
    end

    private

    def calculate_variance(values, mean)
      return 0.0 if values.size <= 1
      
      sum_squared_diff = values.sum { |v| (v - mean) ** 2 }
      sum_squared_diff / values.size.to_f
    end

    def calculate_schedule_distribution(match_dates)
      return 1.0 if match_dates.size < 2

      # Group matches by week
      weeks = match_dates.map { |d| d.beginning_of_week }.uniq
      matches_per_week = weeks.map do |week|
        match_dates.count { |d| d.beginning_of_week == week }
      end

      # Ideal would be even distribution
      ideal_per_week = match_dates.size.to_f / weeks.size
      
      # Calculate deviation from ideal
      deviations = matches_per_week.map { |count| ((count - ideal_per_week) / ideal_per_week).abs }
      avg_deviation = deviations.sum / deviations.size.to_f

      # Convert to score
      1.0 - [avg_deviation, 1.0].min
    end

    def calculate_consecutive_games_penalty
      config = match_proposal.ai_matching_config
      max_consecutive_home = config.max_consecutive_home_games
      max_consecutive_away = config.max_consecutive_away_games
      
      penalties = []
      
      match_proposal.affected_teams.each do |team|
        team_matches = match_proposal.match_proposal_details
                                    .select { |d| d.home_team_id == team.id || d.away_team_id == team.id }
                                    .sort_by(&:proposed_datetime)
        
        consecutive_home = 0
        consecutive_away = 0
        
        team_matches.each do |match|
          if match.home_team_id == team.id
            consecutive_home += 1
            consecutive_away = 0
            penalties << 0.1 if consecutive_home > max_consecutive_home
          else
            consecutive_away += 1
            consecutive_home = 0
            penalties << 0.1 if consecutive_away > max_consecutive_away
          end
        end
      end

      penalties.sum.clamp(0, 0.5)
    end

    def identify_fairness_issues(scores)
      issues = []
      
      if scores[:strength_balance] < 0.5
        issues << {
          type: :strength_imbalance,
          severity: :high,
          description: "チーム間の戦力差が大きい試合が多いです"
        }
      end

      if scores[:travel_efficiency] < 0.5
        issues << {
          type: :excessive_travel,
          severity: :medium,
          description: "移動距離が長い試合が多いです"
        }
      end

      if scores[:schedule_preference] < 0.5
        issues << {
          type: :poor_scheduling,
          severity: :medium,
          description: "試合間隔が短すぎる、または偏りがあります"
        }
      end

      if scores[:home_away_balance] < 0.5
        issues << {
          type: :home_away_imbalance,
          severity: :medium,
          description: "ホーム/アウェイのバランスが悪いチームがあります"
        }
      end

      issues
    end

    def generate_improvement_suggestions(scores)
      suggestions = []

      lowest_score = scores.min_by { |_, v| v }
      
      case lowest_score[0]
      when :strength_balance
        suggestions << "戦力が近いチーム同士の対戦を増やすことを検討してください"
        suggestions << "リーグを戦力別のディビジョンに分けることも効果的です"
      when :travel_efficiency
        suggestions << "地理的に近いチーム同士の対戦を優先してください"
        suggestions << "ブロック分けして、ブロック内での対戦を増やすことを検討してください"
      when :schedule_preference
        suggestions << "試合間隔を広げて、チームの負担を軽減してください"
        suggestions << "各チームの希望スケジュールを事前に収集することをお勧めします"
      when :home_away_balance
        suggestions << "各チームのホーム/アウェイ試合数を均等にしてください"
        suggestions << "連続してホームまたはアウェイになる試合を減らしてください"
      end

      suggestions
    end

    def analyze_team_fairness
      teams_analysis = {}
      
      match_proposal.affected_teams.each do |team|
        details = match_proposal.match_proposal_details
        team_matches = details.select { |d| d.home_team_id == team.id || d.away_team_id == team.id }
        
        home_games = team_matches.count { |m| m.home_team_id == team.id }
        away_games = team_matches.count { |m| m.away_team_id == team.id }
        
        travel_total = team_matches.sum do |match|
          match.away_team_id == team.id ? match.travel_distance_km : 0
        end

        avg_opponent_strength = team_matches.sum do |match|
          opponent = match.home_team_id == team.id ? match.away_team : match.home_team
          opponent.current_strength_metric&.overall_rating || 0.5
        end / team_matches.size.to_f

        teams_analysis[team.id] = {
          team_name: team.name,
          total_games: team_matches.size,
          home_games: home_games,
          away_games: away_games,
          home_percentage: (home_games.to_f / team_matches.size * 100).round(1),
          total_travel_km: travel_total.round(1),
          avg_travel_km: (travel_total / away_games).round(1),
          avg_opponent_strength: avg_opponent_strength.round(3),
          fairness_index: calculate_team_fairness_index(
            home_games, away_games, travel_total, avg_opponent_strength
          )
        }
      end

      teams_analysis
    end

    def calculate_team_fairness_index(home_games, away_games, travel_total, avg_opponent_strength)
      total_games = home_games + away_games
      return 0.0 if total_games == 0

      # Factors that contribute to fairness
      home_balance = 1.0 - ((home_games.to_f / total_games - 0.5).abs * 2)
      travel_factor = 1.0 - [travel_total / 1000.0, 1.0].min  # Normalize to 1000km
      opponent_balance = 1.0 - (avg_opponent_strength - 0.5).abs * 2

      # Weighted average
      (home_balance * 0.4 + travel_factor * 0.3 + opponent_balance * 0.3).clamp(0, 1)
    end
  end
end