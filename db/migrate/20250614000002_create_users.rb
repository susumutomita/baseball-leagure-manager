class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string :keycloak_id, null: false
      t.string :email, null: false
      t.string :name
      t.string :role, default: 'member'
      t.references :organization, null: false, foreign_key: true
      t.jsonb :preferences, default: {}
      t.string :avatar_url
      t.datetime :last_login_at
      t.boolean :active, default: true
      
      t.timestamps
    end
    
    add_index :users, :keycloak_id, unique: true
    add_index :users, :email
    add_index :users, [:organization_id, :email], unique: true
    add_index :users, :role
    add_index :users, :active
  end
end