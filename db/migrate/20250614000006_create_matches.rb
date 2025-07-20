class CreateMatches < ActiveRecord::Migration[7.0]
  def change
    create_table :matches do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :league, null: false, foreign_key: true
      t.references :home_team, null: false, foreign_key: { to_table: :teams }
      t.references :away_team, null: false, foreign_key: { to_table: :teams }
      t.datetime :scheduled_at, null: false
      t.string :stadium
      t.string :status, default: 'scheduled'
      t.integer :home_score
      t.integer :away_score
      t.integer :innings_played
      t.jsonb :innings_detail, default: {}
      t.text :match_notes
      t.boolean :is_playoff, default: false
      t.boolean :is_makeup, default: false
      t.references :original_match, foreign_key: { to_table: :matches }
      t.jsonb :ai_analysis, default: {}
      t.decimal :ai_home_win_probability
      t.jsonb :weather_data, default: {}
      t.datetime :actual_start_at
      t.datetime :actual_end_at
      
      t.timestamps
    end
    
    add_index :matches, [:organization_id, :league_id]
    add_index :matches, :scheduled_at
    add_index :matches, :status
    add_index :matches, [:home_team_id, :away_team_id]
    add_index :matches, :is_playoff
    add_index :matches, :original_match_id
    add_index :matches, [:league_id, :scheduled_at]
  end
end