class CreatePlayerAnalytics < ActiveRecord::Migration[7.0]
  def change
    create_table :player_analytics do |t|
      t.references :player, null: false, foreign_key: true
      t.references :season, foreign_key: true
      t.references :organization, null: false, foreign_key: true

      # Advanced batting metrics
      t.decimal :on_base_percentage, precision: 5, scale: 3
      t.decimal :slugging_percentage, precision: 5, scale: 3
      t.decimal :ops, precision: 5, scale: 3
      t.decimal :batting_average, precision: 5, scale: 3
      
      # Fielding metrics
      t.decimal :fielding_percentage, precision: 5, scale: 3
      t.decimal :defensive_efficiency, precision: 5, scale: 3
      t.integer :errors_count
      
      # Trend metrics
      t.string :performance_trend # "improving", "stable", "declining"
      t.decimal :consistency_score, precision: 5, scale: 3
      
      # Rankings
      t.integer :league_rank
      t.integer :position_rank
      t.integer :team_rank
      
      # Metadata
      t.datetime :calculated_at
      t.integer :games_analyzed
      
      t.timestamps
    end

    add_index :player_analytics, [:player_id, :season_id], unique: true
    add_index :player_analytics, :organization_id
    add_index :player_analytics, :league_rank
    add_index :player_analytics, :calculated_at
  end
end