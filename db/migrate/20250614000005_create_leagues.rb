class CreateLeagues < ActiveRecord::Migration[7.0]
  def change
    create_table :leagues do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :slug, null: false
      t.string :season
      t.date :start_date
      t.date :end_date
      t.jsonb :rules, default: {}
      t.string :status, default: 'draft'
      t.integer :max_teams
      t.integer :games_per_team
      t.boolean :ai_scheduling_enabled, default: false
      t.boolean :ai_matching_enabled, default: false
      t.jsonb :ai_config, default: {}
      t.text :description
      
      t.timestamps
    end
    
    add_index :leagues, [:organization_id, :slug], unique: true
    add_index :leagues, [:organization_id, :season]
    add_index :leagues, :status
    add_index :leagues, [:start_date, :end_date]
    add_index :leagues, :ai_scheduling_enabled
    add_index :leagues, :ai_matching_enabled
  end
end