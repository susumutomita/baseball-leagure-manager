# frozen_string_literal: true

class MatchProposal < ApplicationRecord
  include TenantScoped

  belongs_to :ai_matching_config
  belongs_to :league
  has_many :match_proposal_details, dependent: :destroy
  has_many :matches, dependent: :nullify

  enum status: {
    draft: 0,        # 下書き
    proposed: 1,     # 提案中
    approved: 2,     # 承認済み
    rejected: 3,     # 却下
    applied: 4       # 適用済み
  }

  validates :league_id, presence: true
  validates :ai_matching_config_id, presence: true
  validates :status, presence: true
  validates :overall_fairness_score, numericality: { in: 0..1 }, allow_nil: true
  validates :strength_balance_score, numericality: { in: 0..1 }, allow_nil: true
  validates :travel_efficiency_score, numericality: { in: 0..1 }, allow_nil: true
  validates :schedule_preference_score, numericality: { in: 0..1 }, allow_nil: true
  validates :home_away_balance_score, numericality: { in: 0..1 }, allow_nil: true

  # Serialize metadata and analysis data as JSON
  serialize :proposal_metadata, coder: JSON
  serialize :ai_analysis_result, coder: JSON
  serialize :rejection_reasons, coder: JSON

  scope :recent, -> { order(created_at: :desc) }
  scope :pending_approval, -> { where(status: [:draft, :proposed]) }

  def calculate_overall_score
    config = ai_matching_config
    return 0.0 unless config

    self.overall_fairness_score = config.calculate_fairness_score(self)
  end

  def apply_to_schedule!
    return false unless approved?

    transaction do
      match_proposal_details.each do |detail|
        match = Match.create!(
          league: league,
          home_team: detail.home_team,
          away_team: detail.away_team,
          scheduled_at: detail.proposed_datetime,
          venue: detail.proposed_venue,
          match_proposal: self,
          organization_id: organization_id
        )
        
        detail.update!(applied: true, match: match)
      end

      update!(status: :applied, applied_at: Time.current)
    end

    true
  rescue ActiveRecord::RecordInvalid => e
    errors.add(:base, "スケジュール適用中にエラーが発生しました: #{e.message}")
    false
  end

  def can_approve?
    draft? || proposed?
  end

  def can_reject?
    draft? || proposed?
  end

  def total_matches
    match_proposal_details.count
  end

  def affected_teams
    team_ids = match_proposal_details.pluck(:home_team_id, :away_team_id).flatten.uniq
    Team.where(id: team_ids)
  end

  def conflict_analysis
    conflicts = []
    
    match_proposal_details.each do |detail|
      # Check for team schedule conflicts
      existing_matches = Match.where(
        league: league,
        scheduled_at: detail.proposed_datetime.beginning_of_day..detail.proposed_datetime.end_of_day
      ).where(
        "(home_team_id = :home_id OR away_team_id = :home_id OR home_team_id = :away_id OR away_team_id = :away_id)",
        home_id: detail.home_team_id,
        away_id: detail.away_team_id
      )

      if existing_matches.exists?
        conflicts << {
          detail_id: detail.id,
          type: "schedule_conflict",
          message: "#{detail.home_team.name} または #{detail.away_team.name} は既に試合が予定されています"
        }
      end

      # Check for venue conflicts
      if detail.proposed_venue.present?
        venue_matches = Match.where(
          venue: detail.proposed_venue,
          scheduled_at: (detail.proposed_datetime - 3.hours)..(detail.proposed_datetime + 3.hours)
        )

        if venue_matches.exists?
          conflicts << {
            detail_id: detail.id,
            type: "venue_conflict",
            message: "#{detail.proposed_venue} は既に使用予定があります"
          }
        end
      end
    end

    conflicts
  end

  def ai_summary
    return nil unless ai_analysis_result.present?
    
    ai_analysis_result["summary"]
  end

  def improvement_suggestions
    return [] unless ai_analysis_result.present?
    
    ai_analysis_result["suggestions"] || []
  end
end