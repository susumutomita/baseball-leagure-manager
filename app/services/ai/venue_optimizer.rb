module Ai
  class VenueOptimizer
    attr_reader :organization, :season, :openai_client

    def initialize(organization:, season: nil)
      @organization = organization
      @season = season
      @openai_client = OpenAiClient.new(ENV.fetch('OPENAI_API_KEY', ''))
    end

    def optimize_venue_allocation(matches)
      venue_assignments = {}
      unassigned_matches = []

      # Sort matches by priority (playoffs, rivalries, etc.)
      sorted_matches = prioritize_matches(matches)

      sorted_matches.each do |match|
        optimal_venue = find_optimal_venue(match)
        
        if optimal_venue
          venue_assignments[match.id] = {
            match: match,
            venue: optimal_venue[:venue],
            score: optimal_venue[:score],
            factors: optimal_venue[:factors]
          }
        else
          unassigned_matches << match
        end
      end

      # Try to resolve unassigned matches
      resolved_assignments = resolve_unassigned_matches(unassigned_matches, venue_assignments)
      
      result = {
        assignments: venue_assignments.merge(resolved_assignments),
        unassigned: unassigned_matches - resolved_assignments.keys.map { |id| matches.find { |m| m.id == id } },
        optimization_metrics: calculate_optimization_metrics(venue_assignments)
      }
      
      # Add AI-powered optimization insights
      result[:ai_insights] = generate_ai_venue_insights(result)
      result[:recommendations] = generate_venue_recommendations(result)
      
      result
    end

    def suggest_venue_improvements
      venues = organization.venues.includes(:matches, :venue_availabilities)
      improvements = []

      venues.each do |venue|
        utilization = calculate_venue_utilization(venue)
        accessibility_score = calculate_accessibility_score(venue)
        maintenance_needs = estimate_maintenance_needs(venue)

        if utilization < 30
          improvements << {
            venue: venue,
            type: 'underutilized',
            recommendation: 'Consider increasing marketing or reducing operational days',
            metrics: { utilization: utilization, potential_savings: estimate_savings(venue, utilization) }
          }
        elsif utilization > 90
          improvements << {
            venue: venue,
            type: 'overutilized',
            recommendation: 'Consider capacity expansion or scheduling limits',
            metrics: { utilization: utilization, wear_impact: calculate_wear_impact(venue) }
          }
        end

        if accessibility_score < 70
          improvements << {
            venue: venue,
            type: 'accessibility',
            recommendation: 'Improve transportation options or parking facilities',
            metrics: { accessibility_score: accessibility_score, impact_on_attendance: estimate_attendance_impact(accessibility_score) }
          }
        end

        if maintenance_needs[:priority] == 'high'
          improvements << {
            venue: venue,
            type: 'maintenance',
            recommendation: maintenance_needs[:recommendation],
            metrics: maintenance_needs[:metrics]
          }
        end
      end

      sorted_improvements = improvements.sort_by { |i| -i[:metrics].values.first }
      
      # Add AI-powered improvement analysis
      ai_analysis = analyze_venue_improvements_with_ai(sorted_improvements)
      
      {
        improvements: sorted_improvements,
        ai_analysis: ai_analysis,
        prioritized_actions: generate_prioritized_actions(sorted_improvements, ai_analysis)
      }
    end

    def balance_venue_usage
      venues = organization.venues.includes(:matches)
      current_distribution = calculate_current_distribution(venues)
      target_distribution = calculate_target_distribution(venues)
      
      reallocation_plan = []

      venues.each do |venue|
        current_usage = current_distribution[venue.id]
        target_usage = target_distribution[venue.id]
        
        if current_usage > target_usage + 5 # Over 5% above target
          matches_to_move = venue.matches
                                 .where(season: season)
                                 .order(scheduled_at: :desc)
                                 .limit((current_usage - target_usage) / 2)
          
          matches_to_move.each do |match|
            alternative_venue = find_underutilized_venue(venues, current_distribution, target_distribution, match)
            if alternative_venue
              reallocation_plan << {
                match: match,
                from_venue: venue,
                to_venue: alternative_venue,
                impact: calculate_reallocation_impact(match, venue, alternative_venue)
              }
            end
          end
        end
      end

      {
        current_distribution: current_distribution,
        target_distribution: target_distribution,
        reallocation_plan: reallocation_plan,
        expected_improvement: calculate_expected_improvement(reallocation_plan, current_distribution)
      }
    end

    def analyze_travel_efficiency
      teams = season ? season.teams : organization.teams
      travel_analysis = {}

      teams.each do |team|
        matches = team.matches.includes(:venue).where(season: season)
        travel_distances = calculate_team_travel_distances(team, matches)
        
        travel_analysis[team.id] = {
          team: team,
          total_distance: travel_distances[:total],
          average_distance: travel_distances[:average],
          longest_trip: travel_distances[:longest],
          venue_frequency: calculate_venue_frequency(team, matches),
          optimization_potential: calculate_travel_optimization_potential(team, matches)
        }
      end

      {
        team_analysis: travel_analysis,
        league_average: calculate_league_travel_average(travel_analysis),
        fairness_index: calculate_travel_fairness_index(travel_analysis),
        recommendations: generate_travel_recommendations(travel_analysis)
      }
    end

    private

    def prioritize_matches(matches)
      matches.sort_by do |match|
        priority = 0
        
        # Playoff matches get highest priority
        priority += 100 if match.match_type == 'playoff'
        
        # Expected high attendance
        priority += (match.expected_attendance || 0) / 100
        
        # Weekend matches
        priority += 20 if [0, 6].include?(match.scheduled_at.wday)
        
        # Prime time slots
        priority += 10 if (18..20).include?(match.scheduled_at.hour)
        
        -priority # Negative for descending sort
      end
    end

    def find_optimal_venue(match)
      available_venues = organization.venues.select do |venue|
        venue.available_on?(match.scheduled_at.to_date) &&
        venue.capacity >= (match.expected_attendance || 500)
      end

      return nil if available_venues.empty?

      venue_scores = available_venues.map do |venue|
        score, factors = calculate_venue_score(venue, match)
        {
          venue: venue,
          score: score,
          factors: factors
        }
      end

      venue_scores.max_by { |vs| vs[:score] }
    end

    def calculate_venue_score(venue, match)
      factors = {}
      
      # Capacity fit (prefer venues that match expected attendance)
      capacity_ratio = (match.expected_attendance || 1000).to_f / venue.capacity
      factors[:capacity_fit] = case capacity_ratio
                              when 0.7..0.9 then 100
                              when 0.5..0.7, 0.9..1.0 then 80
                              when 0.3..0.5 then 60
                              else 40
                              end

      # Location accessibility for both teams
      home_distance = calculate_team_venue_distance(match.home_team, venue)
      away_distance = calculate_team_venue_distance(match.away_team, venue)
      total_distance = home_distance + away_distance
      
      factors[:travel_efficiency] = case total_distance
                                   when 0..50 then 100
                                   when 50..100 then 80
                                   when 100..200 then 60
                                   else 40
                                   end

      # Venue quality and facilities
      factors[:facilities] = evaluate_venue_facilities(venue, match)

      # Historical performance
      factors[:historical] = calculate_historical_performance(venue, match.home_team, match.away_team)

      # Weather suitability
      if venue.outdoor?
        weather_scheduler = WeatherAwareScheduler.new(organization: organization)
        weather_score = weather_scheduler.score_slots_by_weather([{
          venue: venue,
          date: match.scheduled_at
        }]).values.first || 50
        factors[:weather] = weather_score
      else
        factors[:weather] = 100 # Indoor venues are weather-proof
      end

      # Calculate weighted total score
      weights = {
        capacity_fit: 0.25,
        travel_efficiency: 0.25,
        facilities: 0.20,
        historical: 0.15,
        weather: 0.15
      }

      total_score = factors.sum { |factor, score| score * weights[factor] }
      
      [total_score, factors]
    end

    def calculate_team_venue_distance(team, venue)
      return 0 unless team.respond_to?(:home_venue) && team.home_venue&.geocoded? && venue.geocoded?
      
      team.home_venue.distance_from(venue) || 50 # Default 50km if calculation fails
    end

    def evaluate_venue_facilities(venue, match)
      score = 70 # Base score
      
      facilities = venue.facilities || {}
      
      # Check for required facilities
      score += 10 if facilities['lighting'] && match.scheduled_at.hour >= 18
      score += 5 if facilities['parking_spaces'].to_i >= (match.expected_attendance || 0) / 3
      score += 5 if facilities['concessions']
      score += 5 if facilities['electronic_scoreboard']
      score += 5 if facilities['locker_rooms'].to_i >= 2
      
      [score, 100].min
    end

    def calculate_historical_performance(venue, home_team, away_team)
      # Look at past match results and attendance at this venue
      past_matches = Match.where(venue: venue)
                          .where('home_team_id IN (?) OR away_team_id IN (?)', 
                                 [home_team.id, away_team.id], 
                                 [home_team.id, away_team.id])
                          .limit(10)

      return 70 if past_matches.empty? # Neutral score if no history

      attendance_average = past_matches.average(:actual_attendance) || 0
      venue_capacity = venue.capacity
      
      attendance_ratio = attendance_average / venue_capacity.to_f
      
      case attendance_ratio
      when 0.8..1.0 then 100
      when 0.6..0.8 then 85
      when 0.4..0.6 then 70
      else 50
      end
    end

    def resolve_unassigned_matches(unassigned_matches, existing_assignments)
      resolved = {}
      
      unassigned_matches.each do |match|
        # Try time slot adjustments
        alternative_slots = find_alternative_time_slots(match)
        
        alternative_slots.each do |slot|
          venue = find_venue_for_slot(match, slot)
          if venue
            resolved[match.id] = {
              match: match,
              venue: venue,
              new_time: slot,
              score: 60, # Lower score for compromised assignment
              factors: { rescheduled: true }
            }
            break
          end
        end
      end
      
      resolved
    end

    def find_alternative_time_slots(match)
      base_date = match.scheduled_at
      slots = []
      
      # Try different times on the same day
      [10, 13, 16, 19].each do |hour|
        slot = base_date.change(hour: hour)
        slots << slot unless slot == base_date
      end
      
      # Try adjacent days
      [-1, 1].each do |day_offset|
        [13, 16, 19].each do |hour|
          slots << base_date + day_offset.days + hour.hours
        end
      end
      
      slots
    end

    def find_venue_for_slot(match, slot)
      organization.venues.find do |venue|
        venue.available_on?(slot.to_date, slot, slot + 3.hours) &&
        venue.capacity >= (match.expected_attendance || 500) &&
        !venue_has_conflict?(venue, slot)
      end
    end

    def venue_has_conflict?(venue, slot)
      Match.where(venue: venue)
           .where('scheduled_at BETWEEN ? AND ?', slot - 3.hours, slot + 3.hours)
           .exists?
    end

    def calculate_venue_utilization(venue)
      return 0 unless season
      
      total_available_slots = venue.venue_availabilities
                                   .where('available_date BETWEEN ? AND ?', season.start_date, season.end_date)
                                   .available
                                   .count
      
      return 0 if total_available_slots.zero?
      
      used_slots = venue.matches.where(season: season).count
      
      (used_slots.to_f / total_available_slots * 100).round(2)
    end

    def calculate_accessibility_score(venue)
      score = 50 # Base score
      
      # Location factors
      score += 20 if venue.near_public_transport?
      score += 15 if venue.parking_available?
      score += 15 if venue.wheelchair_accessible?
      
      score
    end

    def estimate_maintenance_needs(venue)
      matches_count = venue.matches.where('scheduled_at > ?', 6.months.ago).count
      age_factor = venue.created_at < 5.years.ago ? 1.5 : 1.0
      
      wear_score = matches_count * age_factor
      
      if wear_score > 100
        {
          priority: 'high',
          recommendation: 'Schedule immediate maintenance inspection',
          metrics: { wear_score: wear_score, estimated_cost: wear_score * 100 }
        }
      elsif wear_score > 50
        {
          priority: 'medium',
          recommendation: 'Plan maintenance within next month',
          metrics: { wear_score: wear_score, estimated_cost: wear_score * 50 }
        }
      else
        {
          priority: 'low',
          recommendation: 'Regular maintenance sufficient',
          metrics: { wear_score: wear_score, estimated_cost: wear_score * 25 }
        }
      end
    end

    def calculate_current_distribution(venues)
      total_matches = season ? season.matches.count : Match.count
      distribution = {}
      
      venues.each do |venue|
        match_count = season ? venue.matches.where(season: season).count : venue.matches.count
        distribution[venue.id] = (match_count.to_f / total_matches * 100).round(2)
      end
      
      distribution
    end

    def calculate_target_distribution(venues)
      # Ideal distribution based on venue capacity and quality
      total_capacity = venues.sum(&:capacity)
      distribution = {}
      
      venues.each do |venue|
        base_percentage = (venue.capacity.to_f / total_capacity * 100)
        
        # Adjust based on venue quality
        quality_factor = calculate_venue_quality_factor(venue)
        distribution[venue.id] = (base_percentage * quality_factor).round(2)
      end
      
      # Normalize to 100%
      total = distribution.values.sum
      distribution.transform_values { |v| (v / total * 100).round(2) }
    end

    def calculate_venue_quality_factor(venue)
      factors = []
      
      factors << (venue.capacity > 5000 ? 1.2 : 1.0)
      factors << (venue.facilities&.any? ? 1.1 : 0.9)
      factors << (venue.created_at > 2.years.ago ? 1.1 : 1.0) # Newer venues
      
      factors.sum / factors.size
    end

    def find_underutilized_venue(venues, current_dist, target_dist, match)
      venues.find do |venue|
        current_dist[venue.id] < target_dist[venue.id] - 5 &&
        venue.available_on?(match.scheduled_at.to_date) &&
        venue.capacity >= (match.expected_attendance || 500)
      end
    end

    def calculate_reallocation_impact(match, from_venue, to_venue)
      travel_impact = calculate_team_venue_distance(match.home_team, to_venue) +
                     calculate_team_venue_distance(match.away_team, to_venue) -
                     calculate_team_venue_distance(match.home_team, from_venue) -
                     calculate_team_venue_distance(match.away_team, from_venue)
      
      capacity_impact = (to_venue.capacity - from_venue.capacity).to_f / from_venue.capacity * 100
      
      {
        travel_change_km: travel_impact.round(2),
        capacity_change_percent: capacity_impact.round(2),
        estimated_attendance_impact: estimate_attendance_change(match, from_venue, to_venue)
      }
    end

    def estimate_attendance_change(match, from_venue, to_venue)
      base_attendance = match.expected_attendance || 1000
      
      # Distance factor
      distance_change = calculate_average_fan_distance_change(match, from_venue, to_venue)
      distance_impact = distance_change * -2 # Each km reduces attendance by 2
      
      # Capacity factor
      capacity_factor = to_venue.capacity > from_venue.capacity ? 5 : -5
      
      (base_attendance * (100 + distance_impact + capacity_factor) / 100).round
    end

    def calculate_average_fan_distance_change(match, from_venue, to_venue)
      # Simplified: assume fans are centered around team locations
      home_change = calculate_team_venue_distance(match.home_team, to_venue) -
                   calculate_team_venue_distance(match.home_team, from_venue)
      away_change = calculate_team_venue_distance(match.away_team, to_venue) -
                   calculate_team_venue_distance(match.away_team, from_venue)
      
      (home_change + away_change) / 2
    end

    def calculate_expected_improvement(reallocation_plan, current_distribution)
      return 0 if reallocation_plan.empty?
      
      # Simulate the distribution after reallocation
      simulated_distribution = current_distribution.dup
      
      reallocation_plan.each do |plan|
        from_id = plan[:from_venue].id
        to_id = plan[:to_venue].id
        
        simulated_distribution[from_id] -= 1
        simulated_distribution[to_id] += 1
      end
      
      # Calculate variance reduction
      current_variance = calculate_distribution_variance(current_distribution)
      simulated_variance = calculate_distribution_variance(simulated_distribution)
      
      improvement = ((current_variance - simulated_variance) / current_variance * 100).round(2)
      [improvement, 0].max # Ensure non-negative
    end

    def calculate_distribution_variance(distribution)
      values = distribution.values
      mean = values.sum / values.size.to_f
      
      variance = values.sum { |v| (v - mean) ** 2 } / values.size
      Math.sqrt(variance)
    end

    def calculate_optimization_metrics(assignments)
      return {} if assignments.empty?
      
      total_score = assignments.values.sum { |a| a[:score] }
      average_score = total_score / assignments.size.to_f
      
      factor_averages = {}
      assignments.values.first[:factors].keys.each do |factor|
        factor_sum = assignments.values.sum { |a| a[:factors][factor] || 0 }
        factor_averages[factor] = (factor_sum / assignments.size.to_f).round(2)
      end
      
      {
        total_assignments: assignments.size,
        average_score: average_score.round(2),
        factor_averages: factor_averages,
        optimization_quality: calculate_optimization_quality(average_score)
      }
    end

    def calculate_optimization_quality(average_score)
      case average_score
      when 90..100 then 'Excellent'
      when 75..90 then 'Good'
      when 60..75 then 'Fair'
      else 'Needs Improvement'
      end
    end

    def calculate_team_travel_distances(team, matches)
      distances = []
      total = 0
      
      sorted_matches = matches.order(:scheduled_at)
      
      sorted_matches.each_cons(2) do |match1, match2|
        if match1.venue && match2.venue && match1.venue.geocoded? && match2.venue.geocoded?
          distance = match1.venue.distance_from(match2.venue) || 0
          distances << distance
          total += distance
        end
      end
      
      {
        total: total.round(2),
        average: distances.any? ? (total / distances.size).round(2) : 0,
        longest: distances.max || 0,
        distances: distances
      }
    end

    def calculate_venue_frequency(team, matches)
      matches.group_by(&:venue).transform_values(&:count).sort_by { |_, count| -count }.to_h
    end

    def calculate_travel_optimization_potential(team, matches)
      current_distances = calculate_team_travel_distances(team, matches)
      
      # Simulate optimal routing (simplified: group by nearby venues)
      optimized_matches = matches.sort_by { |m| [m.venue&.latitude || 0, m.venue&.longitude || 0] }
      optimized_distances = calculate_team_travel_distances(team, optimized_matches)
      
      potential_saving = current_distances[:total] - optimized_distances[:total]
      saving_percentage = current_distances[:total] > 0 ? (potential_saving / current_distances[:total] * 100).round(2) : 0
      
      {
        current_total_km: current_distances[:total],
        optimized_total_km: optimized_distances[:total],
        potential_saving_km: potential_saving.round(2),
        saving_percentage: saving_percentage
      }
    end

    def calculate_league_travel_average(travel_analysis)
      total_distance = travel_analysis.values.sum { |ta| ta[:total_distance] }
      total_teams = travel_analysis.size
      
      total_teams > 0 ? (total_distance / total_teams).round(2) : 0
    end

    def calculate_travel_fairness_index(travel_analysis)
      distances = travel_analysis.values.map { |ta| ta[:total_distance] }
      return 100 if distances.empty? || distances.uniq.size == 1
      
      mean = distances.sum / distances.size.to_f
      variance = distances.sum { |d| (d - mean) ** 2 } / distances.size
      std_dev = Math.sqrt(variance)
      
      # Coefficient of variation (lower is more fair)
      cv = std_dev / mean
      
      # Convert to 0-100 scale (0 = very unfair, 100 = very fair)
      fairness = [100 - (cv * 100), 0].max
      fairness.round(2)
    end

    def generate_travel_recommendations(travel_analysis)
      recommendations = []
      league_average = calculate_league_travel_average(travel_analysis)
      
      travel_analysis.each do |team_id, analysis|
        if analysis[:total_distance] > league_average * 1.3
          recommendations << {
            team_id: team_id,
            type: 'high_travel',
            message: "Consider scheduling more home matches or matches at nearby venues",
            potential_saving: analysis[:optimization_potential][:potential_saving_km]
          }
        end
        
        if analysis[:optimization_potential][:saving_percentage] > 20
          recommendations << {
            team_id: team_id,
            type: 'routing_optimization',
            message: "Match sequence can be optimized to reduce travel by #{analysis[:optimization_potential][:saving_percentage]}%",
            details: analysis[:optimization_potential]
          }
        end
      end
      
      recommendations.sort_by { |r| -r[:potential_saving].to_f }
    end

    def estimate_savings(venue, utilization)
      # Rough estimation of operational savings
      base_operational_cost = 10000 # Monthly base cost
      variable_cost_per_match = 500
      
      current_matches = venue.matches.where('scheduled_at > ?', 1.month.ago).count
      optimal_matches = (current_matches * 0.5).round # Reduce by 50% if underutilized
      
      savings = (current_matches - optimal_matches) * variable_cost_per_match
      savings += base_operational_cost * 0.3 if utilization < 20 # 30% of base cost if very low utilization
      
      savings.round
    end

    def calculate_wear_impact(venue)
      matches_per_month = venue.matches.where('scheduled_at > ?', 1.month.ago).count
      
      case matches_per_month
      when 0..10 then 'Low'
      when 11..20 then 'Medium'
      when 21..30 then 'High'
      else 'Critical'
      end
    end

    def estimate_attendance_impact(accessibility_score)
      # Rough estimation: each 10 points below 100 reduces attendance by 5%
      reduction_percentage = ((100 - accessibility_score) / 10 * 5).round
      "Estimated #{reduction_percentage}% attendance reduction"
    end

    def generate_ai_venue_insights(optimization_result)
      prompt = <<~PROMPT
        会場割り当て最適化の結果を分析してください：
        
        割り当て済み試合数: #{optimization_result[:assignments].count}
        未割り当て試合数: #{optimization_result[:unassigned].count}
        平均最適化スコア: #{optimization_result[:optimization_metrics][:average_score]}
        
        以下の観点から日本語で分析してください：
        1. 会場割り当ての効率性
        2. チームと観客の移動負担
        3. 会場の稼働率バランス
        4. 改善可能な点と具体的な提案
      PROMPT

      openai_client.analyze(prompt)
    end

    def generate_venue_recommendations(optimization_result)
      recommendations = []
      
      if optimization_result[:unassigned].any?
        recommendations << {
          type: 'capacity_shortage',
          priority: 'high',
          suggestion: "会場不足により#{optimization_result[:unassigned].count}試合が未割り当てです。新会場の確保または日程調整が必要です。",
          affected_matches: optimization_result[:unassigned].map(&:id)
        }
      end
      
      low_score_assignments = optimization_result[:assignments].select { |_, a| a[:score] < 60 }
      if low_score_assignments.any?
        recommendations << {
          type: 'suboptimal_assignments',
          priority: 'medium',
          suggestion: "#{low_score_assignments.count}試合の会場割り当てが最適ではありません。代替会場の検討を推奨します。",
          affected_matches: low_score_assignments.keys
        }
      end
      
      recommendations
    end

    def analyze_venue_improvements_with_ai(improvements)
      return {} if improvements.empty?
      
      improvement_summary = improvements.group_by { |i| i[:type] }.transform_values(&:count)
      
      prompt = <<~PROMPT
        会場改善提案の分析：
        
        改善が必要な会場数: #{improvements.count}
        
        問題の内訳:
        #{improvement_summary.map { |type, count| "- #{translate_improvement_type(type)}: #{count}件" }.join("\n")}
        
        これらの会場改善提案について、以下を日本語で分析してください：
        1. 最優先で取り組むべき改善点
        2. コスト効果の高い改善策
        3. 短期と長期の実施計画
        4. 予算配分の推奨
      PROMPT

      openai_client.analyze(prompt)
    end

    def translate_improvement_type(type)
      {
        'underutilized' => '利用率低下',
        'overutilized' => '過度利用',
        'accessibility' => 'アクセス性',
        'maintenance' => 'メンテナンス'
      }[type] || type
    end

    def generate_prioritized_actions(improvements, ai_analysis)
      # Combine improvement data with AI insights to create prioritized action plan
      actions = []
      
      # Group by venue to avoid duplicate actions
      venue_improvements = improvements.group_by { |i| i[:venue].id }
      
      venue_improvements.each do |venue_id, venue_issues|
        venue = venue_issues.first[:venue]
        priority_score = calculate_venue_priority_score(venue_issues)
        
        actions << {
          venue: venue,
          issues: venue_issues.map { |i| i[:type] },
          priority_score: priority_score,
          recommended_actions: generate_venue_specific_actions(venue, venue_issues),
          estimated_cost: estimate_improvement_cost(venue_issues),
          expected_roi: calculate_expected_roi(venue, venue_issues)
        }
      end
      
      actions.sort_by { |a| -a[:priority_score] }
    end

    def calculate_venue_priority_score(issues)
      score = 0
      
      issues.each do |issue|
        case issue[:type]
        when 'maintenance'
          score += 40 # High priority for safety
        when 'accessibility'
          score += 30 # Important for attendance
        when 'overutilized'
          score += 25 # Risk of wear and tear
        when 'underutilized'
          score += 20 # Financial efficiency
        end
      end
      
      score
    end

    def generate_venue_specific_actions(venue, issues)
      actions = []
      
      issues.each do |issue|
        case issue[:type]
        when 'underutilized'
          actions << "マーケティング強化または運営日数の削減"
        when 'overutilized'
          actions << "使用制限の設定または設備拡張の検討"
        when 'accessibility'
          actions << "駐車場の拡張または公共交通アクセスの改善"
        when 'maintenance'
          actions << "緊急メンテナンスの実施"
        end
      end
      
      actions
    end

    def estimate_improvement_cost(issues)
      total_cost = 0
      
      issues.each do |issue|
        case issue[:type]
        when 'maintenance'
          total_cost += issue[:metrics][:estimated_cost] || 50000
        when 'accessibility'
          total_cost += 100000 # Rough estimate for parking/access improvements
        when 'overutilized'
          total_cost += 200000 # Capacity expansion
        when 'underutilized'
          total_cost += 10000 # Marketing costs
        end
      end
      
      total_cost
    end

    def calculate_expected_roi(venue, issues)
      # Simple ROI calculation based on potential improvements
      potential_revenue_increase = 0
      cost_savings = 0
      
      issues.each do |issue|
        case issue[:type]
        when 'underutilized'
          cost_savings += issue[:metrics][:potential_savings] || 0
        when 'accessibility'
          # Assume 10% attendance increase with better access
          avg_attendance = venue.matches.average(:actual_attendance) || 1000
          potential_revenue_increase += avg_attendance * 0.1 * 1000 # ¥1000 per ticket
        end
      end
      
      {
        annual_revenue_increase: potential_revenue_increase * 20, # Assume 20 matches/year
        annual_cost_savings: cost_savings * 12,
        payback_period_months: estimate_improvement_cost(issues) / ((potential_revenue_increase * 20 + cost_savings * 12) / 12.0)
      }
    end
  end
end