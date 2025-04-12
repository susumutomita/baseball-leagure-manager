class CreateTeamMemberships < ActiveRecord::Migration[7.0]
  def change
    create_table :team_memberships do |t|
      t.references :user, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.integer :role, default: 0
      t.integer :jersey_number
      t.boolean :active, default: true

      t.timestamps
    end
    add_index :team_memberships, [:user_id, :team_id], unique: true
    add_index :team_memberships, [:team_id, :jersey_number], unique: true
  end
end
