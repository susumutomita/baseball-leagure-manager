# frozen_string_literal: true

module Analytics
  class DashboardController < ApplicationController
    before_action :authenticate_user!
    before_action :set_season
    before_action :set_team, only: [:coach_dashboard]
    before_action :set_player, only: [:player_dashboard]

    # Coach dashboard - team-specific analytics
    def coach_dashboard
      authorize @team, :show?
      
      # Analyze team players
      @performance_analyzer = PerformanceAnalyzer.new
      @player_analytics = @performance_analyzer.analyze_team_players(@team, season: @season)
      
      # Get team analytics
      @team_analytics = TeamAnalytics.calculate_for_team(@team, @season)
      
      # Generate lineup recommendations
      @insights_generator = InsightsGenerator.new
      @lineup_recommendations = @insights_generator.generate_lineup_recommendations(@team)
      
      # Identify breakout candidates
      @trend_calculator = TrendCalculator.new
      @breakout_candidates = @trend_calculator.identify_breakout_candidates(@team)
      
      # Get recent match performance
      @recent_matches = @team.matches
                             .completed
                             .includes(:home_team, :away_team)
                             .recent
                             .limit(10)
      
      respond_to do |format|
        format.html
        format.json do
          render json: {
            team_analytics: @team_analytics,
            player_analytics: @player_analytics.map { |pa| serialize_player_analytics(pa) },
            lineup_recommendations: @lineup_recommendations,
            breakout_candidates: @breakout_candidates,
            recent_matches: @recent_matches.map { |m| serialize_match(m) }
          }
        end
      end
    end

    # League administrator dashboard - cross-team comparisons
    def league_dashboard
      authorize current_organization, :manage?
      
      @performance_analyzer = PerformanceAnalyzer.new
      @insights_generator = InsightsGenerator.new
      
      # Get league-wide analytics
      @league_analytics = @performance_analyzer.analyze_league(current_organization, season: @season)
      
      # Get competitive balance analysis
      @competitive_balance = @insights_generator.analyze_competitive_balance(current_organization, season: @season)
      
      # Get team standings
      @team_standings = current_organization.teams
                                           .includes(:team_analytics)
                                           .map { |team| 
                                             analytics = team.team_analytics.find_by(season_id: @season&.id)
                                             {
                                               team: team,
                                               analytics: analytics,
                                               record: team.win_loss_record
                                             }
                                           }
                                           .sort_by { |t| -(t[:analytics]&.winning_percentage || 0) }
      
      # Get position depth analysis
      @position_depth = @performance_analyzer.analyze_position_depth(current_organization, @season)
      
      respond_to do |format|
        format.html
        format.json do
          render json: {
            league_analytics: @league_analytics,
            competitive_balance: @competitive_balance,
            team_standings: serialize_team_standings(@team_standings),
            position_depth: @position_depth
          }
        end
      end
    end

    # Player dashboard - individual performance tracking
    def player_dashboard
      authorize @player, :show?
      
      @performance_analyzer = PerformanceAnalyzer.new
      @insights_generator = InsightsGenerator.new
      @trend_calculator = TrendCalculator.new
      
      # Get player analytics
      @player_analytics = @performance_analyzer.analyze_player(@player, season: @season)
      
      # Get development plan
      @development_plan = @insights_generator.generate_player_development_plan(@player)
      
      # Get performance trend
      @performance_trend = @trend_calculator.calculate_performance_trend(@player, games: 20)
      
      # Get consistency analysis
      @consistency_analysis = @trend_calculator.calculate_consistency(@player, games: 20, season: @season)
      
      # Get recent game stats
      @recent_stats = @player.player_stats
                            .includes(:match)
                            .recent
                            .limit(20)
      
      # Get comparisons to league average
      @league_comparison = compare_to_league_average(@player_analytics)
      
      respond_to do |format|
        format.html
        format.json do
          render json: {
            player_analytics: serialize_player_analytics(@player_analytics),
            development_plan: @development_plan,
            performance_trend: @performance_trend,
            consistency_analysis: @consistency_analysis,
            recent_stats: @recent_stats.map { |s| serialize_player_stat(s) },
            league_comparison: @league_comparison
          }
        end
      end
    end

    # Analytics overview - high-level metrics
    def overview
      authorize current_organization, :show?
      
      @total_players = current_organization.players.count
      @total_teams = current_organization.teams.count
      @total_matches = current_organization.matches.where(season_id: @season&.id).count
      
      # Get aggregate statistics
      analytics_scope = PlayerAnalytics.where(organization: current_organization, season: @season)
      
      @aggregate_stats = {
        average_batting_average: analytics_scope.average(:batting_average)&.round(3),
        average_ops: analytics_scope.average(:ops)&.round(3),
        average_fielding_percentage: analytics_scope.average(:fielding_percentage)&.round(3),
        player_trends: {
          improving: analytics_scope.where(performance_trend: 'improving').count,
          stable: analytics_scope.where(performance_trend: 'stable').count,
          declining: analytics_scope.where(performance_trend: 'declining').count
        }
      }
      
      respond_to do |format|
        format.html
        format.json { render json: @aggregate_stats }
      end
    end

    # Player comparison tool
    def compare_players
      player_ids = params[:player_ids]&.split(',')
      
      if player_ids.blank? || player_ids.length < 2
        return render json: { error: 'Please provide at least 2 player IDs' }, status: :bad_request
      end
      
      # Ensure players belong to organization
      players = current_organization.players.where(id: player_ids)
      
      if players.count != player_ids.length
        return render json: { error: 'Some players not found' }, status: :not_found
      end
      
      authorize players.first, :show?
      
      @performance_analyzer = PerformanceAnalyzer.new
      metrics = params[:metrics]&.split(',')&.map(&:to_sym) || [:ops, :batting_average, :fielding_percentage]
      
      @comparison = @performance_analyzer.compare_players(player_ids, metrics: metrics)
      
      render json: { comparison: @comparison }
    end

    private

    def set_season
      @season = if params[:season_id].present?
                  current_organization.seasons.find(params[:season_id])
                else
                  Season.current
                end
    end

    def set_team
      @team = current_organization.teams.find(params[:team_id])
    end

    def set_player
      @player = current_organization.players.find(params[:player_id])
    end

    def compare_to_league_average(player_analytics)
      return {} unless player_analytics
      
      league_averages = PlayerAnalytics
                         .where(organization: current_organization, season: player_analytics.season)
                         .where.not(id: player_analytics.id)
                         .select(
                           'AVG(batting_average) as avg_batting_average',
                           'AVG(ops) as avg_ops',
                           'AVG(fielding_percentage) as avg_fielding_percentage'
                         )
                         .first
      
      {
        batting_average: {
          player: player_analytics.batting_average,
          league: league_averages&.avg_batting_average&.round(3),
          difference: (player_analytics.batting_average - (league_averages&.avg_batting_average || 0)).round(3)
        },
        ops: {
          player: player_analytics.ops,
          league: league_averages&.avg_ops&.round(3),
          difference: (player_analytics.ops - (league_averages&.avg_ops || 0)).round(3)
        },
        fielding_percentage: {
          player: player_analytics.fielding_percentage,
          league: league_averages&.avg_fielding_percentage&.round(3),
          difference: (player_analytics.fielding_percentage - (league_averages&.avg_fielding_percentage || 0)).round(3)
        }
      }
    end

    def serialize_player_analytics(analytics)
      return nil unless analytics
      
      {
        id: analytics.id,
        player_id: analytics.player_id,
        player_name: analytics.player.name,
        batting_average: analytics.batting_average,
        on_base_percentage: analytics.on_base_percentage,
        slugging_percentage: analytics.slugging_percentage,
        ops: analytics.ops,
        fielding_percentage: analytics.fielding_percentage,
        errors_count: analytics.errors_count,
        performance_trend: analytics.performance_trend,
        consistency_score: analytics.consistency_score,
        league_rank: analytics.league_rank,
        position_rank: analytics.position_rank,
        team_rank: analytics.team_rank,
        games_analyzed: analytics.games_analyzed,
        calculated_at: analytics.calculated_at
      }
    end

    def serialize_match(match)
      {
        id: match.id,
        scheduled_at: match.scheduled_at,
        home_team: { id: match.home_team_id, name: match.home_team.name },
        away_team: { id: match.away_team_id, name: match.away_team.name },
        home_score: match.home_score,
        away_score: match.away_score,
        winner_id: match.winner&.id,
        status: match.status
      }
    end

    def serialize_player_stat(stat)
      {
        id: stat.id,
        match_id: stat.match_id,
        match_date: stat.match&.scheduled_at,
        at_bats: stat.at_bats,
        hits: stat.hits,
        home_runs: stat.home_runs,
        rbis: stat.rbis,
        batting_average: stat.batting_average,
        walks: stat.walks,
        strikeouts: stat.strikeouts
      }
    end

    def serialize_team_standings(standings)
      standings.map do |standing|
        {
          team: {
            id: standing[:team].id,
            name: standing[:team].name,
            city: standing[:team].city
          },
          record: standing[:record],
          winning_percentage: standing[:analytics]&.winning_percentage,
          league_rank: standing[:analytics]&.league_rank,
          team_batting_average: standing[:analytics]&.team_batting_average,
          team_era: standing[:analytics]&.team_era,
          team_fielding_percentage: standing[:analytics]&.team_fielding_percentage
        }
      end
    end
  end
end