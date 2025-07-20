# frozen_string_literal: true

module Organizations
  class ExpensesController < BaseController
    before_action :set_expense, only: [:show, :edit, :update, :destroy, :approve]

    def index
      @expenses = current_organization.expenses
        .includes(:budget, :team, :approved_by, :match, :venue)
        .order(expense_date: :desc)
      
      apply_filters
      
      @summary = calculate_expense_summary
      @pending_approval = current_organization.expenses.pending_approval.count
      
      respond_to do |format|
        format.html
        format.csv { send_data generate_csv, filename: "expenses-#{Date.current}.csv" }
      end
    end

    def show
      @related_expenses = find_related_expenses
      @approval_history = build_approval_history
    end

    def new
      @expense = current_organization.expenses.build(
        expense_date: Date.current,
        payment_status: 'pending'
      )
      
      # Pre-fill if coming from a match or team
      @expense.match_id = params[:match_id] if params[:match_id]
      @expense.team_id = params[:team_id] if params[:team_id]
    end

    def create
      @expense = current_organization.expenses.build(expense_params)
      
      # Auto-categorize if not provided
      if @expense.category.blank?
        auto_category = categorize_expense(@expense)
        @expense.category = auto_category[:category]
      end
      
      if @expense.save
        # Auto-assign budget
        @expense.auto_assign_budget
        
        # Check if approval needed
        check_approval_requirement(@expense)
        
        redirect_to organization_expense_path(@expense), 
                    notice: '支出が正常に記録されました。'
      else
        render :new
      end
    end

    def edit
    end

    def update
      if @expense.update(expense_params)
        # Re-check budget assignment
        @expense.auto_assign_budget unless @expense.budget_id
        
        redirect_to organization_expense_path(@expense), 
                    notice: '支出が正常に更新されました。'
      else
        render :edit
      end
    end

    def destroy
      if @expense.approved?
        redirect_to organization_expenses_path, 
                    alert: '承認済みの支出は削除できません。'
      else
        @expense.destroy
        redirect_to organization_expenses_path, 
                    notice: '支出が正常に削除されました。'
      end
    end

    def approve
      if @expense.approve!(current_user)
        redirect_to organization_expense_path(@expense), 
                    notice: '支出が承認されました。'
      else
        redirect_to organization_expense_path(@expense), 
                    alert: '支出の承認に失敗しました。'
      end
    end

    def bulk_import
      if request.post?
        file = params[:file]
        
        if file.present?
          result = process_bulk_import(file)
          
          if result[:success]
            redirect_to organization_expenses_path, 
                        notice: "#{result[:imported]}件の支出をインポートしました。"
          else
            redirect_to bulk_import_organization_expenses_path, 
                        alert: result[:error]
          end
        else
          redirect_to bulk_import_organization_expenses_path, 
                      alert: 'ファイルを選択してください。'
        end
      end
    end

    def analysis
      analyzer = Ai::ExpenseAnalyzer.new(organization: current_organization)
      
      @analysis = analyzer.analyze_expense_patterns(period: params[:period]&.to_i&.months || 3.months)
      @cost_reduction = analyzer.identify_cost_reduction_opportunities
      
      respond_to do |format|
        format.html
        format.json { render json: { analysis: @analysis, opportunities: @cost_reduction } }
      end
    end

    private

    def set_expense
      @expense = current_organization.expenses.find(params[:id])
    end

    def expense_params
      params.require(:expense).permit(
        :name, :amount, :expense_date, :category, :payment_method,
        :payment_status, :description, :receipt_url, :budget_id,
        :team_id, :match_id, :venue_id
      )
    end

    def apply_filters
      if params[:category].present?
        @expenses = @expenses.where(category: params[:category])
      end
      
      if params[:status].present?
        @expenses = @expenses.where(payment_status: params[:status])
      end
      
      if params[:team_id].present?
        @expenses = @expenses.where(team_id: params[:team_id])
      end
      
      if params[:date_from].present?
        @expenses = @expenses.where('expense_date >= ?', params[:date_from])
      end
      
      if params[:date_to].present?
        @expenses = @expenses.where('expense_date <= ?', params[:date_to])
      end
      
      if params[:approval].present?
        case params[:approval]
        when 'pending'
          @expenses = @expenses.pending_approval
        when 'approved'
          @expenses = @expenses.approved
        end
      end
      
      @expenses = @expenses.page(params[:page])
    end

    def calculate_expense_summary
      scope = @expenses.except(:limit, :offset)
      
      {
        total_amount: scope.sum(:amount),
        paid_amount: scope.where(payment_status: 'paid').sum(:amount),
        pending_amount: scope.where(payment_status: 'pending').sum(:amount),
        by_category: scope.group(:category).sum(:amount),
        count: scope.count
      }
    end

    def find_related_expenses
      return [] unless @expense.team_id || @expense.match_id
      
      scope = current_organization.expenses.where.not(id: @expense.id)
      
      if @expense.match_id
        scope = scope.where(match_id: @expense.match_id)
      elsif @expense.team_id
        scope = scope.where(team_id: @expense.team_id)
                     .where(expense_date: @expense.expense_date - 7.days..@expense.expense_date + 7.days)
      end
      
      scope.limit(5)
    end

    def build_approval_history
      history = []
      
      if @expense.approved_at
        history << {
          action: 'approved',
          user: @expense.approved_by,
          timestamp: @expense.approved_at,
          note: '支出を承認しました'
        }
      end
      
      # Add creation history
      history << {
        action: 'created',
        timestamp: @expense.created_at,
        note: '支出を記録しました'
      }
      
      history.sort_by { |h| h[:timestamp] }.reverse
    end

    def categorize_expense(expense)
      accountant = Accounting::AutoAccountant.new(organization: current_organization)
      accountant.categorize_transaction(
        description: expense.name,
        amount: expense.amount,
        transaction_type: 'expense'
      )
    end

    def check_approval_requirement(expense)
      # Require approval for expenses over 100,000 yen
      if expense.amount > 100000
        ExpenseApprovalNotificationJob.perform_later(expense)
      end
    end

    def generate_csv
      CSV.generate(headers: true) do |csv|
        csv << ['日付', 'カテゴリ', '名称', '金額', '支払状況', 'チーム', '承認状況']
        
        @expenses.find_each do |expense|
          csv << [
            expense.expense_date,
            expense.category,
            expense.name,
            expense.amount,
            expense.payment_status,
            expense.team&.name,
            expense.approved? ? '承認済' : '未承認'
          ]
        end
      end
    end

    def process_bulk_import(file)
      imported = 0
      errors = []
      
      CSV.foreach(file.path, headers: true, encoding: 'UTF-8') do |row|
        expense = current_organization.expenses.build(
          name: row['名称'] || row['name'],
          amount: row['金額'] || row['amount'],
          expense_date: Date.parse(row['日付'] || row['date']),
          category: row['カテゴリ'] || row['category'],
          payment_status: row['支払状況'] || row['payment_status'] || 'pending',
          description: row['備考'] || row['description']
        )
        
        # Try to match team
        if team_name = row['チーム'] || row['team']
          team = current_organization.teams.find_by(name: team_name)
          expense.team_id = team.id if team
        end
        
        if expense.save
          expense.auto_assign_budget
          imported += 1
        else
          errors << "行 #{$.}: #{expense.errors.full_messages.join(', ')}"
        end
      end
      
      if errors.any?
        { success: false, error: errors.first(5).join("\n") }
      else
        { success: true, imported: imported }
      end
    rescue StandardError => e
      { success: false, error: "インポートエラー: #{e.message}" }
    end
  end
end