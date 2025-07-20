class CreateTransactions < ActiveRecord::Migration[7.0]
  def change
    create_table :transactions do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :stripe_payment_id
      t.string :stripe_customer_id
      t.string :transaction_type, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :currency, default: 'JPY'
      t.string :status, null: false
      t.references :user, foreign_key: true
      t.jsonb :metadata, default: {}
      t.string :description
      t.datetime :processed_at
      t.string :payment_method
      t.string :failure_code
      t.string :failure_message
      
      t.timestamps
    end
    
    add_index :transactions, [:organization_id, :status]
    add_index :transactions, :stripe_payment_id, unique: true, where: "stripe_payment_id IS NOT NULL"
    add_index :transactions, :stripe_customer_id
    add_index :transactions, :transaction_type
    add_index :transactions, :processed_at
    add_index :transactions, [:organization_id, :created_at]
  end
end