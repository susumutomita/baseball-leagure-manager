class CreatePlayers < ActiveRecord::Migration[7.0]
  def change
    create_table :players do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.string :name, null: false
      t.string :jersey_number
      t.string :position
      t.date :birth_date
      t.string :batting_hand
      t.string :throwing_hand
      t.decimal :height_cm
      t.decimal :weight_kg
      t.string :photo_url
      t.boolean :active, default: true
      t.string :status, default: 'active'
      t.jsonb :contact_info, default: {}
      t.date :joined_at
      t.date :contract_end_date
      
      t.timestamps
    end
    
    add_index :players, [:organization_id, :team_id]
    add_index :players, [:team_id, :jersey_number], unique: true, where: "jersey_number IS NOT NULL"
    add_index :players, :position
    add_index :players, :active
    add_index :players, :status
    add_index :players, :name
  end
end