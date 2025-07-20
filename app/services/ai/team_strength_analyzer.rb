# frozen_string_literal: true

module Ai
  class TeamStrengthAnalyzer
    attr_reader :league, :season

    def initialize(league, season = nil)
      @league = league
      @season = season
    end

    def analyze_all_teams
      league.teams.map do |team|
        analyze_team(team)
      end
    end

    def analyze_team(team)
      metric = TeamStrengthMetric.calculate_for_team(team, season: season)
      
      # Additional analysis
      metric.detailed_metrics.merge!(
        performance_trend: calculate_performance_trend(team),
        key_players: identify_key_players(team),
        weaknesses: identify_weaknesses(metric),
        matchup_advantages: calculate_matchup_advantages(team)
      )

      metric.save!
      metric
    end

    def teams_by_strength
      league.teams.includes(:current_strength_metric)
                  .sort_by { |t| -(t.current_strength_metric&.overall_rating || 0.0) }
    end

    def find_balanced_matchups(team, candidate_teams = nil)
      candidate_teams ||= league.teams.where.not(id: team.id)
      team_strength = team.current_strength_metric&.overall_rating || 0.5

      matchups = candidate_teams.map do |opponent|
        opponent_strength = opponent.current_strength_metric&.overall_rating || 0.5
        strength_diff = (team_strength - opponent_strength).abs

        {
          opponent: opponent,
          strength_difference: strength_diff,
          balance_score: 1.0 - strength_diff,
          predicted_outcome: predict_match_outcome(team, opponent)
        }
      end

      matchups.sort_by { |m| -m[:balance_score] }
    end

    def predict_match_outcome(home_team, away_team)
      home_metric = home_team.current_strength_metric
      away_metric = away_team.current_strength_metric

      return { home_win_probability: 0.5, away_win_probability: 0.5, tie_probability: 0.0 } unless home_metric && away_metric

      # Basic prediction model
      home_advantage = 0.1 # 10% home advantage
      strength_diff = home_metric.overall_rating - away_metric.overall_rating + home_advantage

      # Convert strength difference to win probability using logistic function
      home_win_prob = 1.0 / (1.0 + Math.exp(-strength_diff * 5))
      tie_prob = 0.1 * (1.0 - (strength_diff.abs * 2).clamp(0, 1))
      away_win_prob = 1.0 - home_win_prob - tie_prob

      {
        home_win_probability: home_win_prob.round(3),
        away_win_probability: away_win_prob.round(3),
        tie_probability: tie_prob.round(3),
        expected_score_difference: (strength_diff * 3).round(1)
      }
    end

    def head_to_head_analysis(team1, team2)
      matches = Match.where(
        "(home_team_id = :team1 AND away_team_id = :team2) OR (home_team_id = :team2 AND away_team_id = :team1)",
        team1: team1.id,
        team2: team2.id
      ).where(status: "completed")

      return { total_matches: 0, historical_balance: 0.5 } if matches.empty?

      team1_wins = matches.where(winner_team_id: team1.id).count
      team2_wins = matches.where(winner_team_id: team2.id).count
      ties = matches.count - team1_wins - team2_wins

      total_score_diff = matches.sum do |match|
        if match.home_team_id == team1.id
          match.home_score - match.away_score
        else
          match.away_score - match.home_score
        end
      end

      {
        total_matches: matches.count,
        team1_wins: team1_wins,
        team2_wins: team2_wins,
        ties: ties,
        team1_win_rate: matches.count > 0 ? (team1_wins.to_f / matches.count).round(3) : 0.0,
        average_score_difference: matches.count > 0 ? (total_score_diff.to_f / matches.count).round(2) : 0.0,
        last_match: matches.order(scheduled_at: :desc).first,
        historical_balance: calculate_historical_balance(team1_wins, team2_wins, ties)
      }
    end

    private

    def calculate_performance_trend(team)
      recent_metrics = team.team_strength_metrics
                           .order(created_at: :desc)
                           .limit(5)
                           .pluck(:overall_rating)
      
      return "stable" if recent_metrics.size < 2

      # Calculate trend
      trend_value = recent_metrics.each_cons(2).map { |a, b| b - a }.sum / (recent_metrics.size - 1)

      case trend_value
      when 0.05..Float::INFINITY
        "improving"
      when -0.05..0.05
        "stable"
      else
        "declining"
      end
    end

    def identify_key_players(team)
      # Analyze player contributions
      players = team.players.includes(:player_stats)
      
      key_players = players.select do |player|
        stats = player.player_stats.recent.first
        next false unless stats

        # Simple criteria for key players
        stats.batting_average > 0.300 ||
        stats.home_runs > 5 ||
        stats.rbis > 20 ||
        (stats.era && stats.era < 3.00)
      end

      key_players.map do |player|
        {
          name: player.name,
          position: player.position,
          impact_score: calculate_player_impact(player)
        }
      end.sort_by { |p| -p[:impact_score] }.first(3)
    end

    def calculate_player_impact(player)
      stats = player.player_stats.recent.first
      return 0.0 unless stats

      # Simple impact calculation
      batting_impact = (stats.batting_average || 0) * 100 +
                      (stats.home_runs || 0) * 10 +
                      (stats.rbis || 0) * 2

      pitching_impact = stats.era ? (10.0 / (stats.era + 1)) * 50 : 0

      [batting_impact, pitching_impact].max / 100.0
    end

    def identify_weaknesses(metric)
      weaknesses = []

      if metric.offensive_rating < 0.4
        weaknesses << { area: "offense", severity: "high", description: "得点力不足" }
      elsif metric.offensive_rating < 0.6
        weaknesses << { area: "offense", severity: "medium", description: "攻撃力改善の余地あり" }
      end

      if metric.defensive_rating < 0.4
        weaknesses << { area: "defense", severity: "high", description: "失点が多い" }
      elsif metric.defensive_rating < 0.6
        weaknesses << { area: "defense", severity: "medium", description: "守備力改善の余地あり" }
      end

      if metric.recent_form_rating < 0.3
        weaknesses << { area: "form", severity: "high", description: "最近の調子が悪い" }
      end

      weaknesses
    end

    def calculate_matchup_advantages(team)
      advantages = {}

      league.teams.where.not(id: team.id).each do |opponent|
        h2h = head_to_head_analysis(team, opponent)
        
        if h2h[:total_matches] >= 3 && h2h[:team1_win_rate] > 0.6
          advantages[opponent.id] = {
            opponent_name: opponent.name,
            historical_advantage: h2h[:team1_win_rate],
            reason: "過去の対戦成績が良い"
          }
        end
      end

      advantages
    end

    def calculate_historical_balance(team1_wins, team2_wins, ties)
      total = team1_wins + team2_wins + ties
      return 0.5 if total == 0

      # Balance score: 0 = team2 dominates, 0.5 = balanced, 1 = team1 dominates
      (team1_wins + ties * 0.5) / total.to_f
    end
  end
end