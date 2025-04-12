class League < ApplicationRecord
  # Associations
  has_many :matches, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :league_teams
  has_many :teams, through: :league_teams

  # Enums
  enum status: {
    registration_open: 'registration_open',
    in_progress: 'in_progress',
    completed: 'completed'
  }

  # Validations
  validates :name, presence: true, uniqueness: { scope: :season }
  validates :season, presence: true
  validates :start_date, :end_date, :registration_deadline, presence: true
  validates :max_teams, presence: true,
                       numericality: { only_integer: true, greater_than: 0 }
  validates :fee_amount, presence: true,
                        numericality: { greater_than_or_equal_to: 0 }
  validate :registration_deadline_before_start_date
  validate :start_date_before_end_date

  # Scopes
  scope :current, -> { where('start_date <= ? AND end_date >= ?', Date.current, Date.current) }
  scope :upcoming, -> { where('start_date > ?', Date.current) }
  scope :past, -> { where('end_date < ?', Date.current) }

  # Methods
  def registration_open?
    Date.current <= registration_deadline
  end

  def generate_schedule
    return false unless teams.count >= 2

    matches.destroy_all
    teams_array = teams.to_a
    teams_array.combination(2).each do |home_team, away_team|
      matches.create(
        home_team: home_team,
        away_team: away_team,
        date: next_available_date,
        status: 'scheduled'
      )
    end
    true
  end

  def standings
    teams.map do |team|
      record = team.win_loss_record
      {
        team: team,
        wins: record[:wins],
        losses: record[:losses],
        winning_percentage: calculate_winning_percentage(record)
      }
    end.sort_by { |s| [-s[:winning_percentage], -s[:wins], s[:losses]] }
  end

  private

  def registration_deadline_before_start_date
    return unless registration_deadline && start_date
    if registration_deadline >= start_date
      errors.add(:registration_deadline, 'must be before start date')
    end
  end

  def start_date_before_end_date
    return unless start_date && end_date
    if start_date >= end_date
      errors.add(:start_date, 'must be before end date')
    end
  end

  def next_available_date
    # Simple implementation - can be made more sophisticated
    latest_match = matches.order(date: :desc).first
    if latest_match
      latest_match.date + 1.week
    else
      start_date + 1.week
    end
  end

  def calculate_winning_percentage(record)
    total_games = record[:wins] + record[:losses]
    return 0.0 if total_games.zero?
    (record[:wins].to_f / total_games).round(3)
  end
end
