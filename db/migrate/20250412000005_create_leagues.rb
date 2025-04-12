class CreateLeagues < ActiveRecord::Migration[7.0]
  def change
    create_table :leagues do |t|
      t.string :name, null: false
      t.text :description
      t.decimal :registration_fee, precision: 10, scale: 2, default: 0.0
      t.references :admin, foreign_key: { to_table: :users }
      t.references :tenant, foreign_key: true

      t.timestamps
    end
    add_index :leagues, :name, unique: true
  end
end
