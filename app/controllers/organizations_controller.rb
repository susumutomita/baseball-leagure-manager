class OrganizationsController < ApplicationController
  # 組織選択画面では組織が設定されていなくてもアクセス可能
  skip_before_action :set_current_tenant, only: [:index, :new, :create]
  before_action :require_admin!, only: [:new, :create, :edit, :update, :destroy]
  before_action :set_organization, only: [:show, :edit, :update, :destroy]
  
  def index
    @organizations = if current_user.admin?
                      Organization.all
                    else
                      Organization.where(id: current_user.organization_id)
                    end
  end
  
  def show
    redirect_to root_path
  end
  
  def new
    @organization = Organization.new
  end
  
  def create
    @organization = Organization.new(organization_params)
    
    if @organization.save
      # 作成者を組織の管理者として登録
      current_user.update!(
        organization: @organization,
        role: 'admin'
      )
      
      # 新しい組織をテナントとして設定
      set_current_tenant(@organization)
      
      redirect_to root_path, notice: '組織を作成しました'
    else
      render :new
    end
  end
  
  def edit
  end
  
  def update
    if @organization.update(organization_params)
      redirect_to edit_organization_path(@organization), notice: '組織情報を更新しました'
    else
      render :edit
    end
  end
  
  def destroy
    @organization.deactivate!
    redirect_to organizations_path, notice: '組織を無効化しました'
  end
  
  private
  
  def set_organization
    @organization = Organization.find(params[:id])
    
    # 管理者以外は自分の組織のみアクセス可能
    unless current_user.admin? || current_user.organization_id == @organization.id
      redirect_to root_path, alert: 'アクセス権限がありません'
    end
  end
  
  def organization_params
    params.require(:organization).permit(
      :name, :slug, :domain, :logo_url, :time_zone,
      :max_teams_limit, :max_players_limit,
      settings: {}
    )
  end
end