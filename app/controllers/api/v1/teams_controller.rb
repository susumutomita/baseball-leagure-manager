module Api
  module V1
    class TeamsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_team, only: [:show, :update, :destroy, :join, :leave]
      before_action :authorize_team, only: [:update, :destroy]
      
      def index
        @teams = policy_scope(Team)
        render json: @teams
      end
      
      def show
        render json: @team
      end
      
      def create
        @team = Team.new(team_params)
        @team.manager = current_user
        
        authorize @team
        
        if @team.save
          TeamMembership.create(user: current_user, team: @team, role: :manager)
          
          render json: @team, status: :created
        else
          render json: { errors: @team.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @team.update(team_params)
          render json: @team
        else
          render json: { errors: @team.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @team.destroy
        head :no_content
      end
      
      def join
        membership = TeamMembership.new(
          user: current_user,
          team: @team,
          role: :player
        )
        
        if membership.save
          render json: { message: "Successfully joined the team" }
        else
          render json: { errors: membership.errors }, status: :unprocessable_entity
        end
      end
      
      def leave
        membership = TeamMembership.find_by(user: current_user, team: @team)
        
        if membership&.destroy
          render json: { message: "Successfully left the team" }
        else
          render json: { error: "You are not a member of this team" }, status: :unprocessable_entity
        end
      end
      
      private
      
      def set_team
        @team = Team.find(params[:id])
      end
      
      def authorize_team
        authorize @team
      end
      
      def team_params
        params.require(:team).permit(:name, :description, :location, :logo)
      end
    end
  end
end
