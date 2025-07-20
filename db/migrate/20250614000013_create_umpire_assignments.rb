class CreateUmpireAssignments < ActiveRecord::Migration[7.0]
  def change
    create_table :umpire_assignments do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :match, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :position, null: false # 'home_plate', 'first_base', 'second_base', 'third_base'
      t.string :status, default: 'assigned'
      t.datetime :confirmed_at
      t.datetime :checked_in_at
      t.text :notes
      t.decimal :performance_rating, precision: 3, scale: 2
      t.jsonb :game_report, default: {}
      t.boolean :is_primary, default: false
      t.decimal :compensation_amount, precision: 8, scale: 2
      t.string :compensation_status, default: 'pending'
      
      t.timestamps
    end
    
    add_index :umpire_assignments, [:organization_id, :match_id]
    add_index :umpire_assignments, [:match_id, :position], unique: true
    add_index :umpire_assignments, [:user_id, :match_id], unique: true
    add_index :umpire_assignments, :status
    add_index :umpire_assignments, [:user_id, :created_at]
    add_index :umpire_assignments, :compensation_status
  end
end