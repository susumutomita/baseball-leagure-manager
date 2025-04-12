class Match < ApplicationRecord
  belongs_to :league
  belongs_to :home_team, class_name: 'Team'
  belongs_to :away_team, class_name: 'Team'

  # Enums
  enum status: {
    scheduled: 'scheduled',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    postponed: 'postponed'
  }

  # Validations
  validates :date, presence: true
  validates :venue, presence: true
  validates :status, presence: true
  validates :home_score, :away_score,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true
  validate :teams_in_same_league
  validate :teams_are_different
  validate :scores_present_if_completed

  # Scopes
  scope :upcoming, -> { where('date > ?', Time.current).order(date: :asc) }
  scope :past, -> { where('date < ?', Time.current).order(date: :desc) }
  scope :by_team, ->(team_id) { where('home_team_id = ? OR away_team_id = ?', team_id, team_id) }

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
    scheduled? && date <= Time.current
  end

  def can_complete?
    in_progress? && home_score.present? && away_score.present?
  end

  private

  def teams_in_same_league
    return unless league && home_team && away_team
    unless league.teams.include?(home_team) && league.teams.include?(away_team)
      errors.add(:base, 'Both teams must be registered in the league')
    end
  end

  def teams_are_different
    if home_team_id == away_team_id
      errors.add(:base, 'Home team and away team must be different')
    end
  end

  def scores_present_if_completed
    if completed?
      if home_score.nil? || away_score.nil?
        errors.add(:base, 'Both scores must be present for completed matches')
      end
    end
  end
end
