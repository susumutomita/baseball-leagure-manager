class HomeController < ApplicationController
  # ホーム画面は認証不要（公開ページとして）
  skip_before_action :authenticate_user!, only: [:index]
  
  def index
    # 組織が設定されていない場合は組織選択画面へ
    unless current_organization
      if user_signed_in?
        redirect_to organizations_path
      else
        redirect_to login_path
      end
      return
    end
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
