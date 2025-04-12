class BudgetItem < ApplicationRecord
  belongs_to :league
  
  enum category: { income: 0, expense: 1 }
  
  validates :fiscal_year, presence: true, numericality: { only_integer: true }
  validates :amount, numericality: { greater_than_or_equal_to: 0 }
  validates :description, presence: true
  validates :subcategory, presence: true
  
  scope :current_fiscal_year, -> { where(fiscal_year: Date.current.year) }
  scope :income_items, -> { where(category: :income) }
  scope :expense_items, -> { where(category: :expense) }
  
  def self.total_income(fiscal_year = Date.current.year)
    where(fiscal_year: fiscal_year, category: :income).sum(:amount)
  end
  
  def self.total_expense(fiscal_year = Date.current.year)
    where(fiscal_year: fiscal_year, category: :expense).sum(:amount)
  end
  
  def self.net_budget(fiscal_year = Date.current.year)
    total_income(fiscal_year) - total_expense(fiscal_year)
  end
end
