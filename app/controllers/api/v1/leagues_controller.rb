module Api
  module V1
    class LeaguesController < ApplicationController
      before_action :authenticate_user!
      before_action :set_league, only: [:show, :update, :destroy, :schedule, :matchups, :financial_report, :budget_suggestions]
      before_action :authorize_league, only: [:update, :destroy, :schedule, :matchups, :financial_report, :budget_suggestions]
      
      def index
        @leagues = policy_scope(League)
        render json: @leagues
      end
      
      def show
        render json: @league
      end
      
      def create
        @league = League.new(league_params)
        @league.admin = current_user
        
        authorize @league
        
        if @league.save
          render json: @league, status: :created
        else
          render json: { errors: @league.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @league.update(league_params)
          render json: @league
        else
          render json: { errors: @league.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @league.destroy
        head :no_content
      end
      
      def schedule
        season = @league.seasons.find(params[:season_id])
        
        service = AiSchedulerService.new(@league, season)
        service.generate_schedule
        
        render json: { message: "Schedule generated successfully" }
      end
      
      def matchups
        service = AiMatchmakingService.new(@league)
        matchups = service.generate_matchups(params[:count] || 1)
        
        render json: { matchups: matchups }
      end
      
      def financial_report
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : Date.current.beginning_of_month
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.current
        
        service = AiAccountingService.new(@league)
        report = service.generate_financial_report(start_date, end_date)
        
        render json: report
      end
      
      def budget_suggestions
        service = AiAccountingService.new(@league)
        suggestions = service.suggest_budget_adjustments
        
        render json: suggestions
      end
      
      private
      
      def set_league
        @league = League.find(params[:id])
      end
      
      def authorize_league
        authorize @league
      end
      
      def league_params
        params.require(:league).permit(:name, :description, :registration_fee)
      end
    end
  end
end
