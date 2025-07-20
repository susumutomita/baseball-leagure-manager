# frozen_string_literal: true

module Analytics
  class TrendCalculator
    attr_reader :errors

    def initialize
      @errors = []
    end

    # Calculate performance trend for a player
    def calculate_performance_trend(player, games: 10, season: nil)
      return nil unless valid_player?(player)

      stats = fetch_player_stats(player, season: season)
      return 'insufficient_data' if stats.count < games

      recent_stats = stats.limit(games)
      older_stats = stats.offset(games).limit(games)

      return 'insufficient_data' if older_stats.empty?

      trend_data = {
        player_id: player.id,
        player_name: player.name,
        recent_performance: calculate_period_metrics(recent_stats),
        previous_performance: calculate_period_metrics(older_stats),
        trend_direction: nil,
        improvement_areas: [],
        decline_areas: [],
        consistency_analysis: analyze_consistency(recent_stats)
      }

      # Determine overall trend
      trend_data[:trend_direction] = determine_trend_direction(
        trend_data[:recent_performance],
        trend_data[:previous_performance]
      )

      # Identify specific improvement/decline areas
      identify_performance_changes(trend_data)

      trend_data
    end

    # Calculate consistency score over a period
    def calculate_consistency(player, games: 20, season: nil)
      stats = fetch_player_stats(player, season: season).limit(games)
      
      return 0.0 if stats.count < 3

      metrics = [:batting_average, :on_base_percentage, :slugging_percentage]
      consistency_scores = {}

      metrics.each do |metric|
        values = stats.map do |stat|
          case metric
          when :batting_average
            stat.at_bats.zero? ? 0.0 : (stat.hits.to_f / stat.at_bats)
          when :on_base_percentage
            stat.on_base_percentage
          when :slugging_percentage
            stat.slugging_percentage
          end
        end

        consistency_scores[metric] = calculate_metric_consistency(values)
      end

      # Overall consistency is the average of individual metric consistencies
      overall_consistency = consistency_scores.values.sum.to_f / consistency_scores.count
      
      {
        overall_score: overall_consistency.round(3),
        metric_scores: consistency_scores,
        games_analyzed: stats.count,
        recommendation: consistency_recommendation(overall_consistency)
      }
    end

    # Identify breakout candidates based on recent trends
    def identify_breakout_candidates(team, min_games: 20, improvement_threshold: 0.05)
      candidates = []

      team.players.includes(:player_stats).each do |player|
        trend = calculate_performance_trend(player, games: 10)
        next if trend.nil? || trend == 'insufficient_data'

        recent_ops = trend[:recent_performance][:ops]
        previous_ops = trend[:previous_performance][:ops]

        improvement = (recent_ops - previous_ops) / previous_ops rescue 0

        if improvement > improvement_threshold
          consistency = calculate_consistency(player, games: min_games)
          
          candidates << {
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            improvement_percentage: (improvement * 100).round(2),
            recent_ops: recent_ops,
            previous_ops: previous_ops,
            consistency_score: consistency[:overall_score],
            trend_direction: trend[:trend_direction],
            key_improvements: trend[:improvement_areas]
          }
        end
      end

      candidates.sort_by { |c| -c[:improvement_percentage] }
    end

    # Predict future performance based on trends
    def predict_performance(player, games_ahead: 10)
      historical_stats = fetch_player_stats(player).limit(30)
      
      return nil if historical_stats.count < 20

      # Calculate rolling averages
      rolling_averages = calculate_rolling_averages(historical_stats, window: 5)
      
      # Simple linear regression for trend projection
      trend_slope = calculate_trend_slope(rolling_averages)
      
      current_metrics = calculate_period_metrics(historical_stats.limit(5))
      
      predictions = {}
      [:batting_average, :ops, :slugging_percentage].each do |metric|
        current_value = current_metrics[metric]
        predicted_change = trend_slope[metric] * games_ahead
        predicted_value = current_value + predicted_change
        
        # Bound predictions to reasonable ranges
        predicted_value = bound_prediction(metric, predicted_value)
        
        predictions[metric] = {
          current: current_value,
          predicted: predicted_value.round(3),
          change: (predicted_change * 100).round(2),
          confidence: calculate_prediction_confidence(historical_stats, metric)
        }
      end

      {
        player_id: player.id,
        player_name: player.name,
        predictions: predictions,
        games_ahead: games_ahead,
        based_on_games: historical_stats.count
      }
    end

    # Analyze team momentum
    def analyze_team_momentum(team, period_days: 30)
      end_date = Date.current
      start_date = end_date - period_days.days
      
      matches = team.matches
                    .completed
                    .where(scheduled_at: start_date..end_date)
                    .order(scheduled_at: :asc)

      return nil if matches.count < 5

      # Calculate win rate in periods
      periods = split_into_periods(matches, 3)
      win_rates = periods.map { |period| calculate_period_win_rate(team, period) }

      # Player performance trends
      player_trends = team.players.map do |player|
        trend = calculate_performance_trend(player, games: 10)
        next if trend.nil? || trend == 'insufficient_data'
        
        {
          player_name: player.name,
          trend_direction: trend[:trend_direction],
          recent_ops: trend[:recent_performance][:ops]
        }
      end.compact

      improving_players = player_trends.count { |t| t[:trend_direction] == 'improving' }
      declining_players = player_trends.count { |t| t[:trend_direction] == 'declining' }

      {
        team_id: team.id,
        team_name: team.name,
        period_win_rates: win_rates,
        momentum_direction: determine_momentum(win_rates),
        player_trends: {
          improving: improving_players,
          stable: player_trends.count - improving_players - declining_players,
          declining: declining_players
        },
        recent_form: matches.last(5).map { |m| m.winner == team ? 'W' : 'L' }.join('-'),
        recommendation: generate_momentum_recommendation(win_rates, player_trends)
      }
    end

    private

    def valid_player?(player)
      if player.nil? || !player.is_a?(Player)
        @errors << "Invalid player object"
        return false
      end
      true
    end

    def fetch_player_stats(player, season: nil)
      scope = player.player_stats.includes(:match)
      scope = scope.where(season_id: season.id) if season
      scope.order(created_at: :desc)
    end

    def calculate_period_metrics(stats)
      return default_metrics if stats.empty?

      total_at_bats = stats.sum(:at_bats)
      total_hits = stats.sum(:hits)
      total_walks = stats.sum(:walks)
      
      batting_avg = total_at_bats.zero? ? 0.0 : (total_hits.to_f / total_at_bats)
      
      # Calculate OBP
      obp_stats = stats.map(&:on_base_percentage).compact
      obp = obp_stats.any? ? (obp_stats.sum.to_f / obp_stats.count) : 0.0
      
      # Calculate SLG
      slg_stats = stats.map(&:slugging_percentage).compact
      slg = slg_stats.any? ? (slg_stats.sum.to_f / slg_stats.count) : 0.0

      {
        games: stats.count,
        batting_average: batting_avg.round(3),
        on_base_percentage: obp.round(3),
        slugging_percentage: slg.round(3),
        ops: (obp + slg).round(3),
        hits: total_hits,
        at_bats: total_at_bats,
        home_runs: stats.sum(:home_runs),
        rbis: stats.sum(:runs_batted_in),
        strikeouts: stats.sum(:strikeouts),
        walks: total_walks
      }
    end

    def default_metrics
      {
        games: 0,
        batting_average: 0.0,
        on_base_percentage: 0.0,
        slugging_percentage: 0.0,
        ops: 0.0,
        hits: 0,
        at_bats: 0,
        home_runs: 0,
        rbis: 0,
        strikeouts: 0,
        walks: 0
      }
    end

    def determine_trend_direction(recent, previous)
      ops_change = recent[:ops] - previous[:ops]
      avg_change = recent[:batting_average] - previous[:batting_average]
      
      significant_improvement = ops_change > 0.050 || avg_change > 0.020
      significant_decline = ops_change < -0.050 || avg_change < -0.020
      
      if significant_improvement
        'improving'
      elsif significant_decline
        'declining'
      else
        'stable'
      end
    end

    def identify_performance_changes(trend_data)
      recent = trend_data[:recent_performance]
      previous = trend_data[:previous_performance]
      
      metrics = [:batting_average, :on_base_percentage, :slugging_percentage, :home_runs, :strikeouts]
      
      metrics.each do |metric|
        change = recent[metric] - previous[metric]
        change_pct = previous[metric].zero? ? 0 : (change / previous[metric] * 100)
        
        if change_pct > 10
          trend_data[:improvement_areas] << {
            metric: metric,
            change: change,
            change_percentage: change_pct.round(2)
          }
        elsif change_pct < -10
          trend_data[:decline_areas] << {
            metric: metric,
            change: change,
            change_percentage: change_pct.round(2)
          }
        end
      end
    end

    def analyze_consistency(stats)
      game_scores = stats.map do |stat|
        next 0.0 if stat.at_bats.zero?
        
        # Simple game score: hits + walks - strikeouts
        score = stat.hits + stat.walks - stat.strikeouts
        score.to_f / stat.at_bats
      end
      
      consistency = calculate_metric_consistency(game_scores)
      
      {
        score: consistency,
        classification: classify_consistency(consistency),
        game_count: stats.count
      }
    end

    def calculate_metric_consistency(values)
      return 0.0 if values.count < 2
      
      mean = values.sum.to_f / values.count
      return 1.0 if mean.zero? && values.all?(&:zero?)
      
      variance = values.map { |v| (v - mean) ** 2 }.sum / values.count
      std_dev = Math.sqrt(variance)
      
      # Convert to 0-1 scale where 1 is most consistent
      # Lower std_dev relative to mean = higher consistency
      coefficient_of_variation = mean.zero? ? 1.0 : std_dev / mean.abs
      consistency = 1.0 - [coefficient_of_variation, 1.0].min
      
      consistency.round(3)
    end

    def classify_consistency(score)
      case score
      when 0.8..1.0
        'highly_consistent'
      when 0.6..0.8
        'consistent'
      when 0.4..0.6
        'moderately_consistent'
      when 0.2..0.4
        'inconsistent'
      else
        'highly_inconsistent'
      end
    end

    def consistency_recommendation(score)
      case score
      when 0.8..1.0
        "Excellent consistency. Player is reliable and performing steadily."
      when 0.6..0.8
        "Good consistency. Player shows reliable performance with minor variations."
      when 0.4..0.6
        "Moderate consistency. Focus on mental preparation and routine."
      when 0.2..0.4
        "Inconsistent performance. Consider adjustments to approach or training."
      else
        "Highly inconsistent. Significant intervention may be needed."
      end
    end

    def calculate_rolling_averages(stats, window: 5)
      averages = []
      
      (0..stats.count - window).each do |i|
        window_stats = stats.to_a[i, window]
        averages << calculate_period_metrics(window_stats)
      end
      
      averages
    end

    def calculate_trend_slope(rolling_averages)
      return {} if rolling_averages.count < 2
      
      slopes = {}
      [:batting_average, :ops, :slugging_percentage].each do |metric|
        values = rolling_averages.map { |avg| avg[metric] }
        slopes[metric] = simple_linear_regression_slope(values)
      end
      
      slopes
    end

    def simple_linear_regression_slope(values)
      n = values.count
      return 0.0 if n < 2
      
      x_values = (0...n).to_a
      x_mean = x_values.sum.to_f / n
      y_mean = values.sum.to_f / n
      
      numerator = x_values.zip(values).map { |x, y| (x - x_mean) * (y - y_mean) }.sum
      denominator = x_values.map { |x| (x - x_mean) ** 2 }.sum
      
      return 0.0 if denominator.zero?
      
      numerator / denominator
    end

    def bound_prediction(metric, value)
      case metric
      when :batting_average
        [[value, 0.0].max, 0.500].min
      when :ops
        [[value, 0.0].max, 2.000].min
      when :slugging_percentage
        [[value, 0.0].max, 1.500].min
      else
        value
      end
    end

    def calculate_prediction_confidence(stats, metric)
      # Simple confidence based on consistency and sample size
      consistency = calculate_metric_consistency(
        stats.limit(10).map { |s| s.send(metric) if s.respond_to?(metric) }.compact
      )
      
      sample_size_factor = [stats.count / 30.0, 1.0].min
      
      (consistency * sample_size_factor * 100).round(0)
    end

    def split_into_periods(matches, period_count)
      period_size = (matches.count.to_f / period_count).ceil
      matches.each_slice(period_size).to_a
    end

    def calculate_period_win_rate(team, matches)
      return 0.0 if matches.empty?
      
      wins = matches.count { |m| m.winner == team }
      (wins.to_f / matches.count).round(3)
    end

    def determine_momentum(win_rates)
      return 'neutral' if win_rates.count < 2
      
      recent = win_rates.last
      previous = win_rates[-2]
      
      if recent > previous + 0.1
        'positive'
      elsif recent < previous - 0.1
        'negative'
      else
        'neutral'
      end
    end

    def generate_momentum_recommendation(win_rates, player_trends)
      momentum = determine_momentum(win_rates)
      improving_ratio = player_trends.count > 0 ? 
        player_trends.count { |t| t[:trend_direction] == 'improving' }.to_f / player_trends.count : 0
      
      case momentum
      when 'positive'
        if improving_ratio > 0.5
          "Team showing strong positive momentum with majority of players improving. Maintain current strategies."
        else
          "Team results improving but individual performances mixed. Focus on consistency."
        end
      when 'negative'
        if improving_ratio < 0.3
          "Team struggling with both results and individual performances. Consider tactical changes."
        else
          "Individual improvements not translating to team results. Review team dynamics."
        end
      else
        "Team performance stable. Focus on incremental improvements."
      end
    end
  end
end