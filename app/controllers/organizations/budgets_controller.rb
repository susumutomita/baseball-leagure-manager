# frozen_string_literal: true

module Organizations
  class BudgetsController < BaseController
    before_action :set_budget, only: [:show, :edit, :update, :destroy, :optimize]

    def index
      @budgets = current_organization.budgets
        .includes(:team, :expenses, :revenues)
        .order(period_start: :desc)
      
      @budgets = @budgets.where(budget_type: params[:type]) if params[:type].present?
      @budgets = @budgets.where(status: params[:status]) if params[:status].present?
      
      @summary = calculate_budget_summary
    end

    def show
      @expenses = @budget.expenses.includes(:team, :approved_by).order(expense_date: :desc)
      @revenues = @budget.revenues.includes(:team).order(revenue_date: :desc)
      @performance = analyze_budget_performance
    end

    def new
      @budget = current_organization.budgets.build(
        period_start: Date.current.beginning_of_month,
        period_end: Date.current.end_of_month
      )
    end

    def create
      @budget = current_organization.budgets.build(budget_params)
      
      if @budget.save
        generate_budget_recommendations
        redirect_to organization_budget_path(@budget), 
                    notice: '予算が正常に作成されました。'
      else
        render :new
      end
    end

    def edit
    end

    def update
      if @budget.update(budget_params)
        redirect_to organization_budget_path(@budget), 
                    notice: '予算が正常に更新されました。'
      else
        render :edit
      end
    end

    def destroy
      if @budget.expenses.any? || @budget.revenues.any?
        redirect_to organization_budgets_path, 
                    alert: '関連する収支記録があるため削除できません。'
      else
        @budget.destroy
        redirect_to organization_budgets_path, 
                    notice: '予算が正常に削除されました。'
      end
    end

    def optimize
      optimizer = Ai::BudgetOptimizer.new(organization: current_organization)
      @optimization = optimizer.optimize_budget_allocation(
        budget_period_start: @budget.period_start,
        budget_period_end: @budget.period_end
      )
      
      respond_to do |format|
        format.html
        format.json { render json: @optimization }
      end
    end

    def forecast
      forecaster = Ai::BudgetOptimizer.new(organization: current_organization)
      
      @forecast = current_organization.budget_forecasts.create!(
        forecast_date: Date.current,
        forecast_period_start: params[:start_date] || 1.month.from_now.beginning_of_month,
        forecast_period_end: params[:end_date] || 3.months.from_now.end_of_month,
        predicted_revenue: 0, # Will be updated by AI
        predicted_expense: 0, # Will be updated by AI
        forecast_method: 'ai_prediction'
      )
      
      # Generate AI predictions
      enhance_forecast_with_ai(@forecast)
      
      redirect_to organization_budget_forecast_path(@forecast)
    end

    private

    def set_budget
      @budget = current_organization.budgets.find(params[:id])
    end

    def budget_params
      params.require(:budget).permit(
        :name, :budget_type, :amount, :period_start, :period_end,
        :status, :team_id, :category, :description
      )
    end

    def calculate_budget_summary
      active_budgets = @budgets.active
      
      {
        total_allocated: active_budgets.sum(:amount),
        total_spent: active_budgets.sum { |b| b.spent_amount },
        total_remaining: active_budgets.sum { |b| b.remaining_amount },
        average_utilization: active_budgets.any? ? 
          active_budgets.average { |b| b.utilization_rate }.round(2) : 0,
        budgets_at_risk: active_budgets.select { |b| b.utilization_rate > 90 }.count
      }
    end

    def analyze_budget_performance
      {
        utilization_rate: @budget.utilization_rate,
        days_remaining: @budget.days_remaining,
        daily_burn_rate: calculate_daily_burn_rate,
        projected_overrun: project_overrun,
        top_expenses: @budget.expenses.order(amount: :desc).limit(5),
        expense_breakdown: @budget.expenses.group(:category).sum(:amount)
      }
    end

    def calculate_daily_burn_rate
      return 0 if @budget.spent_amount.zero?
      
      days_elapsed = [(Date.current - @budget.period_start).to_i, 1].max
      @budget.spent_amount / days_elapsed
    end

    def project_overrun
      return 0 if @budget.days_remaining <= 0
      
      daily_burn = calculate_daily_burn_rate
      projected_total = @budget.spent_amount + (daily_burn * @budget.days_remaining)
      
      [projected_total - @budget.amount, 0].max
    end

    def generate_budget_recommendations
      return unless @budget.persisted?
      
      BudgetOptimizationJob.perform_later(@budget)
    end

    def enhance_forecast_with_ai(forecast)
      ForecastGenerationJob.perform_later(forecast)
    end
  end
end