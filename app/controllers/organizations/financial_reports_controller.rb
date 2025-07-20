# frozen_string_literal: true

module Organizations
  class FinancialReportsController < BaseController
    before_action :set_report, only: [:show, :download, :share]

    def index
      @reports = current_organization.financial_reports
        .includes(:team, :generated_by)
        .order(created_at: :desc)
      
      apply_filters
      
      @can_generate = can_generate_new_report?
    end

    def show
      @report_data = @report.report_data || {}
      @insights = @report.insights || {}
      
      # Get AI advisor for additional insights
      @advisor = Ai::FinancialAdvisor.new(organization: current_organization)
      
      respond_to do |format|
        format.html
        format.json { render json: format_report_json }
        format.pdf { redirect_to download_organization_financial_report_path(@report) }
      end
    end

    def new
      @report_types = available_report_types
      @teams = current_organization.teams.active if params[:type] == 'team'
    end

    def create
      generator = Accounting::FinancialReportGenerator.new(organization: current_organization)
      
      begin
        @report = case params[:report_type]
                 when 'monthly'
                   generator.generate_monthly_report(month: Date.parse(params[:month]))
                 when 'quarterly'
                   generate_quarterly_report(generator, params)
                 when 'annual'
                   generator.generate_annual_report(year: params[:year].to_i)
                 when 'custom'
                   generate_custom_report(generator, params)
                 when 'team'
                   generate_team_report(generator, params)
                 else
                   raise ArgumentError, '無効なレポートタイプです'
                 end
        
        redirect_to organization_financial_report_path(@report),
                    notice: 'レポートが正常に生成されました。'
      rescue => e
        redirect_to organization_financial_reports_path,
                    alert: "レポート生成エラー: #{e.message}"
      end
    end

    def download
      # Generate PDF version
      pdf_data = generate_pdf_report(@report)
      
      send_data pdf_data,
                filename: "#{@report.report_type}_report_#{@report.id}.pdf",
                type: 'application/pdf',
                disposition: 'attachment'
    end

    def share
      # Share report with stakeholders
      recipients = params[:recipients] || []
      message = params[:message]
      
      recipients.each do |email|
        OrganizationMailer.share_financial_report(@report, email, message).deliver_later
      end
      
      redirect_to organization_financial_report_path(@report),
                  notice: "レポートを#{recipients.count}人に共有しました。"
    end

    def dashboard
      # Financial dashboard with key metrics
      @current_month = Date.current.beginning_of_month
      @metrics = calculate_dashboard_metrics
      @cash_flow = analyze_cash_flow
      @budget_status = analyze_budget_status
      @recent_transactions = recent_transactions
      
      # Get AI insights
      advisor = Ai::FinancialAdvisor.new(organization: current_organization)
      @ai_advice = advisor.generate_financial_advice
    end

    def analytics
      # Advanced analytics page
      @period = params[:period] || 'last_3_months'
      @comparison_type = params[:comparison] || 'month_over_month'
      
      @analytics = perform_analytics(@period, @comparison_type)
      @trends = analyze_trends(@period)
      @forecasts = generate_forecasts
      
      respond_to do |format|
        format.html
        format.json { render json: @analytics }
      end
    end

    private

    def set_report
      @report = current_organization.financial_reports.find(params[:id])
    end

    def apply_filters
      if params[:type].present?
        @reports = @reports.where(report_type: params[:type])
      end
      
      if params[:status].present?
        @reports = @reports.where(status: params[:status])
      end
      
      if params[:team_id].present?
        @reports = @reports.where(team_id: params[:team_id])
      end
      
      if params[:year].present?
        year = params[:year].to_i
        @reports = @reports.where(
          'EXTRACT(YEAR FROM period_start) = ? OR EXTRACT(YEAR FROM period_end) = ?',
          year, year
        )
      end
      
      @reports = @reports.page(params[:page])
    end

    def available_report_types
      types = ['monthly', 'quarterly', 'annual', 'custom']
      types << 'team' if current_organization.teams.any?
      types
    end

    def can_generate_new_report?
      # Check if a report for current period already exists
      case params[:generate_type] || 'monthly'
      when 'monthly'
        !current_organization.financial_reports
          .where(report_type: 'monthly')
          .where('period_start = ?', Date.current.beginning_of_month)
          .exists?
      when 'quarterly'
        quarter_start = Date.current.beginning_of_quarter
        !current_organization.financial_reports
          .where(report_type: 'quarterly')
          .where('period_start = ?', quarter_start)
          .exists?
      else
        true
      end
    end

    def generate_quarterly_report(generator, params)
      quarter = params[:quarter].to_i
      year = params[:year].to_i
      
      quarter_dates = case quarter
                     when 1 then { start: Date.new(year, 1, 1), end: Date.new(year, 3, 31) }
                     when 2 then { start: Date.new(year, 4, 1), end: Date.new(year, 6, 30) }
                     when 3 then { start: Date.new(year, 7, 1), end: Date.new(year, 9, 30) }
                     when 4 then { start: Date.new(year, 10, 1), end: Date.new(year, 12, 31) }
                     end
      
      generator.generate_quarterly_report(quarter: quarter_dates)
    end

    def generate_custom_report(generator, params)
      options = {
        include_ai_insights: params[:include_insights] == 'true',
        include_forecasts: params[:include_forecasts] == 'true',
        exclude_pending: params[:exclude_pending] == 'true'
      }
      
      generator.generate_custom_report(
        start_date: Date.parse(params[:start_date]),
        end_date: Date.parse(params[:end_date]),
        options: options
      )
    end

    def generate_team_report(generator, params)
      team = current_organization.teams.find(params[:team_id])
      
      generator.generate_team_report(
        team: team,
        period_start: Date.parse(params[:start_date]),
        period_end: Date.parse(params[:end_date])
      )
    end

    def format_report_json
      {
        report: {
          id: @report.id,
          type: @report.report_type,
          period: {
            start: @report.period_start,
            end: @report.period_end
          },
          summary: {
            total_revenue: @report.total_revenue,
            total_expense: @report.total_expense,
            net_income: @report.net_income,
            profit_margin: @report.profit_margin
          },
          data: @report.report_data,
          insights: @report.insights
        }
      }
    end

    def generate_pdf_report(report)
      # This would use a PDF generation library like Prawn or WickedPDF
      # Simplified placeholder
      pdf_content = <<~PDF
        #{current_organization.name}
        #{report.report_type.humanize} Report
        Period: #{report.period_start} - #{report.period_end}
        
        Total Revenue: ¥#{report.total_revenue}
        Total Expense: ¥#{report.total_expense}
        Net Income: ¥#{report.net_income}
        
        Generated on: #{report.created_at}
      PDF
      
      pdf_content
    end

    def calculate_dashboard_metrics
      current_month_start = Date.current.beginning_of_month
      current_month_end = Date.current.end_of_month
      last_month_start = 1.month.ago.beginning_of_month
      last_month_end = 1.month.ago.end_of_month
      
      {
        current_month: {
          revenue: current_organization.revenues
            .where(revenue_date: current_month_start..current_month_end)
            .sum(:amount),
          expense: current_organization.expenses
            .where(expense_date: current_month_start..current_month_end)
            .sum(:amount)
        },
        last_month: {
          revenue: current_organization.revenues
            .where(revenue_date: last_month_start..last_month_end)
            .sum(:amount),
          expense: current_organization.expenses
            .where(expense_date: last_month_start..last_month_end)
            .sum(:amount)
        },
        year_to_date: {
          revenue: current_organization.revenues
            .where(revenue_date: Date.current.beginning_of_year..Date.current)
            .sum(:amount),
          expense: current_organization.expenses
            .where(expense_date: Date.current.beginning_of_year..Date.current)
            .sum(:amount)
        }
      }
    end

    def analyze_cash_flow
      # Last 30 days cash flow
      daily_flow = {}
      
      (0..29).each do |days_ago|
        date = days_ago.days.ago.to_date
        
        daily_flow[date] = {
          inflow: current_organization.revenues
            .where(revenue_date: date, payment_status: 'received')
            .sum(:amount),
          outflow: current_organization.expenses
            .where(expense_date: date, payment_status: 'paid')
            .sum(:amount)
        }
      end
      
      daily_flow
    end

    def analyze_budget_status
      active_budgets = current_organization.budgets.active
      
      active_budgets.map do |budget|
        {
          budget: budget,
          utilization: budget.utilization_rate,
          remaining: budget.remaining_amount,
          health: budget.budget_health
        }
      end
    end

    def recent_transactions
      revenues = current_organization.revenues
        .order(created_at: :desc)
        .limit(5)
        .map { |r| { type: 'revenue', record: r } }
      
      expenses = current_organization.expenses
        .order(created_at: :desc)
        .limit(5)
        .map { |e| { type: 'expense', record: e } }
      
      (revenues + expenses).sort_by { |t| t[:record].created_at }.reverse.first(10)
    end

    def perform_analytics(period, comparison_type)
      analyzer = Ai::ExpenseAnalyzer.new(organization: current_organization)
      revenue_predictor = Ai::RevenuePredictor.new(organization: current_organization)
      
      period_range = calculate_period_range(period)
      
      {
        expense_analysis: analyzer.analyze_expense_patterns(period: period_range),
        revenue_analysis: analyze_revenue_patterns(period_range),
        comparison: perform_comparison(comparison_type, period_range),
        efficiency_metrics: calculate_efficiency_metrics(period_range)
      }
    end

    def calculate_period_range(period)
      case period
      when 'last_month'
        1.month
      when 'last_3_months'
        3.months
      when 'last_6_months'
        6.months
      when 'last_year'
        1.year
      else
        3.months
      end
    end

    def analyze_revenue_patterns(period_range)
      revenues = current_organization.revenues
        .where(revenue_date: period_range.ago..Date.current)
      
      {
        by_type: revenues.group(:revenue_type).sum(:amount),
        by_team: revenues.joins(:team).group('teams.name').sum(:amount),
        by_status: revenues.group(:payment_status).count,
        collection_metrics: {
          total: revenues.sum(:amount),
          collected: revenues.where(payment_status: 'received').sum(:amount),
          pending: revenues.where(payment_status: 'pending').sum(:amount),
          overdue: revenues.pending.select(&:is_overdue?).sum(&:amount)
        }
      }
    end

    def perform_comparison(comparison_type, period_range)
      case comparison_type
      when 'month_over_month'
        compare_months
      when 'quarter_over_quarter'
        compare_quarters
      when 'year_over_year'
        compare_years
      else
        {}
      end
    end

    def compare_months
      current_month = Date.current.beginning_of_month
      previous_month = 1.month.ago.beginning_of_month
      
      {
        current: calculate_period_metrics(current_month, current_month.end_of_month),
        previous: calculate_period_metrics(previous_month, previous_month.end_of_month),
        change: calculate_change_metrics(
          calculate_period_metrics(current_month, current_month.end_of_month),
          calculate_period_metrics(previous_month, previous_month.end_of_month)
        )
      }
    end

    def calculate_period_metrics(start_date, end_date)
      {
        revenue: current_organization.revenues
          .where(revenue_date: start_date..end_date)
          .sum(:amount),
        expense: current_organization.expenses
          .where(expense_date: start_date..end_date)
          .sum(:amount),
        transactions: current_organization.revenues
          .where(revenue_date: start_date..end_date)
          .count + current_organization.expenses
          .where(expense_date: start_date..end_date)
          .count
      }
    end

    def calculate_change_metrics(current, previous)
      {
        revenue_change: calculate_percentage_change(current[:revenue], previous[:revenue]),
        expense_change: calculate_percentage_change(current[:expense], previous[:expense]),
        net_income_change: calculate_percentage_change(
          current[:revenue] - current[:expense],
          previous[:revenue] - previous[:expense]
        )
      }
    end

    def calculate_percentage_change(current, previous)
      return 0 if previous.zero?
      ((current - previous) / previous.to_f * 100).round(2)
    end

    def calculate_efficiency_metrics(period_range)
      revenues = current_organization.revenues
        .where(revenue_date: period_range.ago..Date.current)
      expenses = current_organization.expenses
        .where(expense_date: period_range.ago..Date.current)
      
      total_revenue = revenues.sum(:amount)
      total_expense = expenses.sum(:amount)
      
      {
        expense_ratio: total_revenue.zero? ? 0 : (total_expense / total_revenue.to_f * 100).round(2),
        profit_margin: total_revenue.zero? ? 0 : ((total_revenue - total_expense) / total_revenue.to_f * 100).round(2),
        revenue_per_team: current_organization.teams.active.any? ? 
          (total_revenue / current_organization.teams.active.count).round(2) : 0,
        expense_per_match: current_organization.matches.any? ?
          (total_expense / current_organization.matches.count).round(2) : 0
      }
    end

    def analyze_trends(period)
      period_range = calculate_period_range(period)
      
      {
        revenue_trend: calculate_trend('revenue', period_range),
        expense_trend: calculate_trend('expense', period_range),
        team_growth: calculate_team_growth_trend(period_range),
        seasonal_patterns: identify_seasonal_patterns(period_range)
      }
    end

    def calculate_trend(type, period_range)
      data = case type
             when 'revenue'
               current_organization.revenues
                 .where(revenue_date: period_range.ago..Date.current)
                 .group_by_month(:revenue_date)
                 .sum(:amount)
             when 'expense'
               current_organization.expenses
                 .where(expense_date: period_range.ago..Date.current)
                 .group_by_month(:expense_date)
                 .sum(:amount)
             end
      
      values = data.values
      return 'stable' if values.size < 2
      
      # Simple trend detection
      first_half_avg = values.first(values.size / 2).sum.to_f / (values.size / 2)
      second_half_avg = values.last(values.size / 2).sum.to_f / (values.size / 2)
      
      change_rate = first_half_avg.zero? ? 0 : ((second_half_avg - first_half_avg) / first_half_avg * 100)
      
      {
        direction: change_rate > 5 ? 'increasing' : (change_rate < -5 ? 'decreasing' : 'stable'),
        rate: change_rate.round(2),
        data: data
      }
    end

    def calculate_team_growth_trend(period_range)
      teams_by_month = {}
      
      (0..11).each do |months_ago|
        date = months_ago.months.ago.end_of_month
        teams_by_month[date] = current_organization.teams
          .where('created_at <= ?', date)
          .count
      end
      
      teams_by_month
    end

    def identify_seasonal_patterns(period_range)
      # Simplified seasonal pattern detection
      revenues_by_month = current_organization.revenues
        .where(revenue_date: 3.years.ago..Date.current)
        .group_by_month(:revenue_date, format: '%m')
        .sum(:amount)
      
      expenses_by_month = current_organization.expenses
        .where(expense_date: 3.years.ago..Date.current)
        .group_by_month(:expense_date, format: '%m')
        .sum(:amount)
      
      {
        peak_revenue_months: revenues_by_month.sort_by { |_, v| -v }.first(3).map(&:first),
        peak_expense_months: expenses_by_month.sort_by { |_, v| -v }.first(3).map(&:first)
      }
    end

    def generate_forecasts
      predictor = Ai::RevenuePredictor.new(organization: current_organization)
      analyzer = Ai::ExpenseAnalyzer.new(organization: current_organization)
      
      {
        revenue_forecast: predictor.predict_revenue(
          period_start: Date.current.beginning_of_month,
          period_end: 3.months.from_now.end_of_month
        ),
        expense_forecast: analyzer.predict_future_expenses(months_ahead: 3)
      }
    end

    def compare_quarters
      current_quarter = Date.current.beginning_of_quarter
      previous_quarter = 3.months.ago.beginning_of_quarter
      
      {
        current: calculate_period_metrics(current_quarter, current_quarter.end_of_quarter),
        previous: calculate_period_metrics(previous_quarter, previous_quarter.end_of_quarter),
        change: calculate_change_metrics(
          calculate_period_metrics(current_quarter, current_quarter.end_of_quarter),
          calculate_period_metrics(previous_quarter, previous_quarter.end_of_quarter)
        )
      }
    end

    def compare_years
      current_year = Date.current.beginning_of_year
      previous_year = 1.year.ago.beginning_of_year
      
      {
        current: calculate_period_metrics(current_year, Date.current),
        previous: calculate_period_metrics(previous_year, previous_year.end_of_year),
        change: calculate_change_metrics(
          calculate_period_metrics(current_year, Date.current),
          calculate_period_metrics(previous_year, previous_year.end_of_year)
        )
      }
    end
  end
end