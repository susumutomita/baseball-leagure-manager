class CreatePlayerStatistics < ActiveRecord::Migration[7.0]
  def change
    create_table :player_statistics do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.references :league, foreign_key: true
      t.references :match, foreign_key: true
      t.string :stat_type, null: false # 'season', 'match', 'career'
      t.integer :games_played, default: 0
      
      # Batting stats
      t.integer :at_bats, default: 0
      t.integer :hits, default: 0
      t.integer :doubles, default: 0
      t.integer :triples, default: 0
      t.integer :home_runs, default: 0
      t.integer :runs_batted_in, default: 0
      t.integer :runs_scored, default: 0
      t.integer :stolen_bases, default: 0
      t.integer :caught_stealing, default: 0
      t.integer :walks, default: 0
      t.integer :strikeouts, default: 0
      t.decimal :batting_average, precision: 4, scale: 3
      t.decimal :on_base_percentage, precision: 4, scale: 3
      t.decimal :slugging_percentage, precision: 4, scale: 3
      
      # Pitching stats
      t.integer :innings_pitched, default: 0
      t.integer :wins, default: 0
      t.integer :losses, default: 0
      t.integer :saves, default: 0
      t.integer :earned_runs, default: 0
      t.integer :pitching_strikeouts, default: 0
      t.integer :pitching_walks, default: 0
      t.integer :hits_allowed, default: 0
      t.decimal :earned_run_average, precision: 5, scale: 2
      t.decimal :whip, precision: 5, scale: 3
      
      # Fielding stats
      t.integer :putouts, default: 0
      t.integer :assists, default: 0
      t.integer :errors, default: 0
      t.decimal :fielding_percentage, precision: 4, scale: 3
      
      t.jsonb :additional_stats, default: {}
      t.date :period_start
      t.date :period_end
      
      t.timestamps
    end
    
    add_index :player_statistics, [:organization_id, :player_id, :stat_type]
    add_index :player_statistics, [:player_id, :league_id, :stat_type], unique: true, where: "league_id IS NOT NULL AND match_id IS NULL"
    add_index :player_statistics, [:player_id, :match_id], unique: true, where: "match_id IS NOT NULL"
    add_index :player_statistics, :stat_type
    add_index :player_statistics, [:team_id, :league_id]
  end
end