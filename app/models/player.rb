class Player < ApplicationRecord
  belongs_to :team

  # Validations
  validates :name, presence: true
  validates :position, presence: true
  validates :jersey_number, presence: true,
                          numericality: { only_integer: true, greater_than: 0 },
                          uniqueness: { scope: :team_id }
  validates :contact_email, presence: true,
                          format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :birth_date, presence: true
  validate :birth_date_not_in_future

  # Scopes
  scope :by_position, ->(position) { where(position: position) }
  scope :active, -> { where(active: true) }

  # Methods
  def age
    return nil unless birth_date
    ((Time.zone.now - birth_date.to_time) / 1.year.seconds).floor
  end

  private

  def birth_date_not_in_future
    if birth_date.present? && birth_date > Date.current
      errors.add(:birth_date, "can't be in the future")
    end
  end
end
