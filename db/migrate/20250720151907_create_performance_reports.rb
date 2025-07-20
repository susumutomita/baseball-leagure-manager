class CreatePerformanceReports < ActiveRecord::Migration[7.0]
  def change
    create_table :performance_reports do |t|
      t.references :reportable, polymorphic: true, null: false
      t.references :generated_by, null: false, foreign_key: { to_table: :users }
      t.references :organization, null: false, foreign_key: true
      
      # Report details
      t.string :report_type, null: false # "player_performance", "team_summary", "league_overview"
      t.date :period_start
      t.date :period_end
      
      # Report content
      t.json :content # Main report data
      t.json :insights # AI-generated insights
      t.json :recommendations # Actionable recommendations
      
      # Report metadata
      t.string :format, default: "json" # "json", "pdf", "csv", "excel"
      t.string :status, default: "pending" # "pending", "generating", "completed", "failed"
      t.text :error_message
      
      # Distribution settings
      t.json :recipients # Email addresses or user IDs
      t.datetime :sent_at
      t.boolean :auto_generated, default: false
      
      t.timestamps
    end

    add_index :performance_reports, [:reportable_type, :reportable_id]
    add_index :performance_reports, :organization_id
    add_index :performance_reports, :generated_by_id
    add_index :performance_reports, [:report_type, :status]
    add_index :performance_reports, :created_at
  end
end