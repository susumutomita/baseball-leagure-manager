class CreateLeagueTeams < ActiveRecord::Migration[7.1]
  def change
    create_table :league_teams do |t|
      t.references :league, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.datetime :registration_date
      t.string :payment_status

      t.timestamps
    end
  end
end
