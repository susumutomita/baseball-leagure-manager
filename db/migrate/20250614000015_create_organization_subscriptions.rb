class CreateOrganizationSubscriptions < ActiveRecord::Migration[7.0]
  def change
    create_table :organization_subscriptions do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :subscription_plan, null: false, foreign_key: true
      t.string :stripe_subscription_id
      t.string :stripe_customer_id
      t.string :status, null: false, default: 'active'
      t.datetime :current_period_start
      t.datetime :current_period_end
      t.datetime :trial_start
      t.datetime :trial_end
      t.datetime :canceled_at
      t.datetime :cancel_at
      t.string :cancellation_reason
      t.jsonb :stripe_metadata, default: {}
      t.decimal :discount_percentage, precision: 5, scale: 2
      t.string :discount_code
      t.jsonb :usage_limits, default: {}
      t.jsonb :usage_current, default: {}
      t.boolean :auto_renew, default: true
      t.datetime :next_billing_date
      t.decimal :next_amount, precision: 10, scale: 2
      
      t.timestamps
    end
    
    add_index :organization_subscriptions, :organization_id, unique: true
    add_index :organization_subscriptions, :stripe_subscription_id, unique: true, where: "stripe_subscription_id IS NOT NULL"
    add_index :organization_subscriptions, :stripe_customer_id
    add_index :organization_subscriptions, :status
    add_index :organization_subscriptions, :current_period_end
    add_index :organization_subscriptions, [:status, :current_period_end]
  end
end