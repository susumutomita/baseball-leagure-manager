# frozen_string_literal: true

class PerformanceReport < ApplicationRecord
  include TenantScoped

  belongs_to :reportable, polymorphic: true
  belongs_to :generated_by, class_name: 'User'
  belongs_to :organization

  # Validations
  validates :report_type, presence: true, inclusion: {
    in: %w[player_performance team_summary league_overview weekly_digest monthly_report seasonal_analysis]
  }
  validates :format, inclusion: { in: %w[json pdf csv excel] }
  validates :status, inclusion: { in: %w[pending generating completed failed] }

  # Scopes
  scope :completed, -> { where(status: 'completed') }
  scope :pending, -> { where(status: 'pending') }
  scope :failed, -> { where(status: 'failed') }
  scope :auto_generated, -> { where(auto_generated: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_type, ->(type) { where(report_type: type) }

  # Callbacks
  after_create :enqueue_generation

  # Class methods
  def self.generate_for_player(player, options = {})
    create!(
      reportable: player,
      generated_by: options[:generated_by] || User.system_user,
      organization: player.organization,
      report_type: 'player_performance',
      period_start: options[:period_start] || 30.days.ago.to_date,
      period_end: options[:period_end] || Date.current,
      format: options[:format] || 'json',
      auto_generated: options[:auto_generated] || false,
      recipients: options[:recipients]
    )
  end

  def self.generate_for_team(team, options = {})
    create!(
      reportable: team,
      generated_by: options[:generated_by] || User.system_user,
      organization: team.organization,
      report_type: 'team_summary',
      period_start: options[:period_start] || 30.days.ago.to_date,
      period_end: options[:period_end] || Date.current,
      format: options[:format] || 'json',
      auto_generated: options[:auto_generated] || false,
      recipients: options[:recipients]
    )
  end

  def self.generate_league_overview(organization, options = {})
    create!(
      reportable: organization,
      generated_by: options[:generated_by] || User.system_user,
      organization: organization,
      report_type: 'league_overview',
      period_start: options[:period_start] || 30.days.ago.to_date,
      period_end: options[:period_end] || Date.current,
      format: options[:format] || 'json',
      auto_generated: options[:auto_generated] || false,
      recipients: options[:recipients]
    )
  end

  # Instance methods
  def generate!
    update!(status: 'generating')

    begin
      case report_type
      when 'player_performance'
        generate_player_report
      when 'team_summary'
        generate_team_report
      when 'league_overview'
        generate_league_report
      when 'weekly_digest'
        generate_weekly_digest
      when 'monthly_report'
        generate_monthly_report
      when 'seasonal_analysis'
        generate_seasonal_analysis
      end

      update!(status: 'completed')
      send_to_recipients if recipients.present?
    rescue StandardError => e
      update!(status: 'failed', error_message: e.message)
      raise
    end
  end

  def send_to_recipients
    return unless recipients.present? && status == 'completed'

    # Schedule email delivery
    ReportMailerJob.perform_later(self)
    update!(sent_at: Time.current)
  end

  def filename
    timestamp = created_at.strftime('%Y%m%d_%H%M%S')
    name_parts = [report_type, reportable_type.underscore, reportable_id, timestamp]
    "#{name_parts.join('_')}.#{format}"
  end

  def can_regenerate?
    %w[completed failed].include?(status)
  end

  private

  def enqueue_generation
    ReportGenerationJob.perform_later(self)
  end

  def generate_player_report
    return unless reportable.is_a?(Player)

    player = reportable
    analytics = player.player_analytics.find_by(season_id: current_season_id)
    stats = player.player_stats.where(created_at: period_start..period_end)

    report_data = {
      player_info: {
        id: player.id,
        name: player.name,
        team: player.team&.name,
        position: player.position,
        jersey_number: player.jersey_number
      },
      period: {
        start: period_start,
        end: period_end,
        games_played: stats.count
      },
      performance_metrics: build_player_metrics(analytics, stats),
      trends: build_player_trends(player, stats),
      comparisons: build_player_comparisons(player, analytics),
      recommendations: generate_player_recommendations(player, analytics)
    }

    self.content = report_data
    self.insights = generate_player_insights(player, analytics, stats)
    self.recommendations = extract_key_recommendations(report_data[:recommendations])
  end

  def generate_team_report
    return unless reportable.is_a?(Team)

    team = reportable
    team_analytics = team.team_analytics.find_by(season_id: current_season_id)

    report_data = {
      team_info: {
        id: team.id,
        name: team.name,
        league: team.leagues.first&.name,
        founded_year: team.founded_year
      },
      period: {
        start: period_start,
        end: period_end
      },
      team_performance: build_team_performance(team_analytics),
      player_analysis: build_team_player_analysis(team, team_analytics),
      lineup_effectiveness: team_analytics&.lineup_effectiveness,
      recommendations: generate_team_recommendations(team, team_analytics)
    }

    self.content = report_data
    self.insights = generate_team_insights(team, team_analytics)
    self.recommendations = extract_key_recommendations(report_data[:recommendations])
  end

  def generate_league_report
    return unless reportable.is_a?(Organization)

    organization = reportable

    report_data = {
      league_info: {
        id: organization.id,
        name: organization.name,
        teams_count: organization.teams.count,
        players_count: organization.players.count
      },
      period: {
        start: period_start,
        end: period_end
      },
      standings: build_league_standings(organization),
      top_performers: build_top_performers(organization),
      competitive_balance: analyze_competitive_balance(organization),
      recommendations: generate_league_recommendations(organization)
    }

    self.content = report_data
    self.insights = generate_league_insights(organization)
    self.recommendations = extract_key_recommendations(report_data[:recommendations])
  end

  def generate_weekly_digest
    # Implementation for weekly digest
    self.content = { message: 'Weekly digest generation not yet implemented' }
  end

  def generate_monthly_report
    # Implementation for monthly report
    self.content = { message: 'Monthly report generation not yet implemented' }
  end

  def generate_seasonal_analysis
    # Implementation for seasonal analysis
    self.content = { message: 'Seasonal analysis generation not yet implemented' }
  end

  # Helper methods for report generation
  def build_player_metrics(analytics, stats)
    return {} unless analytics

    {
      batting: {
        average: analytics.batting_average,
        on_base_percentage: analytics.on_base_percentage,
        slugging_percentage: analytics.slugging_percentage,
        ops: analytics.ops,
        hits: stats.sum(:hits),
        home_runs: stats.sum(:home_runs),
        rbis: stats.sum(:rbis)
      },
      fielding: {
        fielding_percentage: analytics.fielding_percentage,
        errors: analytics.errors_count,
        defensive_efficiency: analytics.defensive_efficiency
      },
      rankings: {
        league_rank: analytics.league_rank,
        position_rank: analytics.position_rank,
        team_rank: analytics.team_rank
      }
    }
  end

  def build_player_trends(_player, stats)
    recent_games = stats.recent.limit(10)
    older_games = stats.offset(10).limit(10)

    {
      recent_batting_average: calculate_period_average(recent_games),
      previous_batting_average: calculate_period_average(older_games),
      trend_direction: determine_trend_direction(recent_games, older_games)
    }
  end

  def build_player_comparisons(_player, analytics)
    return {} unless analytics

    league_average_ops = organization.player_analytics
                                     .where(season_id: analytics.season_id)
                                     .average(:ops) || 0.700

    {
      vs_league_average: {
        ops_difference: (analytics.ops - league_average_ops).round(3),
        percentile: calculate_percentile(analytics.league_rank, organization.players.count)
      }
    }
  end

  def generate_player_recommendations(_player, analytics)
    recommendations = []

    if analytics
      if analytics.batting_average < 0.250
        recommendations << {
          category: 'batting',
          priority: 'high',
          suggestion: 'Focus on contact hitting drills to improve batting average'
        }
      end

      if analytics.consistency_score < 0.5
        recommendations << {
          category: 'consistency',
          priority: 'medium',
          suggestion: 'Work on maintaining consistent performance across games'
        }
      end
    end

    recommendations
  end

  def generate_player_insights(_player, analytics, stats)
    insights = []

    if analytics&.performance_trend == 'improving'
      insights << "Player showing consistent improvement over the analyzed period"
    end

    insights << "Above average hit production in recent games" if stats.any? && stats.average(:hits) > 1.5

    insights
  end

  def build_team_performance(team_analytics)
    return {} unless team_analytics

    {
      team_batting_average: team_analytics.team_batting_average,
      team_era: team_analytics.team_era,
      team_fielding_percentage: team_analytics.team_fielding_percentage,
      winning_percentage: team_analytics.winning_percentage,
      league_rank: team_analytics.league_rank
    }
  end

  def build_team_player_analysis(_team, team_analytics)
    return {} unless team_analytics

    {
      top_performers: team_analytics.top_performers,
      improvement_candidates: team_analytics.improvement_candidates,
      position_strength: team_analytics.position_strength_analysis
    }
  end

  def generate_team_recommendations(_team, team_analytics)
    recommendations = []

    if team_analytics
      weak_positions = team_analytics.position_strength_analysis&.select do |_, data|
        data[:average_ops] < 0.650
      end

      weak_positions&.each_key do |position|
        recommendations << {
          category: 'roster',
          priority: 'high',
          suggestion: "Consider strengthening the #{position.humanize} position"
        }
      end
    end

    recommendations
  end

  def generate_team_insights(_team, team_analytics)
    insights = []

    if team_analytics&.lineup_effectiveness && team_analytics.lineup_effectiveness > 0.7
      insights << "Team showing strong offensive production and lineup synergy"
    end

    insights
  end

  def build_league_standings(organization)
    organization.teams.includes(:team_analytics)
                .map do |team|
      analytics = team.team_analytics.find_by(season_id: current_season_id)
      {
        team_id: team.id,
        team_name: team.name,
        winning_percentage: analytics&.winning_percentage || 0,
        league_rank: analytics&.league_rank
      }
    end.sort_by { |t| t[:league_rank] || 999 }
  end

  def build_top_performers(organization)
    PlayerAnalytics.joins(:player)
                   .where(organization: organization, season_id: current_season_id)
                   .where.not(ops: nil)
                   .order(ops: :desc)
                   .limit(10)
                   .map do |analytics|
      {
        player_id: analytics.player.id,
        player_name: analytics.player.name,
        team: analytics.player.team&.name,
        ops: analytics.ops,
        batting_average: analytics.batting_average
      }
    end
  end

  def analyze_competitive_balance(organization)
    team_analytics = organization.team_analytics.where(season_id: current_season_id)

    {
      winning_percentage_std_dev: calculate_std_deviation(team_analytics.pluck(:winning_percentage)),
      competitive_index: calculate_competitive_index(team_analytics)
    }
  end

  def generate_league_recommendations(_organization)
    []

    # Add recommendations based on competitive balance
  end

  def generate_league_insights(_organization)
    ["League showing healthy competitive balance across teams"]
  end

  def extract_key_recommendations(recommendations)
    # Using map instead of pluck for hash array
    # rubocop:disable Rails/Pluck
    recommendations.first(3).map { |r| r[:suggestion] }
    # rubocop:enable Rails/Pluck
  end

  # Utility methods
  def current_season_id
    @current_season_id ||= Season.current&.id
  end

  def calculate_period_average(stats)
    total_at_bats = stats.sum(:at_bats)
    total_hits = stats.sum(:hits)

    return 0.0 if total_at_bats.zero?

    (total_hits.to_f / total_at_bats).round(3)
  end

  def determine_trend_direction(recent_stats, older_stats)
    recent_avg = calculate_period_average(recent_stats)
    older_avg = calculate_period_average(older_stats)

    if recent_avg > older_avg + 0.020
      'improving'
    elsif recent_avg < older_avg - 0.020
      'declining'
    else
      'stable'
    end
  end

  def calculate_percentile(rank, total)
    return nil unless rank && total.positive?

    ((total - rank + 1).to_f / total * 100).round(1)
  end

  def calculate_std_deviation(values)
    return 0.0 if values.empty?

    mean = values.sum.to_f / values.count
    variance = values.sum { |v| (v - mean)**2 } / values.count
    Math.sqrt(variance).round(3)
  end

  def calculate_competitive_index(team_analytics)
    # Simple competitive index based on winning percentage distribution
    winning_percentages = team_analytics.pluck(:winning_percentage).compact
    return 0.5 if winning_percentages.empty?

    std_dev = calculate_std_deviation(winning_percentages)
    # Lower std_dev = better competitive balance
    # Convert to 0-1 scale where 1 is perfect balance
    [1.0 - (std_dev * 2), 0.0].max.round(3)
  end
end
