# frozen_string_literal: true

module Organizations
  class MatchProposalsController < ApplicationController
    before_action :authenticate_user!
    before_action :set_league
    before_action :set_match_proposal, only: [:show, :edit, :update, :destroy, :approve, :reject, :apply]
    before_action :authorize_match_proposal

    def index
      @match_proposals = @league.match_proposals
                               .includes(:ai_matching_config, :match_proposal_details)
                               .recent
                               .page(params[:page])
    end

    def show
      @details = @match_proposal.match_proposal_details
                               .includes(:home_team, :away_team)
                               .order(:proposed_datetime)
      
      @conflicts = @match_proposal.conflict_analysis
      @fairness_analysis = Ai::FairnessCalculator.new(@match_proposal).detailed_analysis
    end

    def new
      unless @league.ai_matching_config
        redirect_to new_organization_league_ai_matching_config_path(@league),
                    alert: '先にAIマッチング設定を作成してください。'
        return
      end

      @match_proposal = @league.match_proposals.build
    end

    def create
      # Generate proposal using background job
      job = GenerateMatchProposalsJob.perform_later(@league.id, generation_options)
      
      redirect_to organization_league_match_proposals_path(@league),
                  notice: 'マッチング提案の生成を開始しました。完了後に通知されます。'
    end

    def edit
      # Allow manual editing of proposal details
      @available_venues = fetch_available_venues
    end

    def update
      if @match_proposal.update(match_proposal_params)
        # Recalculate scores after manual changes
        recalculate_scores
        
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    notice: 'マッチング提案を更新しました。'
      else
        @available_venues = fetch_available_venues
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @match_proposal.destroy
      redirect_to organization_league_match_proposals_path(@league),
                  notice: 'マッチング提案を削除しました。'
    end

    # Custom actions
    def approve
      if @match_proposal.can_approve?
        @match_proposal.update!(status: :approved, approved_at: Time.current, approved_by: current_user)
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    notice: 'マッチング提案を承認しました。'
      else
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    alert: 'この提案は承認できません。'
      end
    end

    def reject
      if @match_proposal.can_reject?
        @match_proposal.update!(
          status: :rejected,
          rejected_at: Time.current,
          rejected_by: current_user,
          rejection_reasons: params[:rejection_reasons] || ['手動で却下されました']
        )
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    notice: 'マッチング提案を却下しました。'
      else
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    alert: 'この提案は却下できません。'
      end
    end

    def apply
      if @match_proposal.approved?
        if @match_proposal.apply_to_schedule!
          redirect_to organization_league_matches_path(@league),
                      notice: 'スケジュールを適用しました。'
        else
          redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                      alert: @match_proposal.errors.full_messages.join(', ')
        end
      else
        redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                    alert: '承認された提案のみ適用できます。'
      end
    end

    def optimize
      OptimizeScheduleJob.perform_later(@match_proposal.id, params[:optimization_type] || :comprehensive)
      
      redirect_to organization_league_match_proposal_path(@league, @match_proposal),
                  notice: 'スケジュール最適化を開始しました。'
    end

    def compare
      @proposals = @league.match_proposals.where(id: params[:proposal_ids])
      
      if @proposals.size < 2
        redirect_to organization_league_match_proposals_path(@league),
                    alert: '比較するには2つ以上の提案を選択してください。'
        return
      end

      @comparison_data = build_comparison_data(@proposals)
    end

    private

    def set_league
      @league = current_organization.leagues.find(params[:league_id])
    end

    def set_match_proposal
      @match_proposal = @league.match_proposals.find(params[:id])
    end

    def authorize_match_proposal
      authorize(@match_proposal || MatchProposal)
    end

    def match_proposal_params
      params.require(:match_proposal).permit(
        :name,
        :description,
        match_proposal_details_attributes: [
          :id,
          :proposed_datetime,
          :proposed_venue,
          :_destroy
        ]
      )
    end

    def generation_options
      params.permit(
        :start_date,
        :end_date,
        :double_round_robin,
        :exclude_blackout_dates,
        :preferred_days
      ).to_h.symbolize_keys
    end

    def fetch_available_venues
      venues = @league.teams.pluck(:home_venue).compact.uniq
      venues += ['中央球場', '市民球場', '河川敷グラウンド'] # Default venues
      venues.uniq
    end

    def recalculate_scores
      calculator = Ai::FairnessCalculator.new(@match_proposal)
      
      @match_proposal.update!(
        strength_balance_score: calculator.calculate_strength_balance,
        travel_efficiency_score: calculator.calculate_travel_efficiency,
        schedule_preference_score: calculator.calculate_schedule_preference,
        home_away_balance_score: calculator.calculate_home_away_balance,
        overall_fairness_score: calculator.calculate_overall_fairness
      )
    end

    def build_comparison_data(proposals)
      {
        scores: proposals.map do |p|
          {
            id: p.id,
            name: p.name || "提案 ##{p.id}",
            overall: p.overall_fairness_score,
            strength_balance: p.strength_balance_score,
            travel_efficiency: p.travel_efficiency_score,
            schedule_preference: p.schedule_preference_score,
            home_away_balance: p.home_away_balance_score
          }
        end,
        statistics: proposals.map do |p|
          {
            id: p.id,
            total_matches: p.match_proposal_details.count,
            avg_travel_distance: p.match_proposal_details.average(:travel_distance_km),
            conflicts: p.conflict_analysis.size
          }
        end
      }
    end
  end
end