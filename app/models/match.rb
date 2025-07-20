class Match < ApplicationRecord
  include TenantScoped

  belongs_to :league
  belongs_to :home_team, class_name: 'Team'
  belongs_to :away_team, class_name: 'Team'
  belongs_to :match_proposal, optional: true
  belongs_to :winner_team, class_name: 'Team', optional: true
  belongs_to :season, optional: true
  belongs_to :venue, optional: true

  # Enums
  enum :status, {
    scheduled: 'scheduled',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    postponed: 'postponed'
  }

  # Associations for AI Scheduler
  has_many :schedule_conflicts, dependent: :destroy
  has_many :conflicting_matches, through: :schedule_conflicts
  has_many :rescheduled_matches, dependent: :destroy

  # Validations
  validates :scheduled_at, presence: true
  validates :status, presence: true
  validates :home_score, :away_score,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true
  validate :teams_in_same_league
  validate :teams_are_different
  validate :scores_present_if_completed

  # Scopes
  scope :upcoming, -> { where('scheduled_at > ?', Time.current).order(scheduled_at: :asc) }
  scope :past, -> { where(scheduled_at: ...Time.current).order(scheduled_at: :desc) }
  scope :by_team, ->(team_id) { where('home_team_id = ? OR away_team_id = ?', team_id, team_id) }
  scope :completed, -> { where(status: 'completed') }

  # Methods
  def winner
    return nil unless completed?
    return nil if home_score == away_score

    home_score > away_score ? home_team : away_team
  end

  def loser
    return nil unless completed?
    return nil if home_score == away_score

    home_score < away_score ? home_team : away_team
  end

  def tied?
    completed? && home_score == away_score
  end

  def can_start?
    scheduled? && scheduled_at <= Time.current
  end

  def can_complete?
    in_progress? && home_score.present? && away_score.present?
  end

  private

  def teams_in_same_league
    return unless league && home_team && away_team

    return if league.teams.include?(home_team) && league.teams.include?(away_team)

    errors.add(:base, 'Both teams must be registered in the league')
  end

  def teams_are_different
    return unless home_team_id == away_team_id

    errors.add(:base, 'Home team and away team must be different')
  end

  def scores_present_if_completed
    return unless completed?
    return unless home_score.nil? || away_score.nil?

    errors.add(:base, 'Both scores must be present for completed matches')
  end
end
