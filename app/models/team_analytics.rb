# frozen_string_literal: true

class TeamAnalytics < ApplicationRecord
  include TenantScoped

  belongs_to :team
  belongs_to :season, optional: true
  belongs_to :organization

  validates :team_id, presence: true
  validates :organization_id, presence: true
  validates :team_id, uniqueness: { scope: %i[season_id organization_id] }

  # Validate metrics ranges
  validates :lineup_effectiveness, numericality: { in: 0..1 }, allow_nil: true
  validates :team_batting_average, numericality: { in: 0..1 }, allow_nil: true
  validates :team_era, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :team_fielding_percentage, numericality: { in: 0..1 }, allow_nil: true
  validates :winning_percentage, numericality: { in: 0..1 }, allow_nil: true

  # Scopes
  scope :recent, -> { order(calculated_at: :desc) }
  scope :by_season, ->(season_id) { where(season_id: season_id) }
  scope :ranked, -> { where.not(league_rank: nil).order(league_rank: :asc) }

  # Class methods
  def self.calculate_for_team(team, season = nil)
    analytics = find_or_initialize_by(
      team: team,
      season: season,
      organization: team.organization
    )

    analytics.calculate_metrics
    analytics.calculate_rankings
    analytics.save!
    analytics
  end

  def self.bulk_calculate(organization, season = nil)
    organization.teams.find_each do |team|
      calculate_for_team(team, season)
    end
  end

  # Instance methods
  def calculate_metrics
    # Player performance analysis
    analyze_player_performance

    # Team aggregate metrics
    calculate_team_batting_metrics
    calculate_team_pitching_metrics
    calculate_team_fielding_metrics
    calculate_winning_percentage_metric

    # Team chemistry and effectiveness
    calculate_lineup_effectiveness_metric
    analyze_player_synergies

    # Metadata
    self.calculated_at = Time.current
    self.games_analyzed = team_matches.count
  end

  def calculate_rankings
    return unless organization

    all_team_analytics = organization.team_analytics.by_season(season_id)

    # Calculate league rank based on winning percentage
    ranked_teams = all_team_analytics
                   .where.not(winning_percentage: nil)
                   .order(winning_percentage: :desc)
                   .pluck(:id)

    rank = ranked_teams.index(id)
    self.league_rank = rank ? rank + 1 : nil

    # Division rank if applicable
    return unless team.respond_to?(:division)

    division_teams = all_team_analytics
                     .joins(:team)
                     .where(teams: { division: team.division })
                     .where.not(winning_percentage: nil)
                     .order(winning_percentage: :desc)
                     .pluck(:id)

    division_rank = division_teams.index(id)
    self.division_rank = division_rank ? division_rank + 1 : nil
  end

  private

  def team_matches
    scope = team.home_matches.or(team.away_matches)
    scope = scope.where(season_id: season_id) if season_id
    scope.completed
  end

  def team_players
    team.players
  end

  def player_stats
    PlayerStat.joins(:player)
              .where(player: team_players)
              .tap { |scope| scope.where(season_id: season_id) if season_id }
  end

  def analyze_player_performance
    # Top performers by OPS
    top_performers_data = []
    team_players.each do |player|
      analytics = player.player_analytics.find_by(season_id: season_id)
      next unless analytics&.ops

      top_performers_data << {
        player_id: player.id,
        name: player.name,
        position: player.position,
        ops: analytics.ops,
        batting_average: analytics.batting_average,
        consistency_score: analytics.consistency_score
      }
    end

    self.top_performers = top_performers_data
                          .sort_by { |p| -p[:ops] }
                          .first(5)

    # Improvement candidates
    improvement_candidates_data = []
    team_players.each do |player|
      analytics = player.player_analytics.find_by(season_id: season_id)
      next unless analytics

      next unless analytics.performance_trend == 'declining' ||
                  (analytics.batting_average && analytics.batting_average < 0.200)

      improvement_candidates_data << {
        player_id: player.id,
        name: player.name,
        position: player.position,
        batting_average: analytics.batting_average,
        trend: analytics.performance_trend,
        consistency_score: analytics.consistency_score
      }
    end

    self.improvement_candidates = improvement_candidates_data

    # Position strength analysis
    position_analysis = {}
    %w[pitcher catcher first_base second_base third_base shortstop
       left_field center_field right_field].each do |position|
      position_players = team_players.where(position: position)

      position_stats = position_players.map do |player|
        analytics = player.player_analytics.find_by(season_id: season_id)
        analytics&.ops || 0
      end

      position_analysis[position] = {
        player_count: position_players.count,
        average_ops: position_stats.any? ? (position_stats.sum.to_f / position_stats.count).round(3) : 0,
        max_ops: position_stats.max || 0
      }
    end

    self.position_strength_analysis = position_analysis
  end

  def calculate_team_batting_metrics
    stats = player_stats
    total_at_bats = stats.sum(:at_bats)
    total_hits = stats.sum(:hits)

    self.team_batting_average = if total_at_bats.zero?
                                  0.0
                                else
                                  (total_hits.to_f / total_at_bats).round(3)
                                end
  end

  def calculate_team_pitching_metrics
    pitching_stats = player_stats.where.not(innings_pitched: nil)
    total_innings = pitching_stats.sum(:innings_pitched)
    total_earned_runs = pitching_stats.sum(:earned_runs)

    self.team_era = if total_innings.zero?
                      0.0
                    else
                      ((total_earned_runs * 9.0) / total_innings).round(3)
                    end
  end

  def calculate_team_fielding_metrics
    fielding_stats = player_stats
    total_putouts = fielding_stats.sum(:putouts)
    total_assists = fielding_stats.sum(:assists)
    total_errors = fielding_stats.sum(:errors)

    total_chances = total_putouts + total_assists + total_errors

    self.team_fielding_percentage = if total_chances.zero?
                                      0.0
                                    else
                                      ((total_putouts + total_assists).to_f / total_chances).round(3)
                                    end
  end

  def calculate_winning_percentage_metric
    matches = team_matches
    total_games = matches.count

    return 0.0 if total_games.zero?

    wins = matches.where(
      '(home_team_id = ? AND home_score > away_score) OR (away_team_id = ? AND away_score > home_score)',
      team.id, team.id
    ).count

    self.winning_percentage = (wins.to_f / total_games).round(3)
  end

  def calculate_lineup_effectiveness_metric
    # Calculate based on run production and batting order optimization
    matches = team_matches.includes(:player_stats)

    return 0.0 if matches.empty?

    total_runs = 0
    matches.each do |match|
      total_runs += if match.home_team_id == team.id
                      match.home_score || 0
                    else
                      match.away_score || 0
                    end
    end

    average_runs_per_game = total_runs.to_f / matches.count

    # Compare to league average (simplified - assumes 4.5 runs/game as baseline)
    league_average = 4.5
    effectiveness = [average_runs_per_game / league_average, 2.0].min

    self.lineup_effectiveness = (effectiveness / 2.0).round(3) # Normalize to 0-1 scale
  end

  def analyze_player_synergies
    # Analyze batting order effectiveness
    batting_pairs = analyze_batting_order_synergies

    # Analyze defensive combinations
    defensive_pairs = analyze_defensive_synergies

    self.player_synergies = {
      batting_pairs: batting_pairs,
      defensive_pairs: defensive_pairs,
      overall_chemistry_score: calculate_overall_chemistry
    }
  end

  def analyze_batting_order_synergies
    # Simplified synergy analysis - looks at consecutive batters' performance
    synergies = []

    team_players.each_cons(2) do |player1, player2|
      p1_analytics = player1.player_analytics.find_by(season_id: season_id)
      p2_analytics = player2.player_analytics.find_by(season_id: season_id)

      next unless p1_analytics && p2_analytics

      # High OBP followed by high SLG is good synergy
      next unless p1_analytics.on_base_percentage && p2_analytics.slugging_percentage

      synergy_score = (p1_analytics.on_base_percentage * p2_analytics.slugging_percentage).round(3)

      synergies << {
        player1_id: player1.id,
        player1_name: player1.name,
        player2_id: player2.id,
        player2_name: player2.name,
        synergy_type: 'table_setter_to_slugger',
        synergy_score: synergy_score
      }
    end

    synergies.sort_by { |s| -s[:synergy_score] }.first(3)
  end

  def analyze_defensive_synergies
    # Analyze middle infield and outfield synergies
    synergies = []

    # Middle infield (2B-SS)
    second_basemen = team_players.where(position: 'second_base')
    shortstops = team_players.where(position: 'shortstop')

    second_basemen.each do |second_baseman|
      shortstops.each do |shortstop|
        s2_analytics = second_baseman.player_analytics.find_by(season_id: season_id)
        ss_analytics = shortstop.player_analytics.find_by(season_id: season_id)

        next unless s2_analytics && ss_analytics

        combined_fielding = ((s2_analytics.fielding_percentage || 0) +
                            (ss_analytics.fielding_percentage || 0)) / 2.0

        synergies << {
          player1_id: second_baseman.id,
          player1_name: second_baseman.name,
          player2_id: shortstop.id,
          player2_name: shortstop.name,
          synergy_type: 'middle_infield',
          synergy_score: combined_fielding.round(3)
        }
      end
    end

    synergies.sort_by { |s| -s[:synergy_score] }.first(2)
  end

  def calculate_overall_chemistry
    # Simple chemistry score based on team consistency and performance
    player_analytics = PlayerAnalytics.joins(:player)
                                      .where(player: team_players, season_id: season_id)

    return 0.5 if player_analytics.empty?

    avg_consistency = player_analytics.average(:consistency_score) || 0.5
    improving_ratio = player_analytics.where(performance_trend: 'improving').count.to_f /
                      player_analytics.count

    ((avg_consistency * 0.7) + (improving_ratio * 0.3)).round(3)
  end
end
