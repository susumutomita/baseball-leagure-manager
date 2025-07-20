# frozen_string_literal: true

module Organizations
  class BillingController < ApplicationController
    before_action :authenticate_user!
    before_action :authorize_billing_access!
    before_action :set_organization

    def show
      @subscription = @organization.organization_subscription
      @current_plan = @subscription&.subscription_plan || SubscriptionPlan.basic
      @payment_methods = @organization.payment_methods.active
      @recent_invoices = @organization.invoices.recent.limit(5)
      @usage_summary = usage_tracker.get_current_usage_summary
      @next_invoice_preview = invoice_generator.preview_next_invoice if @subscription&.active?
    end

    def usage
      @usage_summary = usage_tracker.get_current_usage_summary
      @usage_trends = usage_tracker.get_usage_trends(days: 30)
      @monthly_report = usage_tracker.generate_usage_report(period: :monthly)
      
      respond_to do |format|
        format.html
        format.json { render json: @monthly_report }
      end
    end

    def portal
      # Redirect to Stripe Customer Portal
      portal_session = subscription_manager.create_portal_session(
        return_url: organization_billing_url(@organization)
      )

      redirect_to portal_session.url, allow_other_host: true
    end

    private

    def set_organization
      @organization = current_user.organization
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
  end
end