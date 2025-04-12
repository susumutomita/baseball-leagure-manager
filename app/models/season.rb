class Season < ApplicationRecord
  belongs_to :league
  
  has_many :games, dependent: :destroy
  has_many :season_registrations, dependent: :destroy
  has_many :teams, through: :season_registrations
  
  validates :name, presence: true
  validates :start_date, presence: true
  validates :end_date, presence: true
  validates :registration_deadline, presence: true
  
  validate :end_date_after_start_date
  validate :registration_deadline_before_start_date
  
  scope :active, -> { where(active: true) }
  scope :upcoming, -> { where('start_date > ?', Date.current) }
  scope :past, -> { where('end_date < ?', Date.current) }
  scope :current, -> { where('start_date <= ? AND end_date >= ?', Date.current, Date.current) }
  
  def activate!
    Season.where(league_id: league_id).update_all(active: false)
    update(active: true)
  end
  
  def status
    return 'upcoming' if start_date > Date.current
    return 'active' if start_date <= Date.current && end_date >= Date.current
    'completed'
  end
  
  private
  
  def end_date_after_start_date
    return if end_date.blank? || start_date.blank?
    
    if end_date < start_date
      errors.add(:end_date, "must be after the start date")
    end
  end
  
  def registration_deadline_before_start_date
    return if registration_deadline.blank? || start_date.blank?
    
    if registration_deadline > start_date
      errors.add(:registration_deadline, "must be before the start date")
    end
  end
end
