class CreateVenues < ActiveRecord::Migration[7.1]
  def change
    create_table :venues do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name
      t.string :address
      t.decimal :latitude
      t.decimal :longitude
      t.integer :capacity
      t.text :facilities

      t.timestamps
    end
  end
end
