class CreateTeamAnalytics < ActiveRecord::Migration[7.0]
  def change
    create_table :team_analytics do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.references :league, foreign_key: true
      t.string :analytics_type # 'performance', 'financial', 'fan_engagement'
      t.date :period_start
      t.date :period_end
      
      # Performance metrics
      t.integer :wins, default: 0
      t.integer :losses, default: 0
      t.integer :ties, default: 0
      t.decimal :win_percentage, precision: 4, scale: 3
      t.integer :runs_scored, default: 0
      t.integer :runs_allowed, default: 0
      t.decimal :pythagorean_expectation, precision: 4, scale: 3
      
      # AI-generated insights
      t.jsonb :ai_performance_insights, default: {}
      t.jsonb :ai_player_recommendations, default: {}
      t.jsonb :ai_strategy_suggestions, default: {}
      t.decimal :ai_team_rating, precision: 5, scale: 2
      
      # Fan engagement metrics
      t.integer :average_attendance, default: 0
      t.decimal :attendance_growth_rate, precision: 5, scale: 2
      t.jsonb :social_media_metrics, default: {}
      
      # Financial metrics
      t.decimal :revenue, precision: 12, scale: 2
      t.decimal :expenses, precision: 12, scale: 2
      t.decimal :profit_margin, precision: 5, scale: 2
      
      t.jsonb :custom_metrics, default: {}
      t.datetime :calculated_at
      
      t.timestamps
    end
    
    add_index :team_analytics, [:organization_id, :team_id]
    add_index :team_analytics, [:team_id, :league_id, :analytics_type], unique: true, where: "league_id IS NOT NULL"
    add_index :team_analytics, :analytics_type
    add_index :team_analytics, [:period_start, :period_end]
    add_index :team_analytics, :calculated_at
  end
end