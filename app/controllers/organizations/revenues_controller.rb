# frozen_string_literal: true

module Organizations
  class RevenuesController < BaseController
    before_action :set_revenue, only: [:show, :edit, :update, :destroy, :mark_received]

    def index
      @revenues = current_organization.revenues
        .includes(:budget, :team, :invoice)
        .order(revenue_date: :desc)
      
      apply_filters
      
      @summary = calculate_revenue_summary
      @overdue_count = current_organization.revenues.pending.select(&:is_overdue?).count
      
      respond_to do |format|
        format.html
        format.csv { send_data generate_csv, filename: "revenues-#{Date.current}.csv" }
      end
    end

    def show
      @related_revenues = find_related_revenues
      @payment_history = build_payment_history
    end

    def new
      @revenue = current_organization.revenues.build(
        revenue_date: Date.current,
        payment_status: 'pending'
      )
      
      # Pre-fill if coming from a team
      @revenue.team_id = params[:team_id] if params[:team_id]
      
      # Pre-fill if creating from invoice
      if params[:invoice_id]
        invoice = current_organization.invoices.find(params[:invoice_id])
        prefill_from_invoice(invoice)
      end
    end

    def create
      @revenue = current_organization.revenues.build(revenue_params)
      
      if @revenue.save
        # Auto-assign budget
        @revenue.auto_assign_budget if @revenue.respond_to?(:auto_assign_budget)
        
        # Generate invoice if needed
        generate_invoice_if_needed(@revenue)
        
        redirect_to organization_revenue_path(@revenue), 
                    notice: '収入が正常に記録されました。'
      else
        render :new
      end
    end

    def edit
    end

    def update
      if @revenue.update(revenue_params)
        redirect_to organization_revenue_path(@revenue), 
                    notice: '収入が正常に更新されました。'
      else
        render :edit
      end
    end

    def destroy
      if @revenue.payment_status == 'received'
        redirect_to organization_revenues_path, 
                    alert: '受領済みの収入は削除できません。'
      else
        @revenue.destroy
        redirect_to organization_revenues_path, 
                    notice: '収入が正常に削除されました。'
      end
    end

    def mark_received
      if @revenue.mark_as_received!
        # Update related invoice if exists
        if @revenue.invoice
          @revenue.invoice.update!(status: 'paid', paid_at: Time.current)
        end
        
        redirect_to organization_revenue_path(@revenue), 
                    notice: '収入を受領済みとしてマークしました。'
      else
        redirect_to organization_revenue_path(@revenue), 
                    alert: '収入の更新に失敗しました。'
      end
    end

    def forecast
      predictor = Ai::RevenuePredictor.new(organization: current_organization)
      
      period_start = params[:start_date]&.to_date || 1.month.from_now.beginning_of_month
      period_end = params[:end_date]&.to_date || 3.months.from_now.end_of_month
      
      @forecast = predictor.predict_revenue(
        period_start: period_start,
        period_end: period_end
      )
      
      @opportunities = predictor.identify_growth_opportunities
      
      respond_to do |format|
        format.html
        format.json { render json: { forecast: @forecast, opportunities: @opportunities } }
      end
    end

    def growth_opportunities
      predictor = Ai::RevenuePredictor.new(organization: current_organization)
      @opportunities = predictor.identify_growth_opportunities
      
      # Get pricing optimization suggestions
      @pricing_suggestions = predictor.optimize_pricing_strategy
    end

    def bulk_record
      if request.post?
        result = process_bulk_revenues(params[:revenues])
        
        if result[:success]
          redirect_to organization_revenues_path,
                      notice: "#{result[:count]}件の収入を記録しました。"
        else
          redirect_to bulk_record_organization_revenues_path,
                      alert: result[:error]
        end
      else
        # Prepare for bulk recording (e.g., monthly membership fees)
        @teams = current_organization.teams.active
        @suggested_fees = calculate_suggested_fees
      end
    end

    private

    def set_revenue
      @revenue = current_organization.revenues.find(params[:id])
    end

    def revenue_params
      params.require(:revenue).permit(
        :name, :amount, :revenue_date, :revenue_type, :payment_method,
        :payment_status, :description, :invoice_number, :budget_id,
        :team_id, :match_id, :invoice_id
      )
    end

    def apply_filters
      if params[:type].present?
        @revenues = @revenues.where(revenue_type: params[:type])
      end
      
      if params[:status].present?
        @revenues = @revenues.where(payment_status: params[:status])
      end
      
      if params[:team_id].present?
        @revenues = @revenues.where(team_id: params[:team_id])
      end
      
      if params[:date_from].present?
        @revenues = @revenues.where('revenue_date >= ?', params[:date_from])
      end
      
      if params[:date_to].present?
        @revenues = @revenues.where('revenue_date <= ?', params[:date_to])
      end
      
      if params[:overdue] == 'true'
        @revenues = @revenues.pending.select(&:is_overdue?)
      end
      
      @revenues = @revenues.page(params[:page])
    end

    def calculate_revenue_summary
      scope = @revenues.except(:limit, :offset)
      
      {
        total_amount: scope.sum(:amount),
        received_amount: scope.where(payment_status: 'received').sum(:amount),
        pending_amount: scope.where(payment_status: 'pending').sum(:amount),
        by_type: scope.group(:revenue_type).sum(:amount),
        count: scope.count,
        collection_rate: calculate_collection_rate(scope)
      }
    end

    def calculate_collection_rate(revenues)
      total = revenues.sum(:amount)
      return 0 if total.zero?
      
      received = revenues.where(payment_status: 'received').sum(:amount)
      (received / total * 100).round(2)
    end

    def find_related_revenues
      return [] unless @revenue.team_id
      
      current_organization.revenues
        .where(team_id: @revenue.team_id)
        .where.not(id: @revenue.id)
        .order(revenue_date: :desc)
        .limit(5)
    end

    def build_payment_history
      history = []
      
      if @revenue.payment_status == 'received'
        history << {
          action: 'received',
          timestamp: @revenue.updated_at,
          note: '支払いを受領しました'
        }
      end
      
      if @revenue.invoice
        history << {
          action: 'invoice_created',
          timestamp: @revenue.invoice.created_at,
          note: "請求書 #{@revenue.invoice.invoice_number} を発行しました"
        }
      end
      
      history << {
        action: 'created',
        timestamp: @revenue.created_at,
        note: '収入を記録しました'
      }
      
      history.sort_by { |h| h[:timestamp] }.reverse
    end

    def prefill_from_invoice(invoice)
      @revenue.name = invoice.invoice_items.first&.description
      @revenue.amount = invoice.total_amount
      @revenue.team_id = invoice.team_id
      @revenue.invoice_id = invoice.id
      @revenue.invoice_number = invoice.invoice_number
      
      # Guess revenue type from invoice items
      if invoice.invoice_items.any? { |item| item.category == 'membership_fee' }
        @revenue.revenue_type = 'membership_fee'
      elsif invoice.invoice_items.any? { |item| item.category == 'registration_fee' }
        @revenue.revenue_type = 'registration_fee'
      end
    end

    def generate_invoice_if_needed(revenue)
      return if revenue.invoice_id.present?
      return unless %w[registration_fee membership_fee].include?(revenue.revenue_type)
      return unless revenue.team_id.present?
      
      InvoiceGenerationJob.perform_later(revenue)
    end

    def generate_csv
      CSV.generate(headers: true) do |csv|
        csv << ['日付', 'タイプ', '名称', '金額', '支払状況', 'チーム', '請求書番号']
        
        @revenues.find_each do |revenue|
          csv << [
            revenue.revenue_date,
            revenue.revenue_type,
            revenue.name,
            revenue.amount,
            revenue.payment_status,
            revenue.team&.name,
            revenue.invoice_number
          ]
        end
      end
    end

    def process_bulk_revenues(revenues_data)
      return { success: false, error: '収入データがありません' } unless revenues_data
      
      count = 0
      errors = []
      
      revenues_data.each do |team_id, data|
        next if data[:amount].blank? || data[:amount].to_f.zero?
        
        team = current_organization.teams.find_by(id: team_id)
        next unless team
        
        revenue = current_organization.revenues.build(
          name: "#{Date.current.strftime('%Y年%m月')} #{data[:type] == 'membership' ? '会費' : '登録料'}",
          amount: data[:amount],
          revenue_date: Date.current,
          revenue_type: data[:type] == 'membership' ? 'membership_fee' : 'registration_fee',
          payment_status: 'pending',
          team_id: team_id
        )
        
        if revenue.save
          generate_invoice_if_needed(revenue)
          count += 1
        else
          errors << "#{team.name}: #{revenue.errors.full_messages.join(', ')}"
        end
      end
      
      if errors.any?
        { success: false, error: errors.first(3).join("\n") }
      else
        { success: true, count: count }
      end
    end

    def calculate_suggested_fees
      # Calculate suggested fees based on team size and historical data
      @teams.each_with_object({}) do |team, fees|
        base_fee = 5000
        size_multiplier = case team.players.active.count
                         when 0..10 then 0.8
                         when 11..15 then 1.0
                         when 16..20 then 1.2
                         else 1.5
                         end
        
        fees[team.id] = {
          membership: (base_fee * size_multiplier).round(-2), # Round to nearest 100
          registration: 50000
        }
      end
    end
  end
end