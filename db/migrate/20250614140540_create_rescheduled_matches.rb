class CreateRescheduledMatches < ActiveRecord::Migration[7.1]
  def change
    create_table :rescheduled_matches do |t|
      t.references :match, null: false, foreign_key: true
      t.date :original_date
      t.time :original_time
      t.date :new_date
      t.time :new_time
      t.string :reason
      t.json :weather_data

      t.timestamps
    end

    add_index :rescheduled_matches, :original_date
    add_index :rescheduled_matches, :new_date
  end
end