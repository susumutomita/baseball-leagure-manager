# frozen_string_literal: true

class PlayerAnalytics < ApplicationRecord
  include TenantScoped

  belongs_to :player
  belongs_to :season, optional: true
  belongs_to :organization

  validates :player_id, presence: true
  validates :organization_id, presence: true
  validates :player_id, uniqueness: { scope: %i[season_id organization_id] }

  # Validate metrics ranges
  validates :on_base_percentage, numericality: { in: 0..1 }, allow_nil: true
  validates :slugging_percentage, numericality: { in: 0..2 }, allow_nil: true
  validates :ops, numericality: { in: 0..3 }, allow_nil: true
  validates :batting_average, numericality: { in: 0..1 }, allow_nil: true
  validates :fielding_percentage, numericality: { in: 0..1 }, allow_nil: true
  validates :consistency_score, numericality: { in: 0..1 }, allow_nil: true

  # Validate performance trend
  validates :performance_trend, inclusion: { in: %w[improving stable declining] }, allow_nil: true

  # Scopes
  scope :recent, -> { order(calculated_at: :desc) }
  scope :by_season, ->(season_id) { where(season_id: season_id) }
  scope :top_performers, -> { where.not(league_rank: nil).order(league_rank: :asc).limit(10) }
  scope :improving_players, -> { where(performance_trend: 'improving') }

  # Class methods for analytics
  def self.calculate_for_player(player, season = nil)
    analytics = find_or_initialize_by(
      player: player,
      season: season,
      organization: player.organization
    )

    analytics.calculate_metrics
    analytics.calculate_rankings
    analytics.save!
    analytics
  end

  def self.bulk_calculate(organization, season = nil)
    organization.players.find_each do |player|
      calculate_for_player(player, season)
    end
  end

  # Instance methods
  def calculate_metrics
    stats = player_stats_for_calculation
    return unless stats.any?

    # Batting metrics
    self.batting_average = calculate_batting_average(stats)
    self.on_base_percentage = calculate_on_base_percentage(stats)
    self.slugging_percentage = calculate_slugging_percentage(stats)
    self.ops = on_base_percentage + slugging_percentage

    # Fielding metrics
    self.fielding_percentage = calculate_fielding_percentage(stats)
    self.errors_count = stats.sum(:errors)
    self.defensive_efficiency = calculate_defensive_efficiency(stats)

    # Trend metrics
    self.performance_trend = calculate_performance_trend(stats)
    self.consistency_score = calculate_consistency_score(stats)

    # Metadata
    self.games_analyzed = stats.count
    self.calculated_at = Time.current
  end

  def calculate_rankings
    return unless organization

    # League rankings
    all_analytics = organization.player_analytics.by_season(season_id)

    self.league_rank = calculate_rank_by_ops(all_analytics)
    self.position_rank = calculate_position_rank(all_analytics)
    self.team_rank = calculate_team_rank
  end

  private

  def player_stats_for_calculation
    scope = player.player_stats
    scope = scope.where(season_id: season_id) if season_id
    scope
  end

  def calculate_batting_average(stats)
    total_at_bats = stats.sum(:at_bats)
    total_hits = stats.sum(:hits)

    return 0.0 if total_at_bats.zero?

    (total_hits.to_f / total_at_bats).round(3)
  end

  def calculate_on_base_percentage(stats)
    at_bats = stats.sum(:at_bats)
    walks = stats.sum(:walks)
    hit_by_pitch = stats.sum(:hit_by_pitch)
    sacrifice_flies = stats.sum(:sacrifice_flies)
    hits = stats.sum(:hits)

    total_appearances = at_bats + walks + hit_by_pitch + sacrifice_flies
    return 0.0 if total_appearances.zero?

    reaches = hits + walks + hit_by_pitch
    (reaches.to_f / total_appearances).round(3)
  end

  def calculate_slugging_percentage(stats)
    total_at_bats = stats.sum(:at_bats)
    return 0.0 if total_at_bats.zero?

    singles = stats.sum(:hits) - stats.sum(:doubles) - stats.sum(:triples) - stats.sum(:home_runs)
    total_bases = singles + (stats.sum(:doubles) * 2) + (stats.sum(:triples) * 3) + (stats.sum(:home_runs) * 4)

    (total_bases.to_f / total_at_bats).round(3)
  end

  def calculate_fielding_percentage(stats)
    putouts = stats.sum(:putouts)
    assists = stats.sum(:assists)
    errors = stats.sum(:errors)

    total_chances = putouts + assists + errors
    return 0.0 if total_chances.zero?

    ((putouts + assists).to_f / total_chances).round(3)
  end

  def calculate_defensive_efficiency(stats)
    # Simplified defensive efficiency calculation
    fielding_pct = calculate_fielding_percentage(stats)
    errors_per_game = stats.count.zero? ? 0 : stats.sum(:errors).to_f / stats.count

    # Higher fielding percentage and lower errors per game = better efficiency
    efficiency = fielding_pct * (1 - [errors_per_game / 5.0, 1.0].min)
    efficiency.round(3)
  end

  def calculate_performance_trend(stats)
    return 'stable' if stats.count < 5

    recent_stats = stats.order(created_at: :desc).limit(10)
    older_stats = stats.order(created_at: :desc).offset(10).limit(10)

    return 'stable' if older_stats.empty?

    recent_avg = calculate_batting_average(recent_stats)
    older_avg = calculate_batting_average(older_stats)

    difference = recent_avg - older_avg

    if difference > 0.020
      'improving'
    elsif difference < -0.020
      'declining'
    else
      'stable'
    end
  end

  def calculate_consistency_score(stats)
    return 0.0 if stats.count < 3

    batting_averages = stats.map do |stat|
      stat.at_bats.zero? ? 0.0 : (stat.hits.to_f / stat.at_bats)
    end

    return 1.0 if batting_averages.all?(&:zero?)

    mean = batting_averages.sum / batting_averages.count
    variance = batting_averages.map { |avg| (avg - mean)**2 }.sum / batting_averages.count
    std_deviation = Math.sqrt(variance)

    # Lower standard deviation = higher consistency
    # Convert to 0-1 scale where 1 is most consistent
    consistency = 1.0 - [std_deviation * 2, 1.0].min
    consistency.round(3)
  end

  def calculate_rank_by_ops(all_analytics)
    sorted = all_analytics.where.not(ops: nil).order(ops: :desc).pluck(:id)
    rank = sorted.index(id)
    rank ? rank + 1 : nil
  end

  def calculate_position_rank(all_analytics)
    return nil unless player.position

    position_analytics = all_analytics.joins(:player)
                                      .where(players: { position: player.position })
                                      .where.not(ops: nil)
                                      .order(ops: :desc)
                                      .pluck(:id)

    rank = position_analytics.index(id)
    rank ? rank + 1 : nil
  end

  def calculate_team_rank
    return nil unless player.team

    team_analytics = player.team.players
                           .joins(:player_analytics)
                           .where(player_analytics: { season_id: season_id })
                           .where.not(player_analytics: { ops: nil })
                           .order('player_analytics.ops DESC')
                           .pluck('player_analytics.id')

    rank = team_analytics.index(id)
    rank ? rank + 1 : nil
  end
end
