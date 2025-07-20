# frozen_string_literal: true

class CreateAiMatchingTables < ActiveRecord::Migration[7.1]
  def change
    # Add missing columns to existing tables
    add_column :teams, :latitude, :float unless column_exists?(:teams, :latitude)
    add_column :teams, :longitude, :float unless column_exists?(:teams, :longitude)
    add_column :teams, :home_venue, :string unless column_exists?(:teams, :home_venue)
    
    add_column :matches, :scheduled_at, :datetime unless column_exists?(:matches, :scheduled_at)
    add_column :matches, :match_proposal_id, :bigint unless column_exists?(:matches, :match_proposal_id)
    add_column :matches, :winner_team_id, :bigint unless column_exists?(:matches, :winner_team_id)
    add_column :matches, :season_id, :bigint unless column_exists?(:matches, :season_id)
    add_column :matches, :home_score, :integer unless column_exists?(:matches, :home_score)
    add_column :matches, :away_score, :integer unless column_exists?(:matches, :away_score)
    
    add_column :leagues, :season, :string unless column_exists?(:leagues, :season)
    
    # Update ai_matching_configs if it exists
    if table_exists?(:ai_matching_configs)
      add_column :ai_matching_configs, :weight_strength_balance, :float, default: 0.25 unless column_exists?(:ai_matching_configs, :weight_strength_balance)
      add_column :ai_matching_configs, :weight_travel_distance, :float, default: 0.25 unless column_exists?(:ai_matching_configs, :weight_travel_distance)
      add_column :ai_matching_configs, :weight_schedule_preference, :float, default: 0.25 unless column_exists?(:ai_matching_configs, :weight_schedule_preference)
      add_column :ai_matching_configs, :weight_home_away_balance, :float, default: 0.25 unless column_exists?(:ai_matching_configs, :weight_home_away_balance)
      add_column :ai_matching_configs, :max_consecutive_home_games, :integer, default: 3 unless column_exists?(:ai_matching_configs, :max_consecutive_home_games)
      add_column :ai_matching_configs, :max_consecutive_away_games, :integer, default: 3 unless column_exists?(:ai_matching_configs, :max_consecutive_away_games)
      add_column :ai_matching_configs, :min_days_between_matches, :integer, default: 3 unless column_exists?(:ai_matching_configs, :min_days_between_matches)
      add_column :ai_matching_configs, :max_travel_distance_km, :float unless column_exists?(:ai_matching_configs, :max_travel_distance_km)
      add_column :ai_matching_configs, :use_ai_analysis, :boolean, default: false unless column_exists?(:ai_matching_configs, :use_ai_analysis)
      add_column :ai_matching_configs, :custom_rules, :text unless column_exists?(:ai_matching_configs, :custom_rules)
      add_column :ai_matching_configs, :api_key, :string unless column_exists?(:ai_matching_configs, :api_key)
      add_column :ai_matching_configs, :max_games_per_week, :integer, default: 3 unless column_exists?(:ai_matching_configs, :max_games_per_week)
    else
      create_table :ai_matching_configs do |t|
        t.references :league, null: false, foreign_key: true
        t.references :organization, null: false, foreign_key: true
        t.integer :algorithm_type, default: 0
        t.integer :ai_provider, default: 2
        t.string :api_key
        t.float :weight_strength_balance, default: 0.25
        t.float :weight_travel_distance, default: 0.25
        t.float :weight_schedule_preference, default: 0.25
        t.float :weight_home_away_balance, default: 0.25
        t.integer :max_consecutive_home_games, default: 3
        t.integer :max_consecutive_away_games, default: 3
        t.integer :min_days_between_matches, default: 3
        t.float :max_travel_distance_km
        t.boolean :use_ai_analysis, default: false
        t.text :custom_rules
        t.integer :max_games_per_week, default: 3
        
        t.timestamps
      end
      
      add_index :ai_matching_configs, [:league_id, :organization_id], unique: true
    end
    
    # Create seasons table
    create_table :seasons do |t|
      t.string :name, null: false
      t.integer :year, null: false
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.references :organization, null: false, foreign_key: true
      
      t.timestamps
    end
    
    add_index :seasons, [:organization_id, :name], unique: true
    
    # Create match_proposals table
    create_table :match_proposals do |t|
      t.references :league, null: false, foreign_key: true
      t.references :ai_matching_config, null: false, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      t.integer :status, default: 0
      t.float :overall_fairness_score
      t.float :strength_balance_score
      t.float :travel_efficiency_score
      t.float :schedule_preference_score
      t.float :home_away_balance_score
      t.text :proposal_metadata
      t.text :ai_analysis_result
      t.text :rejection_reasons
      t.datetime :approved_at
      t.bigint :approved_by
      t.datetime :rejected_at
      t.bigint :rejected_by
      t.datetime :applied_at
      t.string :name
      t.text :description
      
      t.timestamps
    end
    
    add_index :match_proposals, :status
    add_index :match_proposals, :league_id
    
    # Create match_proposal_details table
    create_table :match_proposal_details do |t|
      t.references :match_proposal, null: false, foreign_key: true
      t.references :home_team, null: false, foreign_key: { to_table: :teams }
      t.references :away_team, null: false, foreign_key: { to_table: :teams }
      t.references :match, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      t.datetime :proposed_datetime, null: false
      t.string :proposed_venue
      t.boolean :applied, default: false
      t.text :metadata
      
      t.timestamps
    end
    
    add_index :match_proposal_details, [:home_team_id, :away_team_id]
    add_index :match_proposal_details, :proposed_datetime
    
    # Create team_strength_metrics table
    create_table :team_strength_metrics do |t|
      t.references :team, null: false, foreign_key: true
      t.references :season, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      t.float :overall_rating, default: 0.5
      t.float :offensive_rating, default: 0.5
      t.float :defensive_rating, default: 0.5
      t.float :pitching_rating, default: 0.5
      t.float :recent_form_rating, default: 0.5
      t.float :win_rate
      t.float :average_runs_scored
      t.float :average_runs_allowed
      t.integer :games_played, default: 0
      t.integer :wins, default: 0
      t.integer :losses, default: 0
      t.integer :ties, default: 0
      t.boolean :is_current, default: false
      t.text :detailed_metrics
      t.text :player_contributions
      
      t.timestamps
    end
    
    add_index :team_strength_metrics, [:team_id, :is_current]
    add_index :team_strength_metrics, [:team_id, :season_id]
    
    # Create player_stats table
    create_table :player_stats do |t|
      t.references :player, null: false, foreign_key: true
      t.references :season, foreign_key: true
      t.references :match, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      
      # Batting statistics
      t.integer :at_bats
      t.integer :hits
      t.integer :home_runs
      t.integer :rbis
      t.float :batting_average
      
      # Pitching statistics
      t.float :innings_pitched
      t.integer :earned_runs
      t.float :era
      
      t.timestamps
    end
    
    add_index :player_stats, [:player_id, :season_id]
    add_index :player_stats, [:player_id, :match_id]
    
    # Add foreign key constraints
    add_foreign_key :matches, :match_proposals unless foreign_key_exists?(:matches, :match_proposals)
    add_foreign_key :matches, :teams, column: :winner_team_id unless foreign_key_exists?(:matches, :teams, column: :winner_team_id)
    add_foreign_key :matches, :seasons unless foreign_key_exists?(:matches, :seasons)
  end
end