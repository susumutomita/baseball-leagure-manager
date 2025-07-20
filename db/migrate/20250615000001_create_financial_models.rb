# frozen_string_literal: true

class CreateFinancialModels < ActiveRecord::Migration[7.0]
  def change
    # Budgets table
    create_table :budgets do |t|
      t.string :name, null: false
      t.string :budget_type, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.date :period_start, null: false
      t.date :period_end, null: false
      t.string :status, default: 'active'
      t.references :organization, null: false, foreign_key: true
      t.references :team, foreign_key: true
      t.string :category
      t.text :description

      t.timestamps
    end

    add_index :budgets, :budget_type
    add_index :budgets, :status
    add_index :budgets, :category
    add_index :budgets, [:organization_id, :period_start, :period_end]

    # Expenses table
    create_table :expenses do |t|
      t.string :name, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.date :expense_date, null: false
      t.string :category, null: false
      t.string :payment_method
      t.string :payment_status, default: 'pending'
      t.text :description
      t.string :receipt_url
      t.references :organization, null: false, foreign_key: true
      t.references :budget, foreign_key: true
      t.references :team, foreign_key: true
      t.references :match, foreign_key: true
      t.references :venue, foreign_key: true
      t.references :approved_by, foreign_key: { to_table: :users }
      t.datetime :approved_at

      t.timestamps
    end

    add_index :expenses, :expense_date
    add_index :expenses, :category
    add_index :expenses, :payment_status
    add_index :expenses, [:organization_id, :expense_date]

    # Revenues table
    create_table :revenues do |t|
      t.string :name, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.date :revenue_date, null: false
      t.string :revenue_type, null: false
      t.string :payment_method
      t.string :payment_status, default: 'pending'
      t.text :description
      t.string :invoice_number
      t.references :organization, null: false, foreign_key: true
      t.references :budget, foreign_key: true
      t.references :team, foreign_key: true
      t.references :match, foreign_key: true
      t.references :invoice, foreign_key: true

      t.timestamps
    end

    add_index :revenues, :revenue_date
    add_index :revenues, :revenue_type
    add_index :revenues, :payment_status
    add_index :revenues, :invoice_number, unique: true
    add_index :revenues, [:organization_id, :revenue_date]

    # Financial Reports table
    create_table :financial_reports do |t|
      t.string :report_type, null: false
      t.date :period_start, null: false
      t.date :period_end, null: false
      t.decimal :total_revenue, precision: 10, scale: 2, default: 0
      t.decimal :total_expense, precision: 10, scale: 2, default: 0
      t.decimal :net_income, precision: 10, scale: 2, default: 0
      t.string :status, default: 'draft'
      t.jsonb :report_data, default: {}
      t.jsonb :insights, default: {}
      t.references :generated_by, foreign_key: { to_table: :users }
      t.references :organization, null: false, foreign_key: true
      t.references :team, foreign_key: true

      t.timestamps
    end

    add_index :financial_reports, :report_type
    add_index :financial_reports, :status
    add_index :financial_reports, [:organization_id, :period_start, :period_end]

    # Budget Forecasts table
    create_table :budget_forecasts do |t|
      t.date :forecast_date, null: false
      t.date :forecast_period_start, null: false
      t.date :forecast_period_end, null: false
      t.decimal :predicted_revenue, precision: 10, scale: 2, null: false
      t.decimal :predicted_expense, precision: 10, scale: 2, null: false
      t.float :confidence_score, default: 0
      t.string :forecast_method
      t.jsonb :assumptions, default: {}
      t.jsonb :risk_factors, default: {}
      t.jsonb :recommendations, default: {}
      t.references :organization, null: false, foreign_key: true
      t.references :budget, foreign_key: true

      t.timestamps
    end

    add_index :budget_forecasts, :forecast_date
    add_index :budget_forecasts, :confidence_score
    add_index :budget_forecasts, [:organization_id, :forecast_period_start, :forecast_period_end]
  end
end