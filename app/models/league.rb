class League < ApplicationRecord
  belongs_to :admin, class_name: 'User'
  
  has_many :seasons, dependent: :destroy
  has_many :league_registrations, dependent: :destroy
  has_many :teams, through: :league_registrations
  has_many :games, dependent: :destroy
  has_many :venues, dependent: :destroy
  has_many :league_fees, dependent: :destroy
  
  validates :name, presence: true, uniqueness: true
  validates :description, presence: true
  validates :registration_fee, numericality: { greater_than_or_equal_to: 0 }
  
  def active_season
    seasons.find_by(active: true)
  end
  
  def standings
    teams.map do |team|
      record = team.record_for_league(self)
      {
        team: team,
        wins: record[:wins],
        losses: record[:losses],
        ties: record[:ties],
        winning_percentage: calculate_winning_percentage(record),
        points: calculate_points(record)
      }
    end.sort_by { |s| [-s[:points], -s[:winning_percentage]] }
  end
  
  private
  
  def calculate_winning_percentage(record)
    total_games = record[:wins] + record[:losses] + record[:ties]
    return 0.0 if total_games.zero?
    
    (record[:wins] + (record[:ties] * 0.5)) / total_games.to_f
  end
  
  def calculate_points(record)
    (record[:wins] * 3) + record[:ties]
  end
end
