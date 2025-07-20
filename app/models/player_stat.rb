# frozen_string_literal: true

class PlayerStat < ApplicationRecord
  include TenantScoped
  
  # Use the existing player_statistics table
  self.table_name = 'player_statistics'

  belongs_to :player
  belongs_to :season, optional: true
  belongs_to :match, optional: true

  validates :player_id, presence: true
  
  # Alias methods for column name differences
  alias_attribute :rbis, :runs_batted_in
  alias_attribute :era, :earned_run_average
  
  # Batting statistics
  validates :at_bats, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :hits, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :home_runs, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :runs_batted_in, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :batting_average, numericality: { in: 0..1 }, allow_nil: true
  
  # Pitching statistics
  validates :innings_pitched, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :earned_runs, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :earned_run_average, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  scope :recent, -> { order(created_at: :desc) }
  scope :season_stats, -> { where.not(season_id: nil) }
  scope :match_stats, -> { where.not(match_id: nil) }

  before_save :calculate_batting_average

  # JSON field accessors
  def hit_by_pitch
    (additional_stats || {})['hit_by_pitch'] || 0
  end

  def sacrifice_flies
    (additional_stats || {})['sacrifice_flies'] || 0
  end

  # Advanced batting metrics
  def on_base_percentage
    total_appearances = (at_bats || 0) + (walks || 0) + hit_by_pitch + sacrifice_flies
    return 0.0 if total_appearances.zero?
    
    reaches = (hits || 0) + (walks || 0) + hit_by_pitch
    (reaches.to_f / total_appearances).round(3)
  end

  def slugging_percentage
    return 0.0 if at_bats.nil? || at_bats.zero?
    
    (total_bases.to_f / at_bats).round(3)
  end

  def ops
    (on_base_percentage + slugging_percentage).round(3)
  end

  def total_bases
    singles = (hits || 0) - (doubles || 0) - (triples || 0) - (home_runs || 0)
    singles + ((doubles || 0) * 2) + ((triples || 0) * 3) + ((home_runs || 0) * 4)
  end

  # Fielding metrics
  def fielding_percentage
    total_chances = (putouts || 0) + (assists || 0) + (errors || 0)
    return 0.0 if total_chances.zero?
    
    (((putouts || 0) + (assists || 0)).to_f / total_chances).round(3)
  end

  private

  def calculate_batting_average
    if at_bats.present? && at_bats > 0 && hits.present?
      self.batting_average = (hits.to_f / at_bats).round(3)
    end
  end
end