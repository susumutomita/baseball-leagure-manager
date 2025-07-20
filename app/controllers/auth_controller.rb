class AuthController < ApplicationController
  skip_before_action :authenticate_user!, only: [:login, :callback, :logout]
  skip_before_action :set_current_tenant, only: [:login, :callback, :logout]
  
  def login
    # 組織のslugがパラメータにある場合は保存
    organization_slug = params[:organization]
    redirect_to keycloak_login_url(organization_slug), allow_other_host: true
  end
  
  def callback
    # Keycloakからの認証コールバック処理
    if params[:code].present? && params[:state].present?
      # state tokenを検証
      state_data = verify_state_token(params[:state])
      
      unless state_data
        redirect_to root_path, alert: '不正なリクエストです'
        return
      end
      
      # Keycloakからアクセストークンを取得
      token_response = exchange_code_for_token(params[:code])
      
      if token_response
        # ユーザー情報を取得
        user_info = fetch_user_info(token_response['access_token'])
        
        if user_info
          # 組織を特定
          organization = find_or_select_organization(state_data['organization_slug'], user_info)
          
          if organization
            # ユーザーを作成または更新
            user = User.find_or_create_from_keycloak!(user_info, organization)
            
            # セッションに保存
            session[:user_id] = user.id
            session[:keycloak_token] = token_response['access_token']
            session[:refresh_token] = token_response['refresh_token']
            session[:token_expires_at] = Time.current.to_i + token_response['expires_in'].to_i
            
            redirect_to stored_location_or(root_path), notice: 'ログインしました'
          else
            redirect_to organizations_path, alert: '組織を選択してください'
          end
        else
          redirect_to root_path, alert: 'ユーザー情報の取得に失敗しました'
        end
      else
        redirect_to root_path, alert: '認証に失敗しました'
      end
    else
      redirect_to root_path, alert: '認証エラーが発生しました'
    end
  end
  
  def logout
    # Keycloakのセッションも終了
    if session[:keycloak_token]
      revoke_token(session[:keycloak_token])
    end
    
    reset_session
    redirect_to keycloak_logout_url, allow_other_host: true
  end
  
  private
  
  def exchange_code_for_token(code)
    response = HTTParty.post(
      Keycloak.configuration.token_url,
      body: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: Keycloak.configuration.redirect_uri,
        client_id: Keycloak.configuration.client_id,
        client_secret: Keycloak.configuration.client_secret
      }
    )
    
    response.success? ? response.parsed_response : nil
  rescue StandardError => e
    Rails.logger.error "Token exchange failed: #{e.message}"
    nil
  end
  
  def fetch_user_info(access_token)
    response = HTTParty.get(
      Keycloak.configuration.userinfo_url,
      headers: {
        'Authorization' => "Bearer #{access_token}"
      }
    )
    
    if response.success?
      {
        id: response.parsed_response['sub'],
        email: response.parsed_response['email'],
        name: response.parsed_response['name'],
        given_name: response.parsed_response['given_name'],
        family_name: response.parsed_response['family_name']
      }
    else
      nil
    end
  rescue StandardError => e
    Rails.logger.error "User info fetch failed: #{e.message}"
    nil
  end
  
  def revoke_token(token)
    HTTParty.post(
      "#{Keycloak.configuration.server_url}/realms/#{Keycloak.configuration.realm}/protocol/openid-connect/revoke",
      body: {
        token: token,
        client_id: Keycloak.configuration.client_id,
        client_secret: Keycloak.configuration.client_secret
      }
    )
  rescue StandardError => e
    Rails.logger.error "Token revocation failed: #{e.message}"
  end
  
  def find_or_select_organization(organization_slug, user_info)
    # 1. URLで指定された組織を優先
    if organization_slug.present?
      return Organization.active.find_by(slug: organization_slug)
    end
    
    # 2. メールドメインから組織を特定
    email_domain = user_info[:email].split('@').last
    organization = Organization.active.find_by(domain: email_domain)
    return organization if organization
    
    # 3. 既存のユーザーの場合は所属組織を使用
    existing_user = User.find_by(keycloak_id: user_info[:id])
    return existing_user.organization if existing_user
    
    # 4. 組織が1つしかない場合はそれを使用
    if Organization.active.count == 1
      return Organization.active.first
    end
    
    # 5. 組織が特定できない場合はnil
    nil
  end
end