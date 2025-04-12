class ApplicationController < ActionController::Base
  include Pundit::Authorization
  
  before_action :set_current_tenant
  before_action :configure_permitted_parameters, if: :devise_controller?
  
  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  
  protected
  
  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name, :phone])
    devise_parameter_sanitizer.permit(:account_update, keys: [:name, :phone])
  end
  
  def set_current_tenant
    current_tenant = Tenant.find_by(subdomain: request.subdomain)
    ActsAsTenant.current_tenant = current_tenant
  end
  
  private
  
  def user_not_authorized
    flash[:alert] = "You are not authorized to perform this action."
    redirect_to(request.referrer || root_path)
  end
  
  def not_found
    flash[:alert] = "The resource you were looking for doesn't exist."
    redirect_to(request.referrer || root_path)
  end
end
