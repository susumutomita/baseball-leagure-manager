module Ai
  class SmartScheduler
    attr_reader :organization, :season, :matches, :openai_client

    def initialize(organization:, season:)
      @organization = organization
      @season = season
      @matches = season.matches.includes(:home_team, :away_team, :venue)
      @openai_client = OpenAiClient.new(ENV.fetch('OPENAI_API_KEY', ''))
    end

    def optimize_schedule
      conflicts = detect_conflicts
      
      # Get AI-powered optimization suggestions
      ai_suggestions = generate_ai_optimization_plan(conflicts)
      
      resolved_matches = resolve_conflicts(conflicts, ai_suggestions)
      
      apply_schedule_changes(resolved_matches)
      generate_comprehensive_report(ai_suggestions)
    end

    def suggest_reschedule(match, reason: nil)
      available_slots = find_available_slots(match)
      optimal_slot = select_optimal_slot(match, available_slots)
      
      {
        match: match,
        original_date: match.scheduled_at,
        suggested_date: optimal_slot[:date],
        suggested_venue: optimal_slot[:venue],
        reason: reason,
        confidence_score: calculate_confidence_score(optimal_slot)
      }
    end

    private

    def detect_conflicts
      conflicts = []
      
      matches.each_with_index do |match, index|
        matches[(index + 1)..-1].each do |other_match|
          if venue_conflict?(match, other_match)
            conflicts << create_conflict(match, other_match, 'venue_overlap')
          end
          
          if team_conflict?(match, other_match)
            conflicts << create_conflict(match, other_match, 'team_overlap')
          end
          
          if travel_constraint_violated?(match, other_match)
            conflicts << create_conflict(match, other_match, 'travel_distance')
          end
        end
      end
      
      conflicts
    end

    def venue_conflict?(match1, match2)
      return false unless match1.venue_id == match2.venue_id
      
      time_overlap?(match1.scheduled_at, match2.scheduled_at)
    end

    def team_conflict?(match1, match2)
      teams1 = [match1.home_team_id, match1.away_team_id]
      teams2 = [match2.home_team_id, match2.away_team_id]
      
      return false unless (teams1 & teams2).any?
      
      time_overlap?(match1.scheduled_at, match2.scheduled_at)
    end

    def time_overlap?(time1, time2, buffer_hours = 3)
      (time1 - time2).abs < buffer_hours.hours
    end

    def travel_constraint_violated?(match1, match2)
      return false unless same_team_consecutive_matches?(match1, match2)
      
      travel_time = calculate_travel_time(match1.venue, match2.venue)
      time_between = (match2.scheduled_at - match1.scheduled_at).abs
      
      travel_time > time_between - 1.hour # 1 hour buffer for preparation
    end

    def same_team_consecutive_matches?(match1, match2)
      teams1 = [match1.home_team_id, match1.away_team_id]
      teams2 = [match2.home_team_id, match2.away_team_id]
      
      (teams1 & teams2).any? && consecutive_days?(match1.scheduled_at, match2.scheduled_at)
    end

    def consecutive_days?(date1, date2)
      (date1.to_date - date2.to_date).abs == 1
    end

    def calculate_travel_time(venue1, venue2)
      return 0.hours if venue1.id == venue2.id
      
      distance = venue1.distance_from(venue2) || 50 # Default 50km if geocoding fails
      average_speed = 60 # km/h
      
      (distance / average_speed).hours
    end

    def create_conflict(match, conflicting_match, type)
      ScheduleConflict.find_or_create_by(
        match: match,
        conflicting_match: conflicting_match,
        conflict_type: type
      ) do |conflict|
        conflict.resolution_status = 'pending'
      end
    end

    def resolve_conflicts(conflicts, ai_suggestions = nil)
      # Use ConflictResolver for advanced conflict resolution
      conflict_resolver = ConflictResolver.new(organization: organization, season: season)
      resolution_result = conflict_resolver.resolve_conflicts(conflicts)
      
      # Convert resolution results to match changes
      resolved_matches = []
      
      resolution_result[:resolutions].each do |resolution|
        if resolution[:status] == :resolved
          resolved_matches << {
            match: resolution[:conflict].match,
            changes: extract_changes_from_resolution(resolution),
            conflict: resolution[:conflict]
          }
        end
      end
      
      resolved_matches
    end

    def resolve_venue_conflicts(conflicts)
      conflicts.map do |conflict|
        # Try to find alternative venue first
        alternative_venue = find_alternative_venue(conflict.match)
        
        if alternative_venue
          {
            match: conflict.match,
            changes: { venue_id: alternative_venue.id },
            conflict: conflict
          }
        else
          # Reschedule to different time
          new_time = find_available_time_slot(conflict.match)
          {
            match: conflict.match,
            changes: { scheduled_at: new_time },
            conflict: conflict
          }
        end
      end
    end

    def find_alternative_venue(match)
      required_capacity = match.expected_attendance || 1000
      
      organization.venues
        .available_on(match.scheduled_at.to_date)
        .by_capacity(required_capacity)
        .where.not(id: match.venue_id)
        .order(capacity: :asc)
        .first
    end

    def find_available_time_slot(match)
      base_date = match.scheduled_at.to_date
      time_slots = generate_time_slots(base_date)
      
      time_slots.find do |slot|
        !venue_occupied?(match.venue, slot) && !team_busy?(match, slot)
      end || match.scheduled_at + 1.day
    end

    def generate_time_slots(date)
      slots = []
      7.times do |day_offset|
        [10, 13, 16, 19].each do |hour|
          slots << (date + day_offset.days).to_datetime.change(hour: hour)
        end
      end
      slots
    end

    def venue_occupied?(venue, time)
      venue.matches.where(
        scheduled_at: (time - 3.hours)..(time + 3.hours)
      ).exists?
    end

    def team_busy?(match, time)
      Match.where(
        'scheduled_at BETWEEN ? AND ? AND (home_team_id IN (?) OR away_team_id IN (?))',
        time - 3.hours,
        time + 3.hours,
        [match.home_team_id, match.away_team_id],
        [match.home_team_id, match.away_team_id]
      ).where.not(id: match.id).exists?
    end

    def find_available_slots(match)
      slots = []
      start_date = Date.current
      end_date = season.end_date
      
      (start_date..end_date).each do |date|
        organization.venues.each do |venue|
          if venue.available_on?(date) && !venue_occupied?(venue, date.to_datetime)
            slots << {
              date: date.to_datetime,
              venue: venue,
              score: calculate_slot_score(match, date, venue)
            }
          end
        end
      end
      
      slots.sort_by { |s| -s[:score] }.first(10)
    end

    def calculate_slot_score(match, date, venue)
      score = 100
      
      # Prefer original date
      days_difference = (date - match.scheduled_at.to_date).abs
      score -= days_difference * 5
      
      # Prefer venues with appropriate capacity
      capacity_difference = (venue.capacity - (match.expected_attendance || 1000)).abs
      score -= capacity_difference / 100
      
      # Consider travel distance for teams
      if match.venue
        distance = venue.distance_from(match.venue) || 0
        score -= distance / 10
      end
      
      score
    end

    def select_optimal_slot(match, available_slots)
      return available_slots.first if available_slots.one?
      
      # Use AI to select best slot based on multiple factors
      weather_scores = WeatherAwareScheduler.new(organization: organization)
                                           .score_slots_by_weather(available_slots)
      
      available_slots.max_by do |slot|
        slot[:score] + (weather_scores[slot] || 0)
      end
    end

    def calculate_confidence_score(slot)
      base_score = slot[:score]
      max_possible_score = 100
      
      (base_score.to_f / max_possible_score * 100).round(2)
    end

    def apply_schedule_changes(resolved_matches)
      resolved_matches.each do |resolution|
        match = resolution[:match]
        changes = resolution[:changes]
        conflict = resolution[:conflict]
        
        ActiveRecord::Base.transaction do
          match.update!(changes)
          conflict.resolve!
        end
      end
    end

    def generate_schedule_report
      {
        total_matches: matches.count,
        conflicts_detected: ScheduleConflict.where(match: matches).count,
        conflicts_resolved: ScheduleConflict.where(match: matches, resolution_status: 'resolved').count,
        venue_utilization: calculate_venue_utilization,
        team_travel_stats: calculate_team_travel_stats,
        optimization_score: calculate_optimization_score
      }
    end

    def calculate_venue_utilization
      organization.venues.map do |venue|
        matches_count = venue.matches.where(season: season).count
        available_slots = venue.venue_availabilities.available.count
        
        {
          venue_id: venue.id,
          venue_name: venue.name,
          matches_scheduled: matches_count,
          utilization_rate: available_slots > 0 ? (matches_count.to_f / available_slots * 100).round(2) : 0
        }
      end
    end

    def calculate_team_travel_stats
      season.teams.map do |team|
        team_matches = matches.where('home_team_id = ? OR away_team_id = ?', team.id, team.id)
        total_distance = calculate_total_travel_distance(team_matches)
        
        {
          team_id: team.id,
          team_name: team.name,
          total_matches: team_matches.count,
          total_travel_distance: total_distance.round(2),
          average_travel_per_match: team_matches.any? ? (total_distance / team_matches.count).round(2) : 0
        }
      end
    end

    def calculate_total_travel_distance(team_matches)
      return 0 if team_matches.count < 2
      
      sorted_matches = team_matches.order(:scheduled_at)
      total_distance = 0
      
      sorted_matches.each_cons(2) do |match1, match2|
        if match1.venue && match2.venue
          distance = match1.venue.distance_from(match2.venue) || 0
          total_distance += distance
        end
      end
      
      total_distance
    end

    def calculate_optimization_score
      conflicts_score = matches.any? ? (1 - (ScheduleConflict.pending.count.to_f / matches.count)) * 40 : 40
      venue_score = calculate_venue_distribution_score * 30
      travel_score = calculate_travel_efficiency_score * 30
      
      (conflicts_score + venue_score + travel_score).round(2)
    end

    private

    def generate_ai_optimization_plan(conflicts)
      prompt = <<~PROMPT
        草野球リーグのスケジュール最適化を行います。
        
        現在の状況:
        - 総試合数: #{matches.count}
        - 検出された競合: #{conflicts.count}
        - 参加チーム数: #{season.teams.count}
        - 利用可能会場数: #{organization.venues.count}
        
        競合の内訳:
        #{format_conflicts_summary(conflicts)}
        
        以下の観点から最適化計画を提案してください：
        1. 競合解決の優先順位
        2. 会場利用の効率化
        3. チームの移動距離最小化
        4. 観客動員を考慮した日程配置
        5. 天候リスクの最小化
        
        具体的で実行可能な提案を日本語でお願いします。
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_conflicts_summary(conflicts)
      grouped = conflicts.group_by(&:conflict_type)
      grouped.map do |type, type_conflicts|
        "- #{translate_conflict_type(type)}: #{type_conflicts.count}件"
      end.join("\n")
    end

    def translate_conflict_type(type)
      {
        'venue_overlap' => '会場の重複',
        'team_overlap' => 'チームスケジュールの重複',
        'travel_distance' => '移動距離の問題'
      }[type] || type
    end

    def generate_comprehensive_report(ai_suggestions)
      report = generate_schedule_report
      
      # Add AI insights
      report[:ai_analysis] = ai_suggestions
      report[:optimization_recommendations] = generate_optimization_recommendations(report)
      
      # Generate Japanese summary
      report[:japanese_summary] = generate_japanese_summary(report)
      
      report
    end

    def generate_optimization_recommendations(report)
      recommendations = []
      
      if report[:venue_utilization].any? { |v| v[:utilization_rate] < 30 }
        recommendations << {
          type: 'venue_efficiency',
          priority: 'high',
          suggestion: '利用率の低い会場の統合を検討してください'
        }
      end
      
      if report[:team_travel_stats].any? { |t| t[:average_travel_per_match] > 100 }
        recommendations << {
          type: 'travel_optimization',
          priority: 'medium',
          suggestion: '移動距離の多いチームのホーム試合を増やすことを検討してください'
        }
      end
      
      recommendations
    end

    def generate_japanese_summary(report)
      prompt = <<~PROMPT
        以下のスケジュール最適化レポートを分析し、わかりやすい日本語のサマリーを作成してください：
        
        総試合数: #{report[:total_matches]}
        検出された競合: #{report[:conflicts_detected]}
        解決された競合: #{report[:conflicts_resolved]}
        最適化スコア: #{report[:optimization_score]}
        
        重要なポイントと改善提案を3-5点にまとめてください。
      PROMPT

      summary_response = openai_client.analyze(prompt)
      summary_response[:summary] || summary_response
    end

    def extract_changes_from_resolution(resolution)
      changes = {}
      
      if resolution[:resolution][:new_venue_id]
        changes[:venue_id] = resolution[:resolution][:new_venue_id]
      end
      
      if resolution[:resolution][:new_datetime]
        changes[:scheduled_at] = resolution[:resolution][:new_datetime]
      end
      
      changes
    end

    def calculate_venue_distribution_score
      return 0 unless organization.venues.any?
      
      venue_counts = matches.group(:venue_id).count
      total_matches = matches.count
      ideal_distribution = total_matches.to_f / organization.venues.count
      
      variance = venue_counts.values.map { |count| (count - ideal_distribution) ** 2 }.sum
      max_variance = total_matches ** 2
      
      1 - (variance / max_variance)
    end

    def calculate_travel_efficiency_score
      travel_stats = calculate_team_travel_stats
      return 0 if travel_stats.empty?
      
      avg_distances = travel_stats.map { |stat| stat[:average_travel_per_match] }
      return 1 if avg_distances.all?(&:zero?)
      
      # Lower average distance is better
      max_distance = 200 # km, threshold for maximum acceptable average distance
      efficiency_scores = avg_distances.map { |dist| 1 - [dist / max_distance, 1].min }
      
      efficiency_scores.sum / efficiency_scores.count
    end
  end
end