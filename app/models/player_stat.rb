# frozen_string_literal: true

class PlayerStat < ApplicationRecord
  include TenantScoped

  belongs_to :player
  belongs_to :season, optional: true
  belongs_to :match, optional: true

  validates :player_id, presence: true
  
  # Batting statistics
  validates :at_bats, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :hits, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :home_runs, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :rbis, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :batting_average, numericality: { in: 0..1 }, allow_nil: true
  
  # Pitching statistics
  validates :innings_pitched, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :earned_runs, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :era, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  scope :recent, -> { order(created_at: :desc) }
  scope :season_stats, -> { where.not(season_id: nil) }
  scope :match_stats, -> { where.not(match_id: nil) }

  before_save :calculate_batting_average

  private

  def calculate_batting_average
    if at_bats.present? && at_bats > 0 && hits.present?
      self.batting_average = (hits.to_f / at_bats).round(3)
    end
  end
end