class CreateTeams < ActiveRecord::Migration[7.0]
  def change
    create_table :teams do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :slug, null: false
      t.string :abbreviation, limit: 5
      t.string :home_stadium
      t.string :logo_url
      t.jsonb :contact_info, default: {}
      t.decimal :latitude, precision: 10, scale: 8
      t.decimal :longitude, precision: 11, scale: 8
      t.references :manager_user, foreign_key: { to_table: :users }
      t.integer :founded_year
      t.text :description
      t.boolean :active, default: true
      t.jsonb :ai_preferences, default: {}
      
      t.timestamps
    end
    
    add_index :teams, [:organization_id, :name], unique: true
    add_index :teams, [:organization_id, :slug], unique: true
    add_index :teams, :active
    add_index :teams, :abbreviation
    add_index :teams, [:latitude, :longitude]
  end
end