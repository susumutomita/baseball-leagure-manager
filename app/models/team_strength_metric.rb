# frozen_string_literal: true

class TeamStrengthMetric < ApplicationRecord
  include TenantScoped

  belongs_to :team
  belongs_to :season, optional: true

  validates :team_id, presence: true
  validates :overall_rating, numericality: { in: 0..1 }
  validates :offensive_rating, numericality: { in: 0..1 }
  validates :defensive_rating, numericality: { in: 0..1 }
  validates :pitching_rating, numericality: { in: 0..1 }
  validates :recent_form_rating, numericality: { in: 0..1 }
  validates :win_rate, numericality: { in: 0..1 }, allow_nil: true
  validates :average_runs_scored, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :average_runs_allowed, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :games_played, numericality: { greater_than_or_equal_to: 0 }
  validates :wins, numericality: { greater_than_or_equal_to: 0 }
  validates :losses, numericality: { greater_than_or_equal_to: 0 }
  validates :ties, numericality: { greater_than_or_equal_to: 0 }

  # Serialize detailed metrics as JSON
  serialize :detailed_metrics, coder: JSON
  serialize :player_contributions, coder: JSON

  scope :current, -> { where(is_current: true) }
  scope :by_season, ->(season) { where(season: season) }
  scope :ranked, -> { order(overall_rating: :desc) }

  # Callbacks
  before_save :calculate_overall_rating
  after_save :update_team_current_metric

  def self.calculate_for_team(team, options = {})
    metric = find_or_initialize_by(
      team: team,
      season: options[:season],
      is_current: options[:season].nil?
    )

    # Gather match statistics
    matches = team.home_matches.or(team.away_matches)
    matches = matches.where(season: options[:season]) if options[:season]
    matches = matches.where(status: "completed")

    metric.games_played = matches.count
    metric.wins = matches.where(winner_team_id: team.id).count
    metric.losses = matches.where.not(winner_team_id: [team.id, nil]).count
    metric.ties = matches.where(winner_team_id: nil).count - (metric.games_played - metric.wins - metric.losses)

    # Calculate win rate
    metric.win_rate = metric.games_played > 0 ? metric.wins.to_f / metric.games_played : 0.0

    # Calculate run statistics
    home_runs_scored = matches.where(home_team: team).sum(:home_score)
    away_runs_scored = matches.where(away_team: team).sum(:away_score)
    total_runs_scored = home_runs_scored + away_runs_scored

    home_runs_allowed = matches.where(home_team: team).sum(:away_score)
    away_runs_allowed = matches.where(away_team: team).sum(:home_score)
    total_runs_allowed = home_runs_allowed + away_runs_allowed

    metric.average_runs_scored = metric.games_played > 0 ? total_runs_scored.to_f / metric.games_played : 0.0
    metric.average_runs_allowed = metric.games_played > 0 ? total_runs_allowed.to_f / metric.games_played : 0.0

    # Calculate ratings
    metric.calculate_offensive_rating
    metric.calculate_defensive_rating
    metric.calculate_pitching_rating
    metric.calculate_recent_form_rating

    # Store detailed metrics
    metric.detailed_metrics = {
      total_runs_scored: total_runs_scored,
      total_runs_allowed: total_runs_allowed,
      home_record: { wins: matches.where(home_team: team, winner_team_id: team.id).count },
      away_record: { wins: matches.where(away_team: team, winner_team_id: team.id).count },
      last_updated: Time.current
    }

    metric.save!
    metric
  end

  def calculate_offensive_rating
    # Simple offensive rating based on runs scored
    # Can be enhanced with more sophisticated metrics
    max_avg_runs = 10.0 # Assumed maximum average runs per game
    self.offensive_rating = [average_runs_scored / max_avg_runs, 1.0].min
  end

  def calculate_defensive_rating
    # Simple defensive rating based on runs allowed (inverted)
    # Lower runs allowed = higher rating
    max_avg_runs = 10.0
    self.defensive_rating = 1.0 - [average_runs_allowed / max_avg_runs, 1.0].min
  end

  def calculate_pitching_rating
    # For now, use defensive rating as a proxy
    # Can be enhanced with actual pitching statistics
    self.pitching_rating = defensive_rating
  end

  def calculate_recent_form_rating
    # Calculate based on last 5 games
    recent_matches = team.home_matches.or(team.away_matches)
                         .where(status: "completed")
                         .order(scheduled_at: :desc)
                         .limit(5)
    
    return 0.5 if recent_matches.empty?

    recent_wins = recent_matches.where(winner_team_id: team.id).count
    self.recent_form_rating = recent_wins / 5.0
  end

  def strength_category
    case overall_rating
    when 0.8..1.0
      "最強"
    when 0.6..0.8
      "強豪"
    when 0.4..0.6
      "中堅"
    when 0.2..0.4
      "発展途上"
    else
      "初心者"
    end
  end

  private

  def calculate_overall_rating
    # Weighted average of all ratings
    weights = {
      offensive: 0.3,
      defensive: 0.3,
      pitching: 0.2,
      recent_form: 0.2
    }

    self.overall_rating = 
      (offensive_rating * weights[:offensive]) +
      (defensive_rating * weights[:defensive]) +
      (pitching_rating * weights[:pitching]) +
      (recent_form_rating * weights[:recent_form])
  end

  def update_team_current_metric
    if is_current?
      # Ensure only one current metric per team
      team.team_strength_metrics.where.not(id: id).update_all(is_current: false)
    end
  end
end