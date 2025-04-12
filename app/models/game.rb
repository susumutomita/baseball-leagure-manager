class Game < ApplicationRecord
  belongs_to :league
  belongs_to :season
  belongs_to :venue
  belongs_to :home_team, class_name: 'Team'
  belongs_to :away_team, class_name: 'Team'
  belongs_to :winner, class_name: 'Team', optional: true
  belongs_to :umpire, class_name: 'User', optional: true
  
  has_many :game_statistics, dependent: :destroy
  
  enum status: { scheduled: 0, in_progress: 1, completed: 2, postponed: 3, cancelled: 4 }
  
  validates :scheduled_at, presence: true
  validate :teams_must_be_different
  validate :teams_must_be_in_league
  
  scope :upcoming, -> { where('scheduled_at > ?', Time.current) }
  scope :past, -> { where('scheduled_at < ?', Time.current) }
  scope :today, -> { where(scheduled_at: Time.current.beginning_of_day..Time.current.end_of_day) }
  
  def score
    return nil unless home_score.present? && away_score.present?
    
    "#{home_score} - #{away_score}"
  end
  
  def complete!(home_score, away_score)
    self.home_score = home_score
    self.away_score = away_score
    self.status = :completed
    
    if home_score > away_score
      self.winner = home_team
    elsif away_score > home_score
      self.winner = away_team
    end
    
    save
  end
  
  private
  
  def teams_must_be_different
    if home_team_id == away_team_id
      errors.add(:base, "Home team and away team must be different")
    end
  end
  
  def teams_must_be_in_league
    unless league.teams.include?(home_team) && league.teams.include?(away_team)
      errors.add(:base, "Both teams must be registered in the league")
    end
  end
end
