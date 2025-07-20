class CreateVenueAvailabilities < ActiveRecord::Migration[7.1]
  def change
    create_table :venue_availabilities do |t|
      t.references :venue, null: false, foreign_key: true
      t.date :available_date
      t.time :start_time
      t.time :end_time
      t.boolean :is_available

      t.timestamps
    end
  end
end
