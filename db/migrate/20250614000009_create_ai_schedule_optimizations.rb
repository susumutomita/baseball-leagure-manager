class CreateAiScheduleOptimizations < ActiveRecord::Migration[7.0]
  def change
    create_table :ai_schedule_optimizations do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :league, null: false, foreign_key: true
      t.string :optimization_type
      t.string :status, default: 'pending'
      t.jsonb :input_parameters, default: {}
      t.jsonb :optimization_result, default: {}
      t.decimal :fitness_score
      t.integer :iterations_completed
      t.datetime :started_at
      t.datetime :completed_at
      t.text :error_message
      t.references :created_by_user, foreign_key: { to_table: :users }
      t.boolean :applied, default: false
      t.datetime :applied_at
      
      t.timestamps
    end
    
    add_index :ai_schedule_optimizations, [:organization_id, :league_id]
    add_index :ai_schedule_optimizations, :status
    add_index :ai_schedule_optimizations, :optimization_type
    add_index :ai_schedule_optimizations, [:league_id, :created_at]
  end
end