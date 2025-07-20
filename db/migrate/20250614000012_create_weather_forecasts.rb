class CreateWeatherForecasts < ActiveRecord::Migration[7.0]
  def change
    create_table :weather_forecasts do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :match, foreign_key: true
      t.string :location, null: false
      t.decimal :latitude, precision: 10, scale: 8
      t.decimal :longitude, precision: 11, scale: 8
      t.datetime :forecast_time, null: false
      t.string :weather_condition
      t.decimal :temperature_celsius
      t.decimal :feels_like_celsius
      t.decimal :humidity_percentage
      t.decimal :wind_speed_kmh
      t.string :wind_direction
      t.decimal :precipitation_mm
      t.decimal :precipitation_probability
      t.integer :visibility_meters
      t.integer :uv_index
      t.jsonb :raw_data, default: {}
      t.string :data_source
      t.datetime :fetched_at
      t.boolean :match_suitable, default: true
      t.text :ai_recommendation
      
      t.timestamps
    end
    
    add_index :weather_forecasts, [:organization_id, :match_id]
    add_index :weather_forecasts, [:latitude, :longitude, :forecast_time]
    add_index :weather_forecasts, :forecast_time
    add_index :weather_forecasts, :match_suitable
    add_index :weather_forecasts, [:match_id, :forecast_time], unique: true, where: "match_id IS NOT NULL"
  end
end