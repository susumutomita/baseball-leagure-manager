class CreateOrganizations < ActiveRecord::Migration[7.0]
  def change
    create_table :organizations do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :domain
      t.string :logo_url
      t.jsonb :settings, default: {}
      t.string :time_zone, default: 'Asia/Tokyo'
      t.boolean :active, default: true
      t.integer :max_teams_limit
      t.integer :max_players_limit
      
      t.timestamps
    end
    
    add_index :organizations, :slug, unique: true
    add_index :organizations, :domain, unique: true, where: "domain IS NOT NULL"
    add_index :organizations, :active
  end
end