class CreateTeams < ActiveRecord::Migration[7.1]
  def change
    create_table :teams do |t|
      t.string :name
      t.string :city
      t.text :description
      t.string :manager_name
      t.string :contact_email

      t.timestamps
    end
  end
end
