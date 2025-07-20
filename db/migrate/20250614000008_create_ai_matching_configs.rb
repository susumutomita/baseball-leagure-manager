class CreateAiMatchingConfigs < ActiveRecord::Migration[7.0]
  def change
    create_table :ai_matching_configs do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :league, null: false, foreign_key: true
      t.boolean :active, default: true
      t.jsonb :team_strength_weights, default: {}
      t.decimal :travel_distance_weight, default: 0.2
      t.decimal :rest_days_weight, default: 0.3
      t.decimal :rivalry_weight, default: 0.2
      t.decimal :fan_interest_weight, default: 0.3
      t.integer :min_days_between_matches, default: 2
      t.integer :max_consecutive_home_games, default: 3
      t.integer :max_consecutive_away_games, default: 3
      t.jsonb :blackout_dates, default: []
      t.jsonb :preferred_match_times, default: {}
      t.jsonb :stadium_availability, default: {}
      
      t.timestamps
    end
    
    add_index :ai_matching_configs, [:organization_id, :league_id], unique: true
    add_index :ai_matching_configs, :active
  end
end