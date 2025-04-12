class CreateTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :transactions do |t|
      t.references :team, null: false, foreign_key: true
      t.references :league, null: false, foreign_key: true
      t.decimal :amount
      t.string :description
      t.string :payment_status
      t.string :payment_method
      t.datetime :transaction_date
      t.string :payment_reference

      t.timestamps
    end
  end
end
