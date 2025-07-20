# frozen_string_literal: true

class MatchProposalDetail < ApplicationRecord
  include TenantScoped

  belongs_to :match_proposal
  belongs_to :home_team, class_name: "Team"
  belongs_to :away_team, class_name: "Team"
  belongs_to :match, optional: true

  validates :home_team_id, presence: true
  validates :away_team_id, presence: true
  validates :proposed_datetime, presence: true
  validates :home_team_id, comparison: { other_than: :away_team_id, message: "とアウェイチームは異なるチームを選択してください" }

  # Serialize metadata as JSON
  serialize :metadata, coder: JSON

  scope :upcoming, -> { where("proposed_datetime > ?", Time.current) }
  scope :not_applied, -> { where(applied: false) }
  
  delegate :league, to: :match_proposal

  def travel_distance_km
    return 0.0 unless home_team.latitude.present? && home_team.longitude.present? &&
                      away_team.latitude.present? && away_team.longitude.present?

    calculate_distance(
      home_team.latitude, home_team.longitude,
      away_team.latitude, away_team.longitude
    )
  end

  def strength_difference
    (home_team.current_strength_metric&.overall_rating || 0.5) - 
    (away_team.current_strength_metric&.overall_rating || 0.5)
  end

  def balanced?
    strength_difference.abs < 0.2
  end

  private

  def calculate_distance(lat1, lon1, lat2, lon2)
    # Haversine formula for distance calculation
    rad_per_deg = Math::PI / 180
    rkm = 6371 # Earth radius in kilometers

    dlat_rad = (lat2 - lat1) * rad_per_deg
    dlon_rad = (lon2 - lon1) * rad_per_deg

    lat1_rad = lat1 * rad_per_deg
    lat2_rad = lat2 * rad_per_deg

    a = Math.sin(dlat_rad / 2) ** 2 + 
        Math.cos(lat1_rad) * Math.cos(lat2_rad) * 
        Math.sin(dlon_rad / 2) ** 2
    
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    rkm * c
  end
end