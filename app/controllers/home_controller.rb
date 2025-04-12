class HomeController < ApplicationController
  def index
    @active_leagues = League.where(status: :in_progress)
    @upcoming_leagues = League.where(status: :registration_open)
    @upcoming_matches = Match.upcoming.limit(5)
    @recent_matches = Match.past.limit(5)

    if params[:team_id].present?
      @team = Team.find(params[:team_id])
      @team_matches = @team.matches.upcoming
    end

    # Statistics for admin view
    if current_user&.admin?
      @total_teams = Team.count
      @total_players = Player.count
      @total_matches = Match.count
      @pending_transactions = Transaction.pending_payment
    end
  end
end
