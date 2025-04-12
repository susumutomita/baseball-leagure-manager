class LeagueTeam < ApplicationRecord
  belongs_to :league
  belongs_to :team

  # Enums
  enum payment_status: {
    pending: 'pending',
    paid: 'paid',
    refunded: 'refunded'
  }

  # Validations
  validates :registration_date, presence: true
  validates :payment_status, presence: true
  validates :team_id, uniqueness: { scope: :league_id, message: 'is already registered in this league' }
  validate :league_registration_deadline_not_passed
  validate :league_max_teams_not_exceeded

  # Callbacks
  before_validation :set_registration_date, on: :create
  after_create :create_registration_transaction

  private

  def set_registration_date
    self.registration_date ||= Time.current
  end

  def league_registration_deadline_not_passed
    return unless league && registration_date
    if registration_date > league.registration_deadline
      errors.add(:base, 'Registration deadline has passed')
    end
  end

  def league_max_teams_not_exceeded
    return unless league
    if league.league_teams.count >= league.max_teams && !league.league_teams.exists?(team_id: team_id)
      errors.add(:base, 'Maximum number of teams has been reached')
    end
  end

  def create_registration_transaction
    league.transactions.create!(
      team: team,
      amount: league.fee_amount,
      description: "League registration fee for #{league.name} - #{league.season}",
      payment_status: 'pending',
      transaction_date: Time.current
    )
  end
end
