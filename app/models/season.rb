# frozen_string_literal: true

class Season < ApplicationRecord
  include TenantScoped

  has_many :leagues, dependent: :destroy
  has_many :matches, dependent: :destroy
  has_many :team_strength_metrics, dependent: :destroy

  validates :name, presence: true, uniqueness: { scope: :organization_id }
  validates :year, presence: true, numericality: { only_integer: true }
  validates :start_date, presence: true
  validates :end_date, presence: true

  validate :start_date_before_end_date

  scope :current, -> { where('start_date <= ? AND end_date >= ?', Date.current, Date.current).first }
  scope :upcoming, -> { where('start_date > ?', Date.current).order(start_date: :asc) }
  scope :past, -> { where('end_date < ?', Date.current).order(end_date: :desc) }

  def active?
    Date.current.between?(start_date, end_date)
  end

  def upcoming?
    start_date > Date.current
  end

  def past?
    end_date < Date.current
  end

  private

  def start_date_before_end_date
    return unless start_date && end_date
    if start_date >= end_date
      errors.add(:start_date, 'must be before end date')
    end
  end
end