# frozen_string_literal: true

module Organizations
  class SubscriptionsController < ApplicationController
    before_action :authenticate_user!
    before_action :authorize_billing_access!
    before_action :set_organization
    before_action :set_subscription, only: [:show, :cancel, :reactivate]

    def index
      @plans = SubscriptionPlan.active.ordered
      @current_subscription = @organization.organization_subscription
      @current_plan = @current_subscription&.subscription_plan
    end

    def show
      @usage_summary = usage_tracker.get_current_usage_summary
      @next_invoice = invoice_generator.preview_next_invoice if @subscription&.active?
    end

    def new
      @plan = SubscriptionPlan.find(params[:plan_id])
      @current_plan = @organization.subscription_plan

      # Check if downgrade is allowed
      if @current_plan && @plan.price_cents < @current_plan.price_cents
        check_downgrade_eligibility(@plan)
      end
    end

    def create
      @plan = SubscriptionPlan.find(params[:plan_id])

      # Create checkout session
      checkout_session = subscription_manager.create_checkout_session(
        plan: @plan,
        success_url: organization_subscription_url(@organization, @plan, success: true),
        cancel_url: organization_subscriptions_url(@organization)
      )

      redirect_to checkout_session.url, allow_other_host: true
    rescue StandardError => e
      redirect_to organization_subscriptions_path(@organization), 
                  alert: "サブスクリプションの作成に失敗しました: #{e.message}"
    end

    def update
      @new_plan = SubscriptionPlan.find(params[:plan_id])
      
      begin
        subscription_manager.change_plan(@new_plan, prorate: params[:prorate] != 'false')
        redirect_to organization_billing_path(@organization), 
                    notice: "プランを#{@new_plan.name}に変更しました"
      rescue StandardError => e
        redirect_to organization_subscriptions_path(@organization), 
                    alert: "プラン変更に失敗しました: #{e.message}"
      end
    end

    def cancel
      reason = params[:cancellation_reason]
      at_period_end = params[:immediate] != 'true'

      begin
        subscription_manager.cancel_subscription(at_period_end: at_period_end, reason: reason)
        
        message = if at_period_end
                    "サブスクリプションは現在の請求期間の終了時にキャンセルされます"
                  else
                    "サブスクリプションをキャンセルしました"
                  end
        
        redirect_to organization_billing_path(@organization), notice: message
      rescue StandardError => e
        redirect_to organization_subscription_path(@organization, @subscription), 
                    alert: "キャンセルに失敗しました: #{e.message}"
      end
    end

    def reactivate
      begin
        subscription_manager.reactivate_subscription
        redirect_to organization_billing_path(@organization), 
                    notice: "サブスクリプションを再開しました"
      rescue StandardError => e
        redirect_to organization_subscription_path(@organization, @subscription), 
                    alert: "再開に失敗しました: #{e.message}"
      end
    end

    def success
      # Handle successful subscription
      if params[:success] == 'true'
        flash[:notice] = "サブスクリプションの登録が完了しました"
      end
      
      redirect_to organization_billing_path(@organization)
    end

    private

    def set_organization
      @organization = current_user.organization
    end

    def set_subscription
      @subscription = @organization.organization_subscription
      redirect_to organization_subscriptions_path(@organization), 
                  alert: "サブスクリプションが見つかりません" unless @subscription
    end

    def authorize_billing_access!
      authorize @organization, :manage_billing?
    end

    def subscription_manager
      @subscription_manager ||= Billing::SubscriptionManager.new(@organization)
    end

    def usage_tracker
      @usage_tracker ||= Billing::UsageTracker.new(@organization)
    end

    def invoice_generator
      @invoice_generator ||= Billing::InvoiceGenerator.new(@organization)
    end

    def check_downgrade_eligibility(new_plan)
      current_usage = usage_tracker.get_current_usage_summary
      
      # Check each resource limit
      %w[teams matches_per_month players_per_team].each do |resource|
        current = current_usage.dig(resource.to_sym, :used) || 0
        new_limit = new_plan.limit_for(resource)
        
        if new_limit != -1 && current > new_limit
          redirect_to organization_subscriptions_path(@organization),
                      alert: "ダウングレードできません: 現在の#{resource}使用量(#{current})が新しいプランの上限(#{new_limit})を超えています"
          return
        end
      end
    end
  end
end