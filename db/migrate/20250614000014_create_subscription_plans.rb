class CreateSubscriptionPlans < ActiveRecord::Migration[7.0]
  def change
    create_table :subscription_plans do |t|
      t.string :name, null: false
      t.string :stripe_price_id
      t.string :stripe_product_id
      t.decimal :price, precision: 10, scale: 2, null: false
      t.string :currency, default: 'JPY'
      t.string :billing_period # 'monthly', 'yearly'
      t.boolean :active, default: true
      t.jsonb :features, default: {}
      t.integer :max_teams
      t.integer :max_players
      t.integer :max_leagues
      t.boolean :ai_features_enabled, default: false
      t.boolean :advanced_analytics_enabled, default: false
      t.boolean :api_access_enabled, default: false
      t.integer :api_rate_limit
      t.boolean :custom_branding_enabled, default: false
      t.boolean :priority_support, default: false
      t.integer :data_retention_days
      t.integer :sort_order, default: 0
      t.text :description
      
      t.timestamps
    end
    
    add_index :subscription_plans, :stripe_price_id, unique: true, where: "stripe_price_id IS NOT NULL"
    add_index :subscription_plans, :stripe_product_id
    add_index :subscription_plans, :active
    add_index :subscription_plans, :billing_period
    add_index :subscription_plans, :sort_order
  end
end