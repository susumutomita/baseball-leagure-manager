class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :phone, null: false
      t.integer :role, default: 0
      t.references :tenant, foreign_key: true

      t.timestamps
    end
    add_index :users, :phone, unique: true
  end
end
