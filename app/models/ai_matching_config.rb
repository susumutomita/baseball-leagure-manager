# frozen_string_literal: true

class AiMatchingConfig < ApplicationRecord
  include TenantScoped

  belongs_to :league
  has_many :match_proposals, dependent: :destroy

  # AI matching algorithm preferences
  enum algorithm_type: {
    balanced: 0,          # バランス重視
    travel_optimized: 1,  # 移動距離最適化
    strength_based: 2,    # 戦力均衡重視
    custom: 3             # カスタム設定
  }

  # AI provider configuration
  enum ai_provider: {
    openai: 0,
    claude: 1,
    local: 2  # ローカルアルゴリズムのみ
  }

  validates :league_id, uniqueness: { scope: :organization_id }
  validates :algorithm_type, presence: true
  validates :ai_provider, presence: true
  validates :weight_strength_balance, numericality: { in: 0..1 }
  validates :weight_travel_distance, numericality: { in: 0..1 }
  validates :weight_schedule_preference, numericality: { in: 0..1 }
  validates :weight_home_away_balance, numericality: { in: 0..1 }
  validates :max_consecutive_home_games, numericality: { greater_than: 0 }
  validates :max_consecutive_away_games, numericality: { greater_than: 0 }
  validates :min_days_between_matches, numericality: { greater_than_or_equal_to: 0 }
  validates :max_travel_distance_km, numericality: { greater_than: 0 }, allow_nil: true

  # Ensure weights sum to 1.0
  validate :weights_sum_to_one

  # Default configuration
  after_initialize :set_defaults, if: :new_record?

  # Serialize custom rules as JSON
  serialize :custom_rules, coder: JSON

  def active_model?
    return false unless ai_provider_openai? || ai_provider_claude?
    
    api_key.present?
  end

  def calculate_fairness_score(match_proposal)
    score = 0.0
    score += weight_strength_balance * match_proposal.strength_balance_score
    score += weight_travel_distance * match_proposal.travel_efficiency_score
    score += weight_schedule_preference * match_proposal.schedule_preference_score
    score += weight_home_away_balance * match_proposal.home_away_balance_score
    score
  end

  private

  def set_defaults
    self.algorithm_type ||= :balanced
    self.ai_provider ||= :local
    self.weight_strength_balance ||= 0.25
    self.weight_travel_distance ||= 0.25
    self.weight_schedule_preference ||= 0.25
    self.weight_home_away_balance ||= 0.25
    self.max_consecutive_home_games ||= 3
    self.max_consecutive_away_games ||= 3
    self.min_days_between_matches ||= 3
    self.use_ai_analysis ||= false
    self.custom_rules ||= {}
  end

  def weights_sum_to_one
    total = weight_strength_balance + weight_travel_distance + 
            weight_schedule_preference + weight_home_away_balance
    
    if (total - 1.0).abs > 0.001
      errors.add(:base, "重み係数の合計は1.0になるように設定してください（現在: #{total}）")
    end
  end
end