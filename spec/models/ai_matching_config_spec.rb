# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AiMatchingConfig, type: :model do
  describe 'associations' do
    it { should belong_to(:league) }
    it { should have_many(:match_proposals).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:ai_matching_config) }

    it { should validate_presence_of(:algorithm_type) }
    it { should validate_presence_of(:ai_provider) }
    it { should validate_numericality_of(:weight_strength_balance).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(1) }
    it { should validate_numericality_of(:weight_travel_distance).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(1) }
    it { should validate_numericality_of(:weight_schedule_preference).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(1) }
    it { should validate_numericality_of(:weight_home_away_balance).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(1) }
    it { should validate_numericality_of(:max_consecutive_home_games).is_greater_than(0) }
    it { should validate_numericality_of(:max_consecutive_away_games).is_greater_than(0) }
    it { should validate_numericality_of(:min_days_between_matches).is_greater_than_or_equal_to(0) }
    it { should validate_numericality_of(:max_travel_distance_km).is_greater_than(0).allow_nil }

    it 'validates that weights sum to 1.0' do
      config = build(:ai_matching_config,
                     weight_strength_balance: 0.3,
                     weight_travel_distance: 0.3,
                     weight_schedule_preference: 0.2,
                     weight_home_away_balance: 0.1)
      expect(config).not_to be_valid
      expect(config.errors[:base]).to include(/重み係数の合計は1.0になるように設定してください/)
    end
  end

  describe 'enums' do
    it { should define_enum_for(:algorithm_type).with_values(balanced: 0, travel_optimized: 1, strength_based: 2, custom: 3) }
    it { should define_enum_for(:ai_provider).with_values(openai: 0, claude: 1, local: 2) }
  end

  describe '#active_model?' do
    let(:config) { build(:ai_matching_config) }

    context 'when using OpenAI provider' do
      before { config.ai_provider = :openai }

      it 'returns true when API key is present' do
        config.api_key = 'test-api-key'
        expect(config.active_model?).to be true
      end

      it 'returns false when API key is missing' do
        config.api_key = nil
        expect(config.active_model?).to be false
      end
    end

    context 'when using local provider' do
      before { config.ai_provider = :local }

      it 'returns false regardless of API key' do
        config.api_key = 'test-api-key'
        expect(config.active_model?).to be false
      end
    end
  end

  describe '#calculate_fairness_score' do
    let(:config) { create(:ai_matching_config) }
    let(:match_proposal) { create(:match_proposal, ai_matching_config: config) }

    before do
      match_proposal.strength_balance_score = 0.8
      match_proposal.travel_efficiency_score = 0.7
      match_proposal.schedule_preference_score = 0.9
      match_proposal.home_away_balance_score = 0.6
    end

    it 'calculates weighted average of scores' do
      score = config.calculate_fairness_score(match_proposal)
      expected_score = 0.25 * 0.8 + 0.25 * 0.7 + 0.25 * 0.9 + 0.25 * 0.6
      expect(score).to eq(expected_score)
    end
  end
end