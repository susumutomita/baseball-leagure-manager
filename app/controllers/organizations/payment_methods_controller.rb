# frozen_string_literal: true

module Organizations
  class PaymentMethodsController < ApplicationController
    before_action :authenticate_user!
    before_action :authorize_billing_access!
    before_action :set_organization
    before_action :set_payment_method, only: [:show, :update, :destroy]

    def index
      @payment_methods = @organization.payment_methods.active
      @default_payment_method = @organization.default_payment_method
    end

    def new
      # Generate setup intent for adding new payment method
      setup_intent = payment_processor.setup_payment_intent
      
      @client_secret = setup_intent.client_secret
    end

    def create
      payment_method_id = params[:payment_method_id]
      
      begin
        payment_method = subscription_manager.add_payment_method(
          payment_method_id,
          set_as_default: params[:set_as_default] == 'true'
        )
        
        # Validate the payment method
        if payment_processor.validate_payment_method(payment_method)
          redirect_to organization_payment_methods_path(@organization), 
                      notice: "支払い方法を追加しました"
        else
          payment_method.destroy
          redirect_to new_organization_payment_method_path(@organization), 
                      alert: "支払い方法の検証に失敗しました。別のカードをお試しください。"
        end
      rescue StandardError => e
        redirect_to new_organization_payment_method_path(@organization), 
                    alert: "支払い方法の追加に失敗しました: #{e.message}"
      end
    end

    def update
      # Set as default payment method
      begin
        @payment_method.make_default!
        redirect_to organization_payment_methods_path(@organization), 
                    notice: "デフォルトの支払い方法を更新しました"
      rescue StandardError => e
        redirect_to organization_payment_methods_path(@organization), 
                    alert: "更新に失敗しました: #{e.message}"
      end
    end

    def destroy
      begin
        if @payment_method.is_default? && @organization.subscribed?
          redirect_to organization_payment_methods_path(@organization), 
                      alert: "有効なサブスクリプションがある場合、デフォルトの支払い方法は削除できません"
          return
        end

        subscription_manager.remove_payment_method(@payment_method)
        redirect_to organization_payment_methods_path(@organization), 
                    notice: "支払い方法を削除しました"
      rescue StandardError => e
        redirect_to organization_payment_methods_path(@organization), 
                    alert: "削除に失敗しました: #{e.message}"
      end
    end

    private

    def set_organization
      @organization = current_user.organization
    end

    def set_payment_method
      @payment_method = @organization.payment_methods.find(params[:id])
    end

    def authorize_billing_access!
      authorize @organization, :manage_billing?
    end

    def subscription_manager
      @subscription_manager ||= Billing::SubscriptionManager.new(@organization)
    end

    def payment_processor
      @payment_processor ||= Billing::PaymentProcessor.new(@organization)
    end
  end
end