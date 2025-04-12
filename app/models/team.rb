class Team < ApplicationRecord
  belongs_to :manager, class_name: 'User', optional: true
  
  has_many :team_memberships, dependent: :destroy
  has_many :users, through: :team_memberships
  has_many :home_games, class_name: 'Game', foreign_key: 'home_team_id', dependent: :destroy
  has_many :away_games, class_name: 'Game', foreign_key: 'away_team_id', dependent: :destroy
  has_many :league_registrations, dependent: :destroy
  has_many :leagues, through: :league_registrations
  
  validates :name, presence: true, uniqueness: true
  validates :description, presence: true
  validates :location, presence: true
  
  def games
    Game.where('home_team_id = ? OR away_team_id = ?', id, id)
  end
  
  def players
    users.where(team_memberships: { role: 'player' })
  end
  
  def coaches
    users.where(team_memberships: { role: 'coach' })
  end
  
  def record_for_league(league)
    wins = games.where(league: league, winner_id: id).count
    losses = games.where(league: league).where.not(winner_id: nil).where.not(winner_id: id).count
    ties = games.where(league: league, winner_id: nil).where(status: 'completed').count
    
    { wins: wins, losses: losses, ties: ties }
  end
end
