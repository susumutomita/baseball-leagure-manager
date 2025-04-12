module Api
  module V1
    class GamesController < ApplicationController
      before_action :authenticate_user!
      before_action :set_game, only: [:show, :update, :destroy, :complete]
      before_action :authorize_game, only: [:update, :destroy, :complete]
      
      def index
        @games = policy_scope(Game)
        render json: @games
      end
      
      def show
        render json: @game
      end
      
      def create
        @game = Game.new(game_params)
        
        authorize @game
        
        if @game.save
          render json: @game, status: :created
        else
          render json: { errors: @game.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @game.update(game_params)
          render json: @game
        else
          render json: { errors: @game.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @game.destroy
        head :no_content
      end
      
      def complete
        if @game.complete!(params[:home_score], params[:away_score])
          render json: @game
        else
          render json: { errors: @game.errors }, status: :unprocessable_entity
        end
      end
      
      private
      
      def set_game
        @game = Game.find(params[:id])
      end
      
      def authorize_game
        authorize @game
      end
      
      def game_params
        params.require(:game).permit(
          :league_id, :season_id, :venue_id, :home_team_id, :away_team_id,
          :scheduled_at, :status, :home_score, :away_score, :umpire_id
        )
      end
    end
  end
end
