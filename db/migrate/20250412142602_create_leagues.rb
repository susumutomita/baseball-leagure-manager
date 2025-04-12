class CreateLeagues < ActiveRecord::Migration[7.1]
  def change
    create_table :leagues do |t|
      t.string :name
      t.string :season
      t.date :start_date
      t.date :end_date
      t.date :registration_deadline
      t.integer :max_teams
      t.decimal :fee_amount
      t.string :status

      t.timestamps
    end
  end
end
