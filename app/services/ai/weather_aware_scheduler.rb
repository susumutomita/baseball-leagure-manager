module Ai
  class WeatherAwareScheduler
    attr_reader :organization, :weather_client, :openai_client

    def initialize(organization:)
      @organization = organization
      @weather_client = OpenWeather::Client.new(
        api_key: ENV.fetch('OPENWEATHER_API_KEY', ''),
        units: 'metric'
      )
      @openai_client = OpenAiClient.new(ENV.fetch('OPENAI_API_KEY', ''))
    end

    def check_match_weather(match)
      return { playable: true, confidence: 100, reason: 'No venue specified' } unless match.venue
      
      forecast = fetch_weather_forecast(match.venue, match.scheduled_at)
      analyze_weather_conditions(forecast)
    rescue => e
      Rails.logger.error "Weather check failed: #{e.message}"
      { playable: true, confidence: 50, reason: 'Weather data unavailable' }
    end

    def suggest_weather_optimal_dates(venue, start_date, end_date)
      dates = (start_date..end_date).to_a
      weather_scores = {}

      dates.each do |date|
        forecast = fetch_weather_forecast(venue, date.to_datetime)
        weather_scores[date] = calculate_weather_score(forecast)
      rescue => e
        Rails.logger.warn "Failed to fetch weather for #{date}: #{e.message}"
        weather_scores[date] = 50 # Default neutral score
      end

      weather_scores.sort_by { |_, score| -score }.first(5).to_h
    end

    def score_slots_by_weather(slots)
      weather_scores = {}

      slots.each do |slot|
        forecast = fetch_weather_forecast(slot[:venue], slot[:date])
        weather_scores[slot] = calculate_weather_score(forecast)
      rescue => e
        Rails.logger.warn "Failed to fetch weather for slot: #{e.message}"
        weather_scores[slot] = 50
      end

      weather_scores
    end

    def monitor_upcoming_matches(days_ahead: 7)
      upcoming_matches = Match.joins(:venue)
                              .where('scheduled_at BETWEEN ? AND ?', 
                                     Time.current, 
                                     days_ahead.days.from_now)
                              .includes(:venue, :home_team, :away_team)

      weather_alerts = []

      upcoming_matches.each do |match|
        weather_check = check_match_weather(match)
        
        if weather_check[:confidence] < 70 || !weather_check[:playable]
          weather_alerts << {
            match: match,
            weather_check: weather_check,
            severity: calculate_alert_severity(weather_check, match)
          }
        end
      end

      weather_alerts.sort_by { |alert| -alert[:severity] }
    end

    def generate_seasonal_weather_report(season)
      matches = season.matches.includes(:venue)
      weather_stats = {
        total_matches: matches.count,
        weather_affected: 0,
        postponement_predictions: 0,
        monthly_breakdown: {}
      }

      matches.group_by { |m| m.scheduled_at.month }.each do |month, month_matches|
        month_stats = analyze_month_weather(month_matches)
        weather_stats[:monthly_breakdown][month] = month_stats
        weather_stats[:weather_affected] += month_stats[:affected_count]
        weather_stats[:postponement_predictions] += month_stats[:high_risk_count]
      end

      weather_stats[:risk_percentage] = (weather_stats[:postponement_predictions].to_f / 
                                        weather_stats[:total_matches] * 100).round(2)
      
      # Add AI-powered weather insights
      weather_stats[:ai_insights] = generate_ai_weather_insights(weather_stats)
      weather_stats[:recommendations] = generate_weather_recommendations(weather_stats)
      
      weather_stats
    end

    private

    def fetch_weather_forecast(venue, datetime)
      return {} unless venue.geocoded?

      # Check if date is within forecast range (typically 5-7 days)
      days_ahead = (datetime.to_date - Date.current).to_i
      
      if days_ahead <= 5
        weather_client.forecast(lat: venue.latitude, lon: venue.longitude)
                      .list
                      .find { |item| item.dt_txt.to_datetime.to_date == datetime.to_date }
      else
        # For dates beyond forecast range, use historical patterns
        estimate_weather_from_historical(venue, datetime)
      end
    end

    def estimate_weather_from_historical(venue, datetime)
      # Simple estimation based on month
      month = datetime.month
      
      # Basic seasonal patterns (Northern Hemisphere)
      rain_probability = case month
                        when 4..5, 9..10 then 0.4  # Spring/Fall - higher rain
                        when 6..8 then 0.2          # Summer - less rain
                        when 12..2 then 0.3         # Winter
                        else 0.3
                        end

      {
        weather: [{ main: rain_probability > 0.3 ? 'Rain' : 'Clear' }],
        main: {
          temp: estimate_temperature(month),
          humidity: rain_probability * 100
        },
        wind: { speed: 10 },
        rain: rain_probability > 0.3 ? { '3h' => rain_probability * 10 } : nil
      }
    end

    def estimate_temperature(month)
      # Simple temperature estimation (Celsius)
      case month
      when 12..2 then 5   # Winter
      when 3..5 then 15   # Spring
      when 6..8 then 25   # Summer
      when 9..11 then 15  # Fall
      end
    end

    def analyze_weather_conditions(forecast)
      return { playable: true, confidence: 50, reason: 'No forecast data' } if forecast.nil? || forecast.empty?

      conditions = extract_conditions(forecast)
      
      # Evaluate each weather factor
      rain_impact = evaluate_rain(conditions[:rain_mm])
      wind_impact = evaluate_wind(conditions[:wind_speed])
      temp_impact = evaluate_temperature(conditions[:temperature])
      storm_impact = evaluate_storm(conditions[:weather_main])

      # Calculate overall playability
      impacts = [rain_impact, wind_impact, temp_impact, storm_impact]
      worst_impact = impacts.min_by { |i| i[:score] }
      average_score = impacts.sum { |i| i[:score] } / impacts.size

      playable = average_score >= 50
      confidence = calculate_confidence(forecast, conditions)
      
      {
        playable: playable,
        confidence: confidence,
        reason: worst_impact[:reason],
        details: {
          rain: rain_impact,
          wind: wind_impact,
          temperature: temp_impact,
          storm: storm_impact
        },
        raw_conditions: conditions
      }
    end

    def extract_conditions(forecast)
      {
        weather_main: forecast.dig(:weather, 0, :main) || 'Clear',
        weather_desc: forecast.dig(:weather, 0, :description) || '',
        temperature: forecast.dig(:main, :temp) || 20,
        humidity: forecast.dig(:main, :humidity) || 50,
        wind_speed: forecast.dig(:wind, :speed) || 0,
        rain_mm: forecast.dig(:rain, '3h') || 0
      }
    end

    def evaluate_rain(rain_mm)
      score, reason = case rain_mm
                     when 0...1 then [100, 'No rain expected']
                     when 1...5 then [80, 'Light rain possible']
                     when 5...10 then [40, 'Moderate rain expected']
                     when 10...20 then [20, 'Heavy rain likely']
                     else [0, 'Extreme rainfall expected']
                     end
      
      { score: score, reason: reason, value: rain_mm }
    end

    def evaluate_wind(wind_speed)
      # Wind speed in m/s
      score, reason = case wind_speed
                     when 0...5 then [100, 'Calm conditions']
                     when 5...10 then [90, 'Light breeze']
                     when 10...15 then [70, 'Moderate wind']
                     when 15...20 then [40, 'Strong wind']
                     else [10, 'Extreme wind conditions']
                     end
      
      { score: score, reason: reason, value: wind_speed }
    end

    def evaluate_temperature(temp)
      # Temperature in Celsius
      score, reason = case temp
                     when -10...0 then [30, 'Very cold conditions']
                     when 0...5 then [60, 'Cold conditions']
                     when 5...35 then [100, 'Good temperature']
                     when 35...40 then [70, 'Hot conditions']
                     else [30, 'Extreme temperature']
                     end
      
      { score: score, reason: reason, value: temp }
    end

    def evaluate_storm(weather_main)
      score, reason = case weather_main.downcase
                     when 'clear', 'clouds' then [100, 'Clear conditions']
                     when 'drizzle' then [85, 'Light drizzle']
                     when 'rain' then [60, 'Rain expected']
                     when 'thunderstorm' then [10, 'Thunderstorm warning']
                     when 'snow' then [20, 'Snow conditions']
                     else [90, 'Normal conditions']
                     end
      
      { score: score, reason: reason, value: weather_main }
    end

    def calculate_weather_score(forecast)
      return 50 if forecast.nil? || forecast.empty?
      
      conditions = extract_conditions(forecast)
      
      # Weight different factors
      rain_score = evaluate_rain(conditions[:rain_mm])[:score] * 0.4
      wind_score = evaluate_wind(conditions[:wind_speed])[:score] * 0.2
      temp_score = evaluate_temperature(conditions[:temperature])[:score] * 0.2
      storm_score = evaluate_storm(conditions[:weather_main])[:score] * 0.2
      
      rain_score + wind_score + temp_score + storm_score
    end

    def calculate_confidence(forecast, conditions)
      return 30 if forecast.nil? || forecast.empty?
      
      # Base confidence on data availability and forecast range
      base_confidence = 80
      
      # Reduce confidence for extreme conditions
      if conditions[:rain_mm] > 20 || conditions[:wind_speed] > 25
        base_confidence -= 20
      end
      
      # Add variance based on humidity (higher humidity = less predictable)
      humidity_factor = (100 - conditions[:humidity]) / 100.0 * 20
      
      [base_confidence + humidity_factor, 100].min.to_i
    end

    def calculate_alert_severity(weather_check, match)
      days_until_match = (match.scheduled_at.to_date - Date.current).to_i
      base_severity = 100 - weather_check[:confidence]
      
      # Increase severity for closer matches
      time_factor = case days_until_match
                   when 0 then 2.0    # Today
                   when 1 then 1.5    # Tomorrow
                   when 2..3 then 1.2 # This week
                   else 1.0
                   end
      
      # Consider match importance (if available)
      importance_factor = match.respond_to?(:importance) ? (match.importance || 1) : 1
      
      (base_severity * time_factor * importance_factor).to_i
    end

    def analyze_month_weather(matches)
      affected_count = 0
      high_risk_count = 0
      weather_conditions = []
      
      matches.each do |match|
        weather_check = check_match_weather(match)
        weather_conditions << weather_check
        
        affected_count += 1 if weather_check[:confidence] < 80
        high_risk_count += 1 if !weather_check[:playable] || weather_check[:confidence] < 50
      end
      
      {
        match_count: matches.count,
        affected_count: affected_count,
        high_risk_count: high_risk_count,
        average_confidence: weather_conditions.sum { |w| w[:confidence] } / weather_conditions.size.to_f,
        common_issues: identify_common_weather_issues(weather_conditions)
      }
    end

    def identify_common_weather_issues(weather_conditions)
      issues = Hash.new(0)
      
      weather_conditions.each do |condition|
        next unless condition[:details]
        
        condition[:details].each do |factor, impact|
          if impact[:score] < 70
            issues[impact[:reason]] += 1
          end
        end
      end
      
      issues.sort_by { |_, count| -count }.first(3).to_h
    end

    def generate_ai_weather_insights(weather_stats)
      prompt = <<~PROMPT
        草野球リーグの天候分析結果：
        
        総試合数: #{weather_stats[:total_matches]}
        天候影響試合数: #{weather_stats[:weather_affected]}
        延期予測試合数: #{weather_stats[:postponement_predictions]}
        リスク率: #{weather_stats[:risk_percentage]}%
        
        月別の状況:
        #{format_monthly_breakdown(weather_stats[:monthly_breakdown])}
        
        この天候データを分析し、以下について日本語でアドバイスをください：
        1. 特に注意すべき時期と理由
        2. 天候リスクを最小化するスケジュール戦略
        3. 屋外会場と屋内会場の活用方法
        4. 延期試合の効率的な再スケジュール方法
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_monthly_breakdown(monthly_breakdown)
      monthly_breakdown.map do |month, stats|
        month_name = Date::MONTHNAMES[month]
        "#{month}月: 試合数#{stats[:match_count]}, 影響#{stats[:affected_count]}, 高リスク#{stats[:high_risk_count]}"
      end.join("\n")
    end

    def generate_weather_recommendations(weather_stats)
      recommendations = []
      
      # High risk months
      high_risk_months = weather_stats[:monthly_breakdown].select { |_, stats| 
        stats[:high_risk_count].to_f / stats[:match_count] > 0.2 
      }
      
      if high_risk_months.any?
        recommendations << {
          type: 'schedule_adjustment',
          priority: 'high',
          suggestion: "#{high_risk_months.keys.join(', ')}月は天候リスクが高いため、予備日を多めに確保することを推奨します",
          affected_months: high_risk_months.keys
        }
      end
      
      # Indoor venue utilization
      if weather_stats[:risk_percentage] > 15
        recommendations << {
          type: 'venue_strategy',
          priority: 'medium',
          suggestion: '屋内会場の活用を増やすことで、天候による延期を減らすことができます',
          potential_reduction: estimate_indoor_impact(weather_stats)
        }
      end
      
      recommendations
    end

    def estimate_indoor_impact(weather_stats)
      # Estimate how many postponements could be avoided with more indoor venues
      outdoor_percentage = 0.8 # Assume 80% of venues are outdoor
      potential_reduction = (weather_stats[:postponement_predictions] * outdoor_percentage * 0.5).round
      
      {
        current_postponements: weather_stats[:postponement_predictions],
        potential_postponements: weather_stats[:postponement_predictions] - potential_reduction,
        reduction_percentage: (potential_reduction.to_f / weather_stats[:postponement_predictions] * 100).round(2)
      }
    end

    def analyze_weather_patterns_with_ai(venue, date_range)
      prompt = <<~PROMPT
        #{venue.name}での#{date_range.first}から#{date_range.last}までの期間の天候パターンを分析してください。
        
        会場情報:
        - タイプ: #{venue.outdoor? ? '屋外' : '屋内'}
        - 所在地: #{venue.address}
        
        この期間における以下の点について日本語で分析してください：
        1. 試合開催に最適な時間帯
        2. 避けるべき日程パターン
        3. 天候による観客動員への影響予測
        4. 予備日設定の推奨事項
      PROMPT

      openai_client.analyze(prompt)
    end
  end
end