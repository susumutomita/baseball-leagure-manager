class ApplicationController < ActionController::Base
  include KeycloakAuthenticatable

  # acts_as_tenant設定
  set_current_tenant_through_filter
  before_action :set_current_tenant

  # CSRF保護
  protect_from_forgery with: :exception

  # エラーハンドリング
  rescue_from ActsAsTenant::Errors::NoTenantSet do
    redirect_to root_path, alert: '組織が選択されていません'
  end

  rescue_from ActiveRecord::RecordNotFound do
    redirect_to root_path, alert: 'レコードが見つかりません'
  end

  private

  def set_current_tenant
    if current_user
      # ユーザーの所属組織をテナントとして設定
      set_current_tenant(current_user.organization)
    elsif params[:organization_slug].present?
      # URLのslugから組織を特定（公開ページ用）
      organization = Organization.active.find_by!(slug: params[:organization_slug])
      set_current_tenant(organization)
    elsif request.subdomain.present? && request.subdomain != 'www'
      # サブドメインから組織を特定
      organization = Organization.active.find_by!(slug: request.subdomain)
      set_current_tenant(organization)
    end
  end

  # 現在の組織を取得
  def current_organization
    current_tenant
  end

  helper_method :current_organization

  # 組織が必須のアクション用
  def require_organization!
    return if current_organization

    redirect_to organizations_path, alert: '組織を選択してください'
  end

  # ログ出力用のリクエスト情報
  def append_info_to_payload(payload)
    super
    payload[:organization_id] = current_organization&.id
    payload[:user_id] = current_user&.id
  end
end
