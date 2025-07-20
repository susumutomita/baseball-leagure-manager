module KeycloakAuthenticatable
  extend ActiveSupport::Concern
  
  included do
    before_action :authenticate_user!
    helper_method :current_user, :user_signed_in?
  end
  
  private
  
  def authenticate_user!
    unless current_user
      store_location
      redirect_to login_path, alert: 'ログインが必要です'
    end
  end
  
  def current_user
    @current_user ||= load_user_from_session
  end
  
  def user_signed_in?
    current_user.present?
  end
  
  def load_user_from_session
    return nil unless session[:user_id] && session[:keycloak_token]
    
    # Verify token is still valid
    if token_expired?
      reset_session
      return nil
    end
    
    User.find_by(id: session[:user_id])
  rescue ActiveRecord::RecordNotFound
    reset_session
    nil
  end
  
  def token_expired?
    return true unless session[:token_expires_at]
    Time.current > Time.at(session[:token_expires_at])
  end
  
  def store_location
    session[:return_to] = request.fullpath if request.get?
  end
  
  def stored_location_or(default)
    session.delete(:return_to) || default
  end
  
  # Keycloak authentication helpers
  def keycloak_login_url(organization_slug = nil)
    params = {
      client_id: Keycloak.configuration.client_id,
      redirect_uri: Keycloak.configuration.redirect_uri,
      response_type: 'code',
      scope: 'openid profile email',
      state: generate_state_token(organization_slug)
    }
    
    "#{Keycloak.configuration.auth_url}?#{params.to_query}"
  end
  
  def keycloak_logout_url
    params = {
      client_id: Keycloak.configuration.client_id,
      post_logout_redirect_uri: root_url
    }
    
    "#{Keycloak.configuration.logout_url}?#{params.to_query}"
  end
  
  def generate_state_token(organization_slug = nil)
    state_data = {
      csrf_token: form_authenticity_token,
      organization_slug: organization_slug,
      timestamp: Time.current.to_i
    }
    
    Base64.urlsafe_encode64(state_data.to_json)
  end
  
  def verify_state_token(state)
    return false unless state.present?
    
    begin
      state_data = JSON.parse(Base64.urlsafe_decode64(state))
      
      # Verify CSRF token
      return false unless state_data['csrf_token'] == form_authenticity_token
      
      # Verify timestamp (within 10 minutes)
      timestamp = state_data['timestamp'].to_i
      return false if (Time.current.to_i - timestamp) > 600
      
      state_data
    rescue JSON::ParserError, ArgumentError
      false
    end
  end
  
  # Admin check helpers
  def require_admin!
    unless current_user&.admin?
      redirect_to root_path, alert: '管理者権限が必要です'
    end
  end
  
  def require_organization_admin!
    unless current_user&.can_manage_organization?
      redirect_to root_path, alert: '組織管理者権限が必要です'
    end
  end
end