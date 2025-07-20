# frozen_string_literal: true

module Organizations
  class AiMatchingConfigsController < ApplicationController
    before_action :authenticate_user!
    before_action :set_league
    before_action :set_ai_matching_config, only: [:show, :edit, :update, :destroy]
    before_action :authorize_ai_matching_config

    def show
      @recent_proposals = @ai_matching_config.match_proposals
                                            .includes(:league, :match_proposal_details)
                                            .recent
                                            .limit(5)
    end

    def new
      @ai_matching_config = @league.build_ai_matching_config
      set_default_values
    end

    def edit
    end

    def create
      @ai_matching_config = @league.build_ai_matching_config(ai_matching_config_params)
      
      if @ai_matching_config.save
        redirect_to organization_league_ai_matching_config_path(@league), 
                    notice: 'AIマッチング設定を作成しました。'
      else
        render :new, status: :unprocessable_entity
      end
    end

    def update
      if @ai_matching_config.update(ai_matching_config_params)
        redirect_to organization_league_ai_matching_config_path(@league),
                    notice: 'AIマッチング設定を更新しました。'
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @ai_matching_config.destroy
      redirect_to organization_league_path(@league),
                  notice: 'AIマッチング設定を削除しました。'
    end

    # Custom actions
    def test_configuration
      # Run a test proposal generation
      engine = Ai::MatchingEngine.new(@league)
      test_proposal = engine.generate_proposal
      
      if test_proposal.persisted?
        # Don't save the test proposal
        test_proposal.destroy
        
        render json: {
          success: true,
          message: 'テスト生成が成功しました',
          stats: {
            total_matches: test_proposal.match_proposal_details.count,
            fairness_score: test_proposal.overall_fairness_score,
            travel_efficiency: test_proposal.travel_efficiency_score
          }
        }
      else
        render json: {
          success: false,
          message: 'テスト生成に失敗しました',
          errors: test_proposal.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    private

    def set_league
      @league = current_organization.leagues.find(params[:league_id])
    end

    def set_ai_matching_config
      @ai_matching_config = @league.ai_matching_config || raise(ActiveRecord::RecordNotFound)
    end

    def authorize_ai_matching_config
      authorize(@ai_matching_config || AiMatchingConfig)
    end

    def set_default_values
      # Set sensible defaults for new config
      @ai_matching_config.algorithm_type ||= :balanced
      @ai_matching_config.ai_provider ||= :local
      @ai_matching_config.weight_strength_balance ||= 0.25
      @ai_matching_config.weight_travel_distance ||= 0.25
      @ai_matching_config.weight_schedule_preference ||= 0.25
      @ai_matching_config.weight_home_away_balance ||= 0.25
    end

    def ai_matching_config_params
      params.require(:ai_matching_config).permit(
        :algorithm_type,
        :ai_provider,
        :api_key,
        :weight_strength_balance,
        :weight_travel_distance,
        :weight_schedule_preference,
        :weight_home_away_balance,
        :max_consecutive_home_games,
        :max_consecutive_away_games,
        :min_days_between_matches,
        :max_travel_distance_km,
        :use_ai_analysis,
        :max_games_per_week,
        custom_rules: {}
      )
    end
  end
end