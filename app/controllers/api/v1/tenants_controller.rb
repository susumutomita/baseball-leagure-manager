module Api
  module V1
    class TenantsController < ApplicationController
      before_action :authenticate_user!
      before_action :require_admin
      before_action :set_tenant, only: [:show, :update, :destroy]
      
      def index
        @tenants = Tenant.all
        render json: @tenants
      end
      
      def show
        render json: @tenant
      end
      
      def create
        @tenant = Tenant.new(tenant_params)
        
        if @tenant.save
          render json: @tenant, status: :created
        else
          render json: { errors: @tenant.errors }, status: :unprocessable_entity
        end
      end
      
      def update
        if @tenant.update(tenant_params)
          render json: @tenant
        else
          render json: { errors: @tenant.errors }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @tenant.destroy
        head :no_content
      end
      
      private
      
      def set_tenant
        @tenant = Tenant.find(params[:id])
      end
      
      def tenant_params
        params.require(:tenant).permit(:name, :subdomain)
      end
      
      def require_admin
        unless current_user.system_admin?
          render json: { error: "You are not authorized to perform this action" }, status: :forbidden
        end
      end
    end
  end
end
