class CreateTeamAnalytics < ActiveRecord::Migration[7.0]
  def change
    create_table :team_analytics do |t|
      t.references :team, null: false, foreign_key: true
      t.references :season, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      
      # Player metrics (stored as JSON)
      t.json :top_performers
      t.json :improvement_candidates
      t.json :position_strength_analysis
      
      # Team chemistry metrics
      t.decimal :lineup_effectiveness, precision: 5, scale: 3
      t.json :player_synergies
      
      # Aggregate team metrics
      t.decimal :team_batting_average, precision: 5, scale: 3
      t.decimal :team_era, precision: 5, scale: 3
      t.decimal :team_fielding_percentage, precision: 5, scale: 3
      t.decimal :winning_percentage, precision: 5, scale: 3
      
      # Team rankings
      t.integer :league_rank
      t.integer :division_rank
      
      # Metadata
      t.datetime :calculated_at
      t.integer :games_analyzed
      
      t.timestamps
    end

    add_index :team_analytics, [:team_id, :season_id], unique: true
    add_index :team_analytics, :organization_id
    add_index :team_analytics, :calculated_at
  end
end