class Venue < ApplicationRecord
  belongs_to :league
  
  has_many :games, dependent: :nullify
  
  validates :name, presence: true
  validates :address, presence: true
  validates :capacity, numericality: { only_integer: true, greater_than: 0 }
  
  def available_at?(datetime)
    games.where(scheduled_at: (datetime - 3.hours)..(datetime + 3.hours)).none?
  end
  
  def upcoming_games
    games.upcoming.order(scheduled_at: :asc)
  end
end
