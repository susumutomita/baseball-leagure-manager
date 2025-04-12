# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_04_12_143023) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "league_teams", force: :cascade do |t|
    t.bigint "league_id", null: false
    t.bigint "team_id", null: false
    t.datetime "registration_date"
    t.string "payment_status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_league_teams_on_league_id"
    t.index ["team_id"], name: "index_league_teams_on_team_id"
  end

  create_table "leagues", force: :cascade do |t|
    t.string "name"
    t.string "season"
    t.date "start_date"
    t.date "end_date"
    t.date "registration_deadline"
    t.integer "max_teams"
    t.decimal "fee_amount"
    t.string "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "matches", force: :cascade do |t|
    t.bigint "league_id", null: false
    t.bigint "home_team_id", null: false
    t.bigint "away_team_id", null: false
    t.datetime "date"
    t.string "venue"
    t.integer "home_score"
    t.integer "away_score"
    t.string "status"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["away_team_id"], name: "index_matches_on_away_team_id"
    t.index ["home_team_id"], name: "index_matches_on_home_team_id"
    t.index ["league_id"], name: "index_matches_on_league_id"
  end

  create_table "players", force: :cascade do |t|
    t.string "name"
    t.string "position"
    t.integer "jersey_number"
    t.bigint "team_id", null: false
    t.date "birth_date"
    t.string "contact_email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["team_id"], name: "index_players_on_team_id"
  end

  create_table "teams", force: :cascade do |t|
    t.string "name"
    t.string "city"
    t.text "description"
    t.string "manager_name"
    t.string "contact_email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "transactions", force: :cascade do |t|
    t.bigint "team_id", null: false
    t.bigint "league_id", null: false
    t.decimal "amount"
    t.string "description"
    t.string "payment_status"
    t.string "payment_method"
    t.datetime "transaction_date"
    t.string "payment_reference"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_transactions_on_league_id"
    t.index ["team_id"], name: "index_transactions_on_team_id"
  end

  add_foreign_key "league_teams", "leagues"
  add_foreign_key "league_teams", "teams"
  add_foreign_key "matches", "leagues"
  add_foreign_key "matches", "teams", column: "away_team_id"
  add_foreign_key "matches", "teams", column: "home_team_id"
  add_foreign_key "players", "teams"
  add_foreign_key "transactions", "leagues"
  add_foreign_key "transactions", "teams"
end
