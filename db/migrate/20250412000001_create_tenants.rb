class CreateTenants < ActiveRecord::Migration[7.0]
  def change
    create_table :tenants do |t|
      t.string :name, null: false
      t.string :subdomain, null: false
      t.text :settings

      t.timestamps
    end
    add_index :tenants, :subdomain, unique: true
  end
end
