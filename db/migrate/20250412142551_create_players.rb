class CreatePlayers < ActiveRecord::Migration[7.1]
  def change
    create_table :players do |t|
      t.string :name
      t.string :position
      t.integer :jersey_number
      t.references :team, null: false, foreign_key: true
      t.date :birth_date
      t.string :contact_email

      t.timestamps
    end
  end
end
