# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Ai::TeamStrengthAnalyzer, type: :service do
  let(:organization) { create(:organization) }
  let(:league) { create(:league, organization: organization) }
  let(:teams) { create_list(:team, 4, organization: organization) }
  let(:analyzer) { described_class.new(league) }

  before do
    league.teams << teams
    ActsAsTenant.current_tenant = organization
  end

  after do
    ActsAsTenant.current_tenant = nil
  end

  describe '#analyze_all_teams' do
    it 'creates strength metrics for all teams' do
      expect {
        analyzer.analyze_all_teams
      }.to change(TeamStrengthMetric, :count).by(teams.size)
    end

    it 'calculates metrics based on match history' do
      # Create some completed matches
      create(:match, 
             league: league,
             home_team: teams[0],
             away_team: teams[1],
             home_score: 5,
             away_score: 3,
             status: :completed,
             winner_team: teams[0])

      create(:match,
             league: league,
             home_team: teams[2],
             away_team: teams[0],
             home_score: 2,
             away_score: 4,
             status: :completed,
             winner_team: teams[0])

      metrics = analyzer.analyze_all_teams
      winning_team_metric = metrics.find { |m| m.team == teams[0] }
      
      expect(winning_team_metric.wins).to eq(2)
      expect(winning_team_metric.losses).to eq(0)
      expect(winning_team_metric.win_rate).to eq(1.0)
    end
  end

  describe '#teams_by_strength' do
    before do
      teams.each_with_index do |team, index|
        create(:team_strength_metric,
               team: team,
               overall_rating: (index + 1) * 0.2,
               is_current: true)
      end
    end

    it 'returns teams sorted by strength' do
      sorted_teams = analyzer.teams_by_strength
      ratings = sorted_teams.map { |t| t.current_strength_metric.overall_rating }
      expect(ratings).to eq(ratings.sort.reverse)
    end
  end

  describe '#find_balanced_matchups' do
    let(:target_team) { teams.first }

    before do
      teams.each_with_index do |team, index|
        create(:team_strength_metric,
               team: team,
               overall_rating: 0.5 + (index * 0.1),
               is_current: true)
      end
    end

    it 'returns matchups sorted by balance' do
      matchups = analyzer.find_balanced_matchups(target_team)
      expect(matchups).to all(include(:opponent, :strength_difference, :balance_score))
      
      # Check that they're sorted by balance score
      balance_scores = matchups.map { |m| m[:balance_score] }
      expect(balance_scores).to eq(balance_scores.sort.reverse)
    end
  end

  describe '#predict_match_outcome' do
    let(:home_team) { teams[0] }
    let(:away_team) { teams[1] }

    before do
      create(:team_strength_metric,
             team: home_team,
             overall_rating: 0.7,
             is_current: true)
      
      create(:team_strength_metric,
             team: away_team,
             overall_rating: 0.5,
             is_current: true)
    end

    it 'predicts match outcome based on team strengths' do
      prediction = analyzer.predict_match_outcome(home_team, away_team)
      
      expect(prediction[:home_win_probability]).to be > prediction[:away_win_probability]
      expect(prediction[:home_win_probability] + prediction[:away_win_probability] + prediction[:tie_probability]).to be_within(0.01).of(1.0)
    end
  end

  describe '#head_to_head_analysis' do
    let(:team1) { teams[0] }
    let(:team2) { teams[1] }

    context 'with match history' do
      before do
        # Team1 wins 2, Team2 wins 1
        create(:match,
               home_team: team1,
               away_team: team2,
               home_score: 5,
               away_score: 3,
               status: :completed,
               winner_team: team1)
        
        create(:match,
               home_team: team2,
               away_team: team1,
               home_score: 2,
               away_score: 4,
               status: :completed,
               winner_team: team1)
        
        create(:match,
               home_team: team1,
               away_team: team2,
               home_score: 1,
               away_score: 3,
               status: :completed,
               winner_team: team2)
      end

      it 'returns head-to-head statistics' do
        analysis = analyzer.head_to_head_analysis(team1, team2)
        
        expect(analysis[:total_matches]).to eq(3)
        expect(analysis[:team1_wins]).to eq(2)
        expect(analysis[:team2_wins]).to eq(1)
        expect(analysis[:team1_win_rate]).to be_within(0.01).of(0.667)
      end
    end

    context 'without match history' do
      it 'returns empty statistics' do
        analysis = analyzer.head_to_head_analysis(team1, team2)
        
        expect(analysis[:total_matches]).to eq(0)
        expect(analysis[:historical_balance]).to eq(0.5)
      end
    end
  end
end