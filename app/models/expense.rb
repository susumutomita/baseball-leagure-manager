class Expense < ApplicationRecord
  belongs_to :league
  belongs_to :created_by, class_name: 'User'
  
  enum category: {
    venue_rental: 0,
    equipment: 1,
    umpire_fee: 2,
    insurance: 3,
    award: 4,
    administrative: 5,
    other: 6
  }
  
  validates :amount, numericality: { greater_than: 0 }
  validates :description, presence: true
  validates :date, presence: true
  
  scope :current_fiscal_year, -> {
    where(date: Date.new(Date.current.year, 1, 1)..Date.new(Date.current.year, 12, 31))
  }
  
  def self.total_by_category
    group(:category).sum(:amount)
  end
end
