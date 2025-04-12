module Api
  module V1
    class SubscriptionsController < ApplicationController
      before_action :authenticate_user!
      before_action :require_tenant_admin
      before_action :set_subscription, only: [:show, :cancel, :renew]
      
      def index
        @subscriptions = current_tenant.subscriptions
        render json: @subscriptions
      end
      
      def show
        render json: @subscription
      end
      
      def create
        @subscription = Subscription.new(subscription_params)
        @subscription.tenant = current_tenant
        
        if @subscription.save
          render json: @subscription, status: :created
        else
          render json: { errors: @subscription.errors }, status: :unprocessable_entity
        end
      end
      
      def cancel
        if @subscription.cancel!
          render json: @subscription
        else
          render json: { errors: @subscription.errors }, status: :unprocessable_entity
        end
      end
      
      def renew
        months = params[:months].to_i
        months = 1 if months < 1
        
        new_subscription = @subscription.renew!(months)
        
        if new_subscription.persisted?
          render json: new_subscription, status: :created
        else
          render json: { errors: new_subscription.errors }, status: :unprocessable_entity
        end
      end
      
      private
      
      def set_subscription
        @subscription = current_tenant.subscriptions.find(params[:id])
      end
      
      def subscription_params
        params.require(:subscription).permit(:subscription_plan_id, :start_date, :end_date)
      end
      
      def require_tenant_admin
        unless current_user.admin?
          render json: { error: "You are not authorized to perform this action" }, status: :forbidden
        end
      end
      
      def current_tenant
        @current_tenant ||= Tenant.find_by(subdomain: request.subdomain)
      end
    end
  end
end
