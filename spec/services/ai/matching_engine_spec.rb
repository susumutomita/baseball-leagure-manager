# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Ai::MatchingEngine, type: :service do
  let(:organization) { create(:organization) }
  let(:league) { create(:league, organization: organization) }
  let(:teams) { create_list(:team, 6, organization: organization) }
  let(:config) { create(:ai_matching_config, league: league) }
  
  before do
    league.teams << teams
    ActsAsTenant.current_tenant = organization
  end

  after do
    ActsAsTenant.current_tenant = nil
  end

  describe '#generate_proposal' do
    let(:engine) { described_class.new(league) }

    it 'creates a match proposal with details' do
      expect {
        engine.generate_proposal
      }.to change(MatchProposal, :count).by(1)
         .and change(MatchProposalDetail, :count)
    end

    it 'generates appropriate number of matches for single round-robin' do
      proposal = engine.generate_proposal
      expected_matches = teams.size * (teams.size - 1) / 2
      expect(proposal.match_proposal_details.count).to eq(expected_matches)
    end

    it 'generates double round-robin when specified' do
      engine = described_class.new(league, double_round_robin: true)
      proposal = engine.generate_proposal
      expected_matches = teams.size * (teams.size - 1)
      expect(proposal.match_proposal_details.count).to eq(expected_matches)
    end

    it 'calculates proposal scores' do
      proposal = engine.generate_proposal
      expect(proposal.strength_balance_score).to be_present
      expect(proposal.travel_efficiency_score).to be_present
      expect(proposal.schedule_preference_score).to be_present
      expect(proposal.home_away_balance_score).to be_present
      expect(proposal.overall_fairness_score).to be_present
    end

    context 'with different algorithm types' do
      it 'generates balanced matches' do
        config.update!(algorithm_type: :balanced)
        proposal = engine.generate_proposal
        expect(proposal).to be_persisted
      end

      it 'generates travel-optimized matches' do
        config.update!(algorithm_type: :travel_optimized)
        # Add location data to teams
        teams.each_with_index do |team, index|
          team.update!(
            latitude: 35.6762 + (index * 0.1),
            longitude: 139.6503 + (index * 0.1)
          )
        end
        proposal = engine.generate_proposal
        expect(proposal).to be_persisted
      end

      it 'generates strength-based matches' do
        config.update!(algorithm_type: :strength_based)
        # Create strength metrics for teams
        teams.each_with_index do |team, index|
          create(:team_strength_metric, 
                 team: team, 
                 overall_rating: 0.3 + (index * 0.1),
                 is_current: true)
        end
        proposal = engine.generate_proposal
        expect(proposal).to be_persisted
      end
    end
  end

  describe '#optimize_existing_schedule' do
    let(:engine) { described_class.new(league) }
    let(:proposal) { create(:match_proposal, league: league, ai_matching_config: config) }

    before do
      # Create some match details
      teams.combination(2).each do |team1, team2|
        create(:match_proposal_detail,
               match_proposal: proposal,
               home_team: team1,
               away_team: team2,
               proposed_datetime: 1.week.from_now)
      end
    end

    it 'optimizes the schedule' do
      expect {
        engine.optimize_existing_schedule(proposal)
      }.not_to raise_error
    end
  end
end