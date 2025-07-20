# frozen_string_literal: true

module Analytics
  class PerformanceAnalyzer
    attr_reader :errors

    def initialize
      @errors = []
    end

    # Analyze individual player performance
    def analyze_player(player, season: nil, force_recalculate: false)
      return nil unless valid_player?(player)

      analytics = PlayerAnalytics.find_or_initialize_by(
        player: player,
        season: season,
        organization: player.organization
      )

      # Skip if recently calculated unless forced
      if !force_recalculate && analytics.persisted? && 
         analytics.calculated_at && analytics.calculated_at > 1.hour.ago
        return analytics
      end

      begin
        analytics.calculate_metrics
        analytics.calculate_rankings
        analytics.save!
        analytics
      rescue StandardError => e
        @errors << "Failed to analyze player #{player.name}: #{e.message}"
        Rails.logger.error "PlayerAnalytics Error: #{e.message}\n#{e.backtrace.join("\n")}"
        nil
      end
    end

    # Analyze all players in a team
    def analyze_team_players(team, season: nil)
      return [] unless valid_team?(team)

      results = []
      team.players.includes(:player_stats, :player_analytics).find_each do |player|
        analytics = analyze_player(player, season: season)
        results << analytics if analytics
      end

      results
    end

    # Perform league-wide analysis
    def analyze_league(organization, season: nil)
      return [] unless organization

      results = {
        player_analytics: [],
        team_analytics: [],
        top_performers: {},
        league_insights: {}
      }

      # Analyze all players
      organization.players.includes(:team, :player_stats).find_each do |player|
        analytics = analyze_player(player, season: season)
        results[:player_analytics] << analytics if analytics
      end

      # Analyze all teams
      organization.teams.find_each do |team|
        team_analytics = TeamAnalytics.calculate_for_team(team, season)
        results[:team_analytics] << team_analytics if team_analytics
      end

      # Calculate top performers
      results[:top_performers] = calculate_top_performers(organization, season)
      
      # Generate league insights
      results[:league_insights] = generate_league_insights(organization, season)

      results
    end

    # Compare players across different metrics
    def compare_players(player_ids, metrics: [:ops, :batting_average, :fielding_percentage])
      players = Player.where(id: player_ids).includes(:player_analytics)
      
      comparison = {}
      players.each do |player|
        analytics = player.player_analytics.order(calculated_at: :desc).first
        next unless analytics

        comparison[player.id] = {
          player_name: player.name,
          team: player.team&.name,
          position: player.position
        }

        metrics.each do |metric|
          comparison[player.id][metric] = analytics.send(metric) if analytics.respond_to?(metric)
        end
      end

      comparison
    end

    # Find breakout candidates
    def identify_breakout_candidates(organization, season: nil, limit: 10)
      candidates = []

      PlayerAnalytics
        .joins(:player)
        .where(organization: organization, season: season)
        .where(performance_trend: 'improving')
        .where('consistency_score > ?', 0.6)
        .includes(player: :team)
        .order(consistency_score: :desc)
        .limit(limit)
        .each do |analytics|
          
        player = analytics.player
        recent_stats = player.player_stats.recent.limit(10)
        
        improvement_rate = calculate_improvement_rate(recent_stats)
        
        candidates << {
          player_id: player.id,
          player_name: player.name,
          team: player.team&.name,
          position: player.position,
          current_ops: analytics.ops,
          batting_average: analytics.batting_average,
          performance_trend: analytics.performance_trend,
          consistency_score: analytics.consistency_score,
          improvement_rate: improvement_rate,
          games_analyzed: analytics.games_analyzed
        }
      end

      candidates.sort_by { |c| -c[:improvement_rate] }
    end

    # Analyze position depth across the league
    def analyze_position_depth(organization, season: nil)
      positions = %w[pitcher catcher first_base second_base third_base 
                     shortstop left_field center_field right_field]
      
      depth_analysis = {}

      positions.each do |position|
        position_players = organization.players
                                      .where(position: position)
                                      .joins(:player_analytics)
                                      .where(player_analytics: { season_id: season&.id })
                                      .includes(:team, :player_analytics)

        analytics_data = position_players.map do |player|
          analytics = player.player_analytics.find_by(season_id: season&.id)
          next unless analytics

          {
            player_id: player.id,
            player_name: player.name,
            team: player.team&.name,
            ops: analytics.ops,
            batting_average: analytics.batting_average,
            fielding_percentage: analytics.fielding_percentage,
            league_rank: analytics.league_rank,
            position_rank: analytics.position_rank
          }
        end.compact

        depth_analysis[position] = {
          total_players: analytics_data.count,
          average_ops: calculate_average(analytics_data.map { |d| d[:ops] }),
          top_performers: analytics_data.sort_by { |d| -d[:ops] }.first(3),
          distribution: calculate_distribution(analytics_data.map { |d| d[:ops] })
        }
      end

      depth_analysis
    end

    private

    def valid_player?(player)
      if player.nil?
        @errors << "Player cannot be nil"
        return false
      end

      unless player.is_a?(Player)
        @errors << "Invalid player object"
        return false
      end

      true
    end

    def valid_team?(team)
      if team.nil?
        @errors << "Team cannot be nil"
        return false
      end

      unless team.is_a?(Team)
        @errors << "Invalid team object"
        return false
      end

      true
    end

    def calculate_top_performers(organization, season)
      top_performers = {}

      # Top batters by OPS
      top_performers[:batters] = PlayerAnalytics
        .joins(:player)
        .where(organization: organization, season: season)
        .where.not(ops: nil)
        .where('games_analyzed > ?', 10)
        .order(ops: :desc)
        .limit(10)
        .includes(player: :team)
        .map do |analytics|
          {
            player_id: analytics.player.id,
            player_name: analytics.player.name,
            team: analytics.player.team&.name,
            ops: analytics.ops,
            batting_average: analytics.batting_average,
            home_runs: analytics.player.player_stats.where(season_id: season&.id).sum(:home_runs)
          }
        end

      # Top fielders by fielding percentage
      top_performers[:fielders] = PlayerAnalytics
        .joins(:player)
        .where(organization: organization, season: season)
        .where.not(fielding_percentage: nil)
        .where('games_analyzed > ?', 10)
        .order(fielding_percentage: :desc, defensive_efficiency: :desc)
        .limit(10)
        .includes(player: :team)
        .map do |analytics|
          {
            player_id: analytics.player.id,
            player_name: analytics.player.name,
            team: analytics.player.team&.name,
            position: analytics.player.position,
            fielding_percentage: analytics.fielding_percentage,
            errors: analytics.errors_count
          }
        end

      # Most improved players
      top_performers[:most_improved] = PlayerAnalytics
        .joins(:player)
        .where(organization: organization, season: season)
        .where(performance_trend: 'improving')
        .where('games_analyzed > ?', 10)
        .order(consistency_score: :desc)
        .limit(10)
        .includes(player: :team)
        .map do |analytics|
          {
            player_id: analytics.player.id,
            player_name: analytics.player.name,
            team: analytics.player.team&.name,
            ops: analytics.ops,
            batting_average: analytics.batting_average,
            trend: analytics.performance_trend
          }
        end

      top_performers
    end

    def generate_league_insights(organization, season)
      insights = {}

      # Overall league performance
      league_analytics = PlayerAnalytics.where(organization: organization, season: season)
      
      insights[:average_batting_average] = league_analytics.average(:batting_average)&.round(3)
      insights[:average_ops] = league_analytics.average(:ops)&.round(3)
      insights[:average_fielding_percentage] = league_analytics.average(:fielding_percentage)&.round(3)

      # Performance distribution
      insights[:ops_distribution] = {
        elite: league_analytics.where('ops > ?', 0.900).count,
        above_average: league_analytics.where(ops: 0.750..0.900).count,
        average: league_analytics.where(ops: 0.650..0.750).count,
        below_average: league_analytics.where('ops < ?', 0.650).count
      }

      # Trend analysis
      insights[:player_trends] = {
        improving: league_analytics.where(performance_trend: 'improving').count,
        stable: league_analytics.where(performance_trend: 'stable').count,
        declining: league_analytics.where(performance_trend: 'declining').count
      }

      # Team balance
      team_strengths = TeamAnalytics.where(organization: organization, season: season)
      insights[:competitive_balance] = {
        winning_percentage_std_dev: calculate_std_deviation(team_strengths.pluck(:winning_percentage)),
        team_ops_variance: calculate_variance(team_strengths.pluck(:team_batting_average))
      }

      insights
    end

    def calculate_improvement_rate(stats)
      return 0.0 if stats.count < 5

      recent = stats.first(5)
      older = stats.offset(5).limit(5)

      return 0.0 if older.empty?

      recent_avg = calculate_average_batting(recent)
      older_avg = calculate_average_batting(older)

      return 0.0 if older_avg.zero?

      ((recent_avg - older_avg) / older_avg * 100).round(2)
    end

    def calculate_average_batting(stats)
      total_hits = stats.sum(:hits)
      total_at_bats = stats.sum(:at_bats)

      return 0.0 if total_at_bats.zero?

      (total_hits.to_f / total_at_bats).round(3)
    end

    def calculate_average(values)
      return 0.0 if values.empty?
      (values.sum.to_f / values.count).round(3)
    end

    def calculate_variance(values)
      return 0.0 if values.empty?
      
      mean = calculate_average(values)
      sum_of_squares = values.map { |v| (v - mean) ** 2 }.sum
      (sum_of_squares.to_f / values.count).round(3)
    end

    def calculate_std_deviation(values)
      Math.sqrt(calculate_variance(values)).round(3)
    end

    def calculate_distribution(values)
      return {} if values.empty?

      sorted = values.sort
      {
        min: sorted.first,
        q1: sorted[(sorted.length * 0.25).floor],
        median: sorted[sorted.length / 2],
        q3: sorted[(sorted.length * 0.75).floor],
        max: sorted.last
      }
    end
  end
end