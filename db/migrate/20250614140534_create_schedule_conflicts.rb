class CreateScheduleConflicts < ActiveRecord::Migration[7.1]
  def change
    create_table :schedule_conflicts do |t|
      t.references :match, null: false, foreign_key: true
      t.references :conflicting_match, null: false, foreign_key: true
      t.string :conflict_type
      t.string :resolution_status
      t.datetime :resolved_at

      t.timestamps
    end
  end
end
