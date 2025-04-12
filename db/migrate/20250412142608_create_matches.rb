class CreateMatches < ActiveRecord::Migration[7.1]
  def change
    create_table :matches do |t|
      t.references :league, null: false, foreign_key: true
      t.references :home_team, null: false, foreign_key: { to_table: :teams }
      t.references :away_team, null: false, foreign_key: { to_table: :teams }
      t.datetime :date
      t.string :venue
      t.integer :home_score
      t.integer :away_score
      t.string :status
      t.text :notes

      t.timestamps
    end
  end
end
