class Team < ApplicationRecord
  # Associations
  has_many :players, dependent: :destroy
  has_many :home_matches, class_name: 'Match', foreign_key: 'home_team_id'
  has_many :away_matches, class_name: 'Match', foreign_key: 'away_team_id'
  has_many :transactions

  # Validations
  validates :name, presence: true, uniqueness: true
  validates :city, presence: true
  validates :manager_name, presence: true
  validates :contact_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Methods
  def matches
    Match.where('home_team_id = ? OR away_team_id = ?', id, id)
  end

  def win_loss_record
    wins = matches.where('(home_team_id = ? AND home_score > away_score) OR (away_team_id = ? AND away_score > home_score)', id, id).count
    losses = matches.where('(home_team_id = ? AND home_score < away_score) OR (away_team_id = ? AND away_score < home_score)', id, id).count
    { wins: wins, losses: losses }
  end
end
