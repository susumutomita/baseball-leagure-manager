# frozen_string_literal: true

class CreateBillingTables < ActiveRecord::Migration[7.1]
  def change
    # Add stripe_customer_id to organizations
    add_column :organizations, :stripe_customer_id, :string
    add_index :organizations, :stripe_customer_id, unique: true

    # Create subscription_plans table
    create_table :subscription_plans do |t|
      t.string :name, null: false
      t.integer :price_cents, null: false, default: 0
      t.string :currency, null: false, default: 'jpy'
      t.string :billing_interval, null: false, default: 'month'
      t.string :stripe_price_id
      t.jsonb :features, default: {}
      t.jsonb :limits, default: {}
      t.boolean :active, default: true
      t.integer :position, null: false
      t.timestamps
    end

    add_index :subscription_plans, :name, unique: true
    add_index :subscription_plans, :stripe_price_id, unique: true
    add_index :subscription_plans, :position, unique: true
    add_index :subscription_plans, :active

    # Create organization_subscriptions table
    create_table :organization_subscriptions do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :subscription_plan, null: false, foreign_key: true
      t.string :stripe_subscription_id
      t.integer :status, null: false, default: 0
      t.datetime :current_period_start
      t.datetime :current_period_end
      t.datetime :trial_end
      t.boolean :cancel_at_period_end, default: false
      t.datetime :canceled_at
      t.jsonb :metadata, default: {}
      t.timestamps
    end

    add_index :organization_subscriptions, :organization_id, unique: true
    add_index :organization_subscriptions, :stripe_subscription_id, unique: true
    add_index :organization_subscriptions, :status
    add_index :organization_subscriptions, :current_period_end

    # Create payment_methods table
    create_table :payment_methods do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :stripe_payment_method_id, null: false
      t.integer :payment_type, null: false, default: 0
      t.string :last4, null: false
      t.string :brand
      t.integer :exp_month
      t.integer :exp_year
      t.boolean :is_default, default: false
      t.boolean :active, default: true
      t.jsonb :metadata, default: {}
      t.timestamps
    end

    add_index :payment_methods, :stripe_payment_method_id, unique: true
    add_index :payment_methods, [:organization_id, :is_default]
    add_index :payment_methods, :active

    # Create invoices table
    create_table :invoices do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :organization_subscription, null: false, foreign_key: true
      t.string :stripe_invoice_id
      t.string :invoice_number, null: false
      t.integer :status, null: false, default: 0
      t.integer :total_cents, null: false, default: 0
      t.integer :subtotal_cents, null: false, default: 0
      t.integer :tax_cents, null: false, default: 0
      t.string :currency, null: false, default: 'jpy'
      t.date :invoice_date
      t.date :due_date
      t.datetime :paid_at
      t.string :stripe_hosted_invoice_url
      t.string :stripe_invoice_pdf
      t.jsonb :metadata, default: {}
      t.timestamps
    end

    add_index :invoices, :stripe_invoice_id, unique: true
    add_index :invoices, :invoice_number, unique: true
    add_index :invoices, :status
    add_index :invoices, :due_date
    add_index :invoices, :paid_at

    # Create invoice_items table
    create_table :invoice_items do |t|
      t.references :invoice, null: false, foreign_key: true
      t.string :description, null: false
      t.decimal :quantity, null: false, default: 1
      t.integer :unit_price_cents, null: false, default: 0
      t.integer :total_cents, null: false, default: 0
      t.datetime :period_start
      t.datetime :period_end
      t.jsonb :metadata, default: {}
      t.timestamps
    end

    # Create usages table
    create_table :usages do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :organization_subscription, null: false, foreign_key: true
      t.string :resource, null: false
      t.decimal :quantity, null: false, default: 0
      t.datetime :recorded_at, null: false
      t.jsonb :metadata, default: {}
      t.timestamps
    end

    add_index :usages, [:organization_id, :resource]
    add_index :usages, :recorded_at
    add_index :usages, [:organization_id, :resource, :recorded_at]
  end
end