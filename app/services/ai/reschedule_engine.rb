module Ai
  class RescheduleEngine
    attr_reader :organization, :season, :openai_client

    def initialize(organization:, season: nil)
      @organization = organization
      @season = season || organization.seasons.active.first
      @openai_client = OpenAiClient.new(ENV.fetch('OPENAI_API_KEY', ''))
    end

    def reschedule_match(match, reason:, constraints: {})
      # Create rescheduled match record
      rescheduled_match = create_rescheduled_record(match, reason)
      
      # Find optimal new slot
      new_slot = find_optimal_reschedule_slot(match, constraints)
      
      if new_slot
        apply_reschedule(match, new_slot, rescheduled_match)
        notify_stakeholders(match, new_slot, reason)
        
        {
          success: true,
          match: match,
          new_schedule: new_slot,
          rescheduled_record: rescheduled_match,
          notifications_sent: true
        }
      else
        {
          success: false,
          match: match,
          reason: 'No suitable reschedule slot found',
          alternatives: suggest_alternatives(match, constraints)
        }
      end
    end

    def bulk_reschedule(matches, reason:, strategy: :minimize_disruption)
      results = {
        successful: [],
        failed: [],
        conflicts_created: [],
        total_matches: matches.count
      }

      # Sort matches by priority for rescheduling
      sorted_matches = prioritize_for_rescheduling(matches, strategy)
      
      ActiveRecord::Base.transaction do
        sorted_matches.each do |match|
          result = reschedule_match(match, reason: reason)
          
          if result[:success]
            results[:successful] << result
          else
            results[:failed] << result
            
            # Rollback if critical match can't be rescheduled
            if match.match_type == 'playoff' || match.match_type == 'final'
              raise ActiveRecord::Rollback, "Critical match #{match.id} cannot be rescheduled"
            end
          end
        end
        
        # Check for new conflicts created by rescheduling
        results[:conflicts_created] = detect_new_conflicts(results[:successful])
      end
      
      results[:success_rate] = (results[:successful].count.to_f / matches.count * 100).round(2)
      results
    end

    def handle_weather_postponement(match, weather_data)
      # Log weather data
      rescheduled_match = RescheduledMatch.create!(
        match: match,
        original_date: match.scheduled_at.to_date,
        original_time: match.scheduled_at.to_time,
        reason: 'weather',
        weather_data: weather_data
      )
      
      # Find next suitable weather window
      weather_scheduler = WeatherAwareScheduler.new(organization: organization)
      suitable_dates = weather_scheduler.suggest_weather_optimal_dates(
        match.venue,
        Date.current + 1.day,
        season.end_date
      )
      
      # Find slot that works for both teams and venue
      optimal_slot = suitable_dates.find do |date, weather_score|
        slot_time = date.to_datetime.change(hour: match.scheduled_at.hour)
        
        venue_available?(match.venue, slot_time) &&
        teams_available?(match.home_team, match.away_team, slot_time) &&
        weather_score >= 70
      end
      
      if optimal_slot
        new_datetime = optimal_slot[0].to_datetime.change(hour: match.scheduled_at.hour)
        
        apply_reschedule(match, {
          datetime: new_datetime,
          venue: match.venue,
          weather_score: optimal_slot[1]
        }, rescheduled_match)
        
        send_weather_postponement_notifications(match, weather_data, new_datetime)
        
        { success: true, new_date: new_datetime, weather_score: optimal_slot[1] }
      else
        { success: false, reason: 'No suitable weather window found within season' }
      end
    end

    def optimize_season_schedule
      # Analyze entire season for potential optimizations
      all_matches = season.matches.includes(:venue, :home_team, :away_team)
      
      optimization_report = {
        current_metrics: calculate_schedule_metrics(all_matches),
        suggested_changes: [],
        expected_improvements: {}
      }
      
      # Check for back-to-back games that could be rearranged
      back_to_back_issues = find_back_to_back_issues(all_matches)
      optimization_report[:suggested_changes] += resolve_back_to_back_issues(back_to_back_issues)
      
      # Check for travel optimization opportunities
      travel_issues = analyze_travel_patterns(all_matches)
      optimization_report[:suggested_changes] += optimize_travel_patterns(travel_issues)
      
      # Check for venue distribution
      venue_issues = analyze_venue_distribution(all_matches)
      optimization_report[:suggested_changes] += balance_venue_distribution(venue_issues)
      
      # Calculate expected improvements
      if optimization_report[:suggested_changes].any?
        simulated_matches = apply_simulated_changes(all_matches, optimization_report[:suggested_changes])
        optimization_report[:expected_improvements] = calculate_schedule_metrics(simulated_matches)
        optimization_report[:improvement_summary] = compare_metrics(
          optimization_report[:current_metrics],
          optimization_report[:expected_improvements]
        )
      end
      
      # Add AI-powered analysis and recommendations
      optimization_report[:ai_analysis] = analyze_schedule_with_ai(optimization_report)
      optimization_report[:japanese_summary] = generate_japanese_optimization_report(optimization_report)
      
      optimization_report
    end

    def suggest_makeup_doubleheader(postponed_match)
      # Find dates where one team already plays at the venue
      potential_dates = []
      
      [postponed_match.home_team, postponed_match.away_team].each do |team|
        team_matches = team.matches
                          .where(venue: postponed_match.venue)
                          .where('scheduled_at > ?', Date.current)
                          .where(season: season)
        
        team_matches.each do |existing_match|
          # Check if doubleheader is feasible
          if can_schedule_doubleheader?(existing_match, postponed_match)
            potential_dates << {
              date: existing_match.scheduled_at.to_date,
              existing_match: existing_match,
              first_game_time: existing_match.scheduled_at.change(hour: 13),
              second_game_time: existing_match.scheduled_at.change(hour: 18),
              venue: postponed_match.venue,
              feasibility_score: calculate_doubleheader_feasibility(existing_match, postponed_match)
            }
          end
        end
      end
      
      sorted_dates = potential_dates.sort_by { |d| -d[:feasibility_score] }.first(3)
      
      # Get AI recommendations for doubleheader scheduling
      if sorted_dates.any?
        ai_recommendations = analyze_doubleheader_options_with_ai(postponed_match, sorted_dates)
        sorted_dates.each_with_index do |date, index|
          date[:ai_recommendation] = ai_recommendations[index] if ai_recommendations[index]
        end
      end
      
      sorted_dates
    end

    private

    def create_rescheduled_record(match, reason)
      RescheduledMatch.create!(
        match: match,
        original_date: match.scheduled_at.to_date,
        original_time: match.scheduled_at.to_time,
        reason: reason
      )
    end

    def find_optimal_reschedule_slot(match, constraints)
      # Define search parameters
      earliest_date = constraints[:earliest_date] || Date.current + 1.day
      latest_date = constraints[:latest_date] || season.end_date
      preferred_day_of_week = constraints[:preferred_day_of_week] || match.scheduled_at.wday
      preferred_time = constraints[:preferred_time] || match.scheduled_at.hour
      
      candidate_slots = generate_candidate_slots(
        match,
        earliest_date,
        latest_date,
        preferred_day_of_week,
        preferred_time
      )
      
      # Score each slot
      scored_slots = candidate_slots.map do |slot|
        {
          datetime: slot[:datetime],
          venue: slot[:venue],
          score: calculate_slot_score(slot, match, constraints),
          conflicts: check_slot_conflicts(slot, match)
        }
      end
      
      # Filter out slots with conflicts unless explicitly allowed
      unless constraints[:allow_conflicts]
        scored_slots.reject! { |slot| slot[:conflicts].any? }
      end
      
      # Return highest scoring slot
      best_slot = scored_slots.max_by { |s| s[:score] }
      
      best_slot if best_slot && best_slot[:score] > (constraints[:min_score] || 50)
    end

    def generate_candidate_slots(match, start_date, end_date, preferred_dow, preferred_time)
      slots = []
      
      (start_date..end_date).each do |date|
        # Prioritize preferred day of week
        if date.wday == preferred_dow
          [preferred_time, preferred_time - 3, preferred_time + 3].each do |hour|
            next if hour < 10 || hour > 21
            
            datetime = date.to_datetime.change(hour: hour)
            
            # Check each available venue
            organization.venues.each do |venue|
              if venue_available?(venue, datetime) && venue.capacity >= (match.expected_attendance || 500)
                slots << {
                  datetime: datetime,
                  venue: venue,
                  is_preferred_dow: true,
                  is_preferred_time: hour == preferred_time
                }
              end
            end
          end
        else
          # Also check other days with standard game times
          [13, 16, 19].each do |hour|
            datetime = date.to_datetime.change(hour: hour)
            
            if venue_available?(match.venue, datetime)
              slots << {
                datetime: datetime,
                venue: match.venue,
                is_preferred_dow: false,
                is_preferred_time: hour == preferred_time
              }
            end
          end
        end
      end
      
      slots
    end

    def calculate_slot_score(slot, match, constraints)
      score = 50 # Base score
      
      # Prefer maintaining original venue
      score += 20 if slot[:venue] == match.venue
      
      # Prefer similar day of week
      score += 15 if slot[:is_preferred_dow]
      
      # Prefer similar time
      score += 10 if slot[:is_preferred_time]
      
      # Minimize date change
      days_difference = (slot[:datetime].to_date - match.scheduled_at.to_date).abs
      score -= days_difference * 2
      
      # Check team rest (avoid back-to-back games)
      if !teams_well_rested?(match.home_team, match.away_team, slot[:datetime])
        score -= 30
      end
      
      # Weather considerations for outdoor venues
      if slot[:venue].outdoor?
        weather_scheduler = WeatherAwareScheduler.new(organization: organization)
        weather_check = weather_scheduler.check_match_weather(
          OpenStruct.new(venue: slot[:venue], scheduled_at: slot[:datetime])
        )
        score += (weather_check[:confidence] - 50) / 2 # Convert 0-100 to -25 to +25
      end
      
      # Apply any custom constraint scoring
      if constraints[:custom_scorer]
        score = constraints[:custom_scorer].call(slot, match, score)
      end
      
      [score, 0].max # Ensure non-negative
    end

    def check_slot_conflicts(slot, match)
      conflicts = []
      
      # Check venue conflicts
      if Match.where(venue: slot[:venue])
              .where('scheduled_at BETWEEN ? AND ?', 
                     slot[:datetime] - 3.hours, 
                     slot[:datetime] + 3.hours)
              .where.not(id: match.id)
              .exists?
        conflicts << { type: 'venue', severity: 'high' }
      end
      
      # Check team conflicts
      team_ids = [match.home_team_id, match.away_team_id]
      if Match.where('home_team_id IN (?) OR away_team_id IN (?)', team_ids, team_ids)
              .where('scheduled_at BETWEEN ? AND ?', 
                     slot[:datetime] - 5.hours, 
                     slot[:datetime] + 5.hours)
              .where.not(id: match.id)
              .exists?
        conflicts << { type: 'team', severity: 'high' }
      end
      
      conflicts
    end

    def venue_available?(venue, datetime)
      return false unless venue
      
      # Check venue availability records
      availability = venue.venue_availabilities.find_by(available_date: datetime.to_date)
      return false if availability && !availability.is_available?
      
      # Check for existing matches
      !Match.where(venue: venue)
            .where('scheduled_at BETWEEN ? AND ?', datetime - 3.hours, datetime + 3.hours)
            .exists?
    end

    def teams_available?(home_team, away_team, datetime)
      team_ids = [home_team.id, away_team.id]
      
      !Match.where('(home_team_id IN (?) OR away_team_id IN (?)) AND scheduled_at BETWEEN ? AND ?',
                   team_ids, team_ids, datetime - 5.hours, datetime + 5.hours)
            .exists?
    end

    def teams_well_rested?(home_team, away_team, datetime)
      team_ids = [home_team.id, away_team.id]
      
      # Check for matches within 24 hours
      !Match.where('(home_team_id IN (?) OR away_team_id IN (?)) AND scheduled_at BETWEEN ? AND ?',
                   team_ids, team_ids, datetime - 24.hours, datetime + 24.hours)
            .exists?
    end

    def apply_reschedule(match, new_slot, rescheduled_match)
      ActiveRecord::Base.transaction do
        # Update match
        match.update!(
          scheduled_at: new_slot[:datetime],
          venue: new_slot[:venue]
        )
        
        # Update rescheduled match record
        rescheduled_match.update!(
          new_date: new_slot[:datetime].to_date,
          new_time: new_slot[:datetime].to_time
        )
        
        # Clear any venue availability conflicts
        if match.venue != new_slot[:venue]
          # Mark old venue slot as available
          mark_venue_available(match.venue, match.scheduled_at)
          
          # Mark new venue slot as unavailable
          mark_venue_unavailable(new_slot[:venue], new_slot[:datetime])
        end
      end
    end

    def mark_venue_available(venue, datetime)
      availability = venue.venue_availabilities.find_or_create_by(available_date: datetime.to_date)
      availability.update!(is_available: true)
    end

    def mark_venue_unavailable(venue, datetime)
      availability = venue.venue_availabilities.find_or_create_by(available_date: datetime.to_date)
      availability.update!(is_available: false)
    end

    def notify_stakeholders(match, new_slot, reason)
      # This would integrate with a notification service
      notifications = []
      
      # Notify teams
      notifications << notify_team(match.home_team, match, new_slot, reason)
      notifications << notify_team(match.away_team, match, new_slot, reason)
      
      # Notify venue
      notifications << notify_venue(new_slot[:venue], match, new_slot[:datetime])
      
      # Notify league officials
      notifications << notify_officials(match, new_slot, reason)
      
      # Log notifications
      Rails.logger.info "Sent #{notifications.count} notifications for match #{match.id} reschedule"
      
      notifications
    end

    def notify_team(team, match, new_slot, reason)
      # Placeholder for actual notification implementation
      {
        recipient: team,
        type: 'team',
        message: "Match rescheduled due to #{reason}. New date: #{new_slot[:datetime]}",
        sent_at: Time.current
      }
    end

    def notify_venue(venue, match, new_datetime)
      {
        recipient: venue,
        type: 'venue',
        message: "New match scheduled: #{match.home_team.name} vs #{match.away_team.name} on #{new_datetime}",
        sent_at: Time.current
      }
    end

    def notify_officials(match, new_slot, reason)
      {
        recipient: 'League Officials',
        type: 'officials',
        message: "Match #{match.id} rescheduled to #{new_slot[:datetime]} due to #{reason}",
        sent_at: Time.current
      }
    end

    def send_weather_postponement_notifications(match, weather_data, new_datetime)
      # Special notifications for weather postponements
      weather_summary = weather_data[:reason] || 'adverse weather conditions'
      
      # Public announcement
      announcement = {
        title: "Match Postponed Due to Weather",
        body: "The match between #{match.home_team.name} and #{match.away_team.name} " \
              "scheduled for #{match.scheduled_at.strftime('%B %d at %l:%M %p')} " \
              "has been postponed due to #{weather_summary}. " \
              "The match has been rescheduled to #{new_datetime.strftime('%B %d at %l:%M %p')}.",
        channels: ['website', 'mobile_app', 'social_media']
      }
      
      # TODO: Integrate with actual notification service
      Rails.logger.info "Weather postponement announcement: #{announcement}"
      
      announcement
    end

    def suggest_alternatives(match, constraints)
      alternatives = []
      
      # Try different venues
      alternative_venues = organization.venues
                                      .where.not(id: match.venue_id)
                                      .where('capacity >= ?', match.expected_attendance || 500)
      
      alternative_venues.each do |venue|
        slot = find_optimal_reschedule_slot(
          match, 
          constraints.merge(venue_id: venue.id)
        )
        
        alternatives << {
          type: 'different_venue',
          venue: venue,
          slot: slot
        } if slot
      end
      
      # Try extended date range
      if constraints[:latest_date] < season.end_date + 7.days
        extended_slot = find_optimal_reschedule_slot(
          match,
          constraints.merge(latest_date: season.end_date + 7.days)
        )
        
        alternatives << {
          type: 'extended_season',
          slot: extended_slot,
          note: 'Requires season extension'
        } if extended_slot
      end
      
      # Suggest doubleheader options
      doubleheader_options = suggest_makeup_doubleheader(match)
      alternatives += doubleheader_options.map { |opt| { type: 'doubleheader', **opt } }
      
      alternatives
    end

    def prioritize_for_rescheduling(matches, strategy)
      case strategy
      when :minimize_disruption
        # Reschedule less important matches first
        matches.sort_by do |match|
          priority = 0
          priority += 100 if match.match_type == 'playoff'
          priority += 50 if match.match_type == 'final'
          priority += match.expected_attendance.to_i / 100
          priority
        end
      when :maintain_sequence
        # Keep matches in chronological order
        matches.sort_by(&:scheduled_at)
      when :venue_optimization
        # Group by venue to minimize venue changes
        matches.group_by(&:venue).values.flatten
      else
        matches
      end
    end

    def detect_new_conflicts(successful_reschedules)
      conflicts = []
      
      successful_reschedules.each do |result|
        match = result[:match]
        new_schedule = result[:new_schedule]
        
        # Check for venue conflicts with other rescheduled matches
        other_matches = successful_reschedules.reject { |r| r[:match].id == match.id }
        
        other_matches.each do |other_result|
          other_match = other_result[:match]
          other_schedule = other_result[:new_schedule]
          
          if new_schedule[:venue] == other_schedule[:venue] &&
             (new_schedule[:datetime] - other_schedule[:datetime]).abs < 3.hours
            conflicts << {
              match1: match,
              match2: other_match,
              type: 'venue_overlap',
              severity: 'high'
            }
          end
        end
      end
      
      conflicts.uniq { |c| [c[:match1].id, c[:match2].id].sort }
    end

    def calculate_schedule_metrics(matches)
      {
        total_matches: matches.count,
        back_to_back_games: count_back_to_back_games(matches),
        average_team_travel: calculate_average_team_travel(matches),
        venue_utilization_variance: calculate_venue_utilization_variance(matches),
        weekend_match_percentage: calculate_weekend_match_percentage(matches),
        prime_time_percentage: calculate_prime_time_percentage(matches)
      }
    end

    def count_back_to_back_games(matches)
      count = 0
      teams = matches.map(&:home_team_id).concat(matches.map(&:away_team_id)).uniq
      
      teams.each do |team_id|
        team_matches = matches.select { |m| m.home_team_id == team_id || m.away_team_id == team_id }
                              .sort_by(&:scheduled_at)
        
        team_matches.each_cons(2) do |match1, match2|
          if (match2.scheduled_at - match1.scheduled_at) < 24.hours
            count += 1
          end
        end
      end
      
      count
    end

    def calculate_average_team_travel(matches)
      venue_optimizer = VenueOptimizer.new(organization: organization, season: season)
      travel_analysis = venue_optimizer.analyze_travel_efficiency
      
      travel_analysis[:league_average]
    end

    def calculate_venue_utilization_variance(matches)
      venue_counts = matches.group_by(&:venue_id).transform_values(&:count)
      return 0 if venue_counts.empty?
      
      counts = venue_counts.values
      mean = counts.sum.to_f / counts.size
      variance = counts.sum { |c| (c - mean) ** 2 } / counts.size
      
      Math.sqrt(variance).round(2)
    end

    def calculate_weekend_match_percentage(matches)
      weekend_matches = matches.count { |m| [0, 6].include?(m.scheduled_at.wday) }
      (weekend_matches.to_f / matches.count * 100).round(2)
    end

    def calculate_prime_time_percentage(matches)
      prime_time_matches = matches.count { |m| (18..20).include?(m.scheduled_at.hour) }
      (prime_time_matches.to_f / matches.count * 100).round(2)
    end

    def find_back_to_back_issues(matches)
      issues = []
      teams = matches.flat_map { |m| [m.home_team, m.away_team] }.uniq
      
      teams.each do |team|
        team_matches = matches.select { |m| m.home_team == team || m.away_team == team }
                              .sort_by(&:scheduled_at)
        
        team_matches.each_cons(2) do |match1, match2|
          time_between = match2.scheduled_at - match1.scheduled_at
          
          if time_between < 20.hours
            issues << {
              team: team,
              match1: match1,
              match2: match2,
              time_between: time_between,
              severity: time_between < 16.hours ? 'high' : 'medium'
            }
          elsif time_between < 24.hours && different_cities?(match1.venue, match2.venue)
            issues << {
              team: team,
              match1: match1,
              match2: match2,
              time_between: time_between,
              travel_required: true,
              severity: 'high'
            }
          end
        end
      end
      
      issues
    end

    def different_cities?(venue1, venue2)
      return false if venue1 == venue2
      return true unless venue1.geocoded? && venue2.geocoded?
      
      venue1.distance_from(venue2) > 50 # More than 50km apart
    end

    def resolve_back_to_back_issues(issues)
      suggestions = []
      
      issues.each do |issue|
        if issue[:severity] == 'high'
          # Suggest moving one of the matches
          earlier_slot = find_earlier_slot(issue[:match1])
          later_slot = find_later_slot(issue[:match2])
          
          if earlier_slot && earlier_slot[:score] > (later_slot&.dig(:score) || 0)
            suggestions << {
              type: 'reschedule',
              match: issue[:match1],
              current_time: issue[:match1].scheduled_at,
              suggested_time: earlier_slot[:datetime],
              reason: 'Resolve back-to-back conflict'
            }
          elsif later_slot
            suggestions << {
              type: 'reschedule',
              match: issue[:match2],
              current_time: issue[:match2].scheduled_at,
              suggested_time: later_slot[:datetime],
              reason: 'Resolve back-to-back conflict'
            }
          end
        end
      end
      
      suggestions
    end

    def find_earlier_slot(match)
      earliest = match.scheduled_at - 3.days
      latest = match.scheduled_at - 1.day
      
      find_optimal_reschedule_slot(match, {
        earliest_date: earliest.to_date,
        latest_date: latest.to_date
      })
    end

    def find_later_slot(match)
      earliest = match.scheduled_at + 1.day
      latest = match.scheduled_at + 3.days
      
      find_optimal_reschedule_slot(match, {
        earliest_date: earliest.to_date,
        latest_date: latest.to_date
      })
    end

    def analyze_travel_patterns(matches)
      travel_patterns = {}
      teams = matches.flat_map { |m| [m.home_team, m.away_team] }.uniq
      
      teams.each do |team|
        team_matches = matches.select { |m| m.home_team == team || m.away_team == team }
                              .sort_by(&:scheduled_at)
        
        travel_distances = []
        team_matches.each_cons(2) do |match1, match2|
          if match1.venue && match2.venue && match1.venue != match2.venue
            distance = match1.venue.distance_from(match2.venue) || 0
            travel_distances << {
              from_match: match1,
              to_match: match2,
              distance: distance,
              days_between: (match2.scheduled_at.to_date - match1.scheduled_at.to_date).to_i
            }
          end
        end
        
        travel_patterns[team.id] = {
          team: team,
          total_travel: travel_distances.sum { |td| td[:distance] },
          segments: travel_distances,
          inefficient_segments: travel_distances.select { |td| td[:distance] > 200 && td[:days_between] < 2 }
        }
      end
      
      travel_patterns
    end

    def optimize_travel_patterns(travel_patterns)
      suggestions = []
      
      travel_patterns.each do |team_id, pattern|
        pattern[:inefficient_segments].each do |segment|
          # Look for matches that could be swapped to reduce travel
          intermediate_matches = find_intermediate_matches(
            pattern[:team],
            segment[:from_match],
            segment[:to_match]
          )
          
          intermediate_matches.each do |intermediate_match|
            if swapping_reduces_travel?(segment, intermediate_match)
              suggestions << {
                type: 'swap_matches',
                match1: segment[:to_match],
                match2: intermediate_match,
                expected_travel_reduction: calculate_travel_reduction(segment, intermediate_match),
                reason: 'Optimize travel pattern'
              }
            end
          end
        end
      end
      
      suggestions
    end

    def find_intermediate_matches(team, from_match, to_match)
      Match.joins('LEFT JOIN teams AS home_teams ON matches.home_team_id = home_teams.id')
           .joins('LEFT JOIN teams AS away_teams ON matches.away_team_id = away_teams.id')
           .where('(home_teams.id = ? OR away_teams.id = ?) AND scheduled_at BETWEEN ? AND ?',
                  team.id, team.id,
                  from_match.scheduled_at + 1.day,
                  to_match.scheduled_at - 1.day)
           .where.not(id: [from_match.id, to_match.id])
    end

    def swapping_reduces_travel?(segment, intermediate_match)
      # Simplified check - would need more complex logic in production
      intermediate_match.venue &&
      segment[:from_match].venue &&
      intermediate_match.venue.distance_from(segment[:from_match].venue) < segment[:distance] / 2
    end

    def calculate_travel_reduction(segment, intermediate_match)
      current_distance = segment[:distance]
      
      new_distance = 0
      if segment[:from_match].venue && intermediate_match.venue
        new_distance += segment[:from_match].venue.distance_from(intermediate_match.venue) || 0
      end
      if intermediate_match.venue && segment[:to_match].venue
        new_distance += intermediate_match.venue.distance_from(segment[:to_match].venue) || 0
      end
      
      (current_distance - new_distance).round(2)
    end

    def analyze_venue_distribution(matches)
      venue_counts = matches.group_by(&:venue).transform_values(&:count)
      total_matches = matches.count
      expected_per_venue = total_matches.to_f / organization.venues.count
      
      {
        venue_counts: venue_counts,
        expected_per_venue: expected_per_venue,
        overused_venues: venue_counts.select { |_, count| count > expected_per_venue * 1.3 },
        underused_venues: organization.venues.reject { |v| venue_counts[v]&.>= expected_per_venue * 0.7 }
      }
    end

    def balance_venue_distribution(venue_issues)
      suggestions = []
      
      venue_issues[:overused_venues].each do |venue, count|
        excess_matches = count - venue_issues[:expected_per_venue].round
        
        # Find matches that could be moved to underused venues
        moveable_matches = Match.where(venue: venue, season: season)
                                .joins(:home_team, :away_team)
                                .order(expected_attendance: :asc)
                                .limit(excess_matches / 2)
        
        moveable_matches.each do |match|
          alternative_venue = venue_issues[:underused_venues].find do |alt_venue|
            alt_venue.capacity >= (match.expected_attendance || 500) &&
            venue_available?(alt_venue, match.scheduled_at)
          end
          
          if alternative_venue
            suggestions << {
              type: 'change_venue',
              match: match,
              current_venue: venue,
              suggested_venue: alternative_venue,
              reason: 'Balance venue utilization'
            }
            
            # Remove from underused list once assigned
            venue_issues[:underused_venues].delete(alternative_venue)
          end
        end
      end
      
      suggestions
    end

    def apply_simulated_changes(matches, changes)
      simulated_matches = matches.map(&:dup)
      
      changes.each do |change|
        case change[:type]
        when 'reschedule'
          match = simulated_matches.find { |m| m.id == change[:match].id }
          match.scheduled_at = change[:suggested_time] if match
        when 'change_venue'
          match = simulated_matches.find { |m| m.id == change[:match].id }
          match.venue = change[:suggested_venue] if match
        when 'swap_matches'
          match1 = simulated_matches.find { |m| m.id == change[:match1].id }
          match2 = simulated_matches.find { |m| m.id == change[:match2].id }
          if match1 && match2
            match1.scheduled_at, match2.scheduled_at = match2.scheduled_at, match1.scheduled_at
          end
        end
      end
      
      simulated_matches
    end

    def compare_metrics(current, expected)
      comparison = {}
      
      current.each do |key, value|
        if value.is_a?(Numeric) && expected[key].is_a?(Numeric)
          difference = expected[key] - value
          percentage_change = value > 0 ? (difference / value * 100).round(2) : 0
          
          comparison[key] = {
            current: value,
            expected: expected[key],
            change: difference.round(2),
            percentage_change: percentage_change,
            improvement: improvement_direction(key, difference)
          }
        end
      end
      
      comparison
    end

    def improvement_direction(metric, difference)
      case metric
      when :back_to_back_games, :venue_utilization_variance, :average_team_travel
        difference < 0 ? 'better' : 'worse'
      when :weekend_match_percentage, :prime_time_percentage
        difference > 0 ? 'better' : 'worse'
      else
        'neutral'
      end
    end

    def can_schedule_doubleheader?(existing_match, postponed_match)
      # Check if both matches involve at least one common team
      existing_teams = [existing_match.home_team_id, existing_match.away_team_id]
      postponed_teams = [postponed_match.home_team_id, postponed_match.away_team_id]
      
      return false unless (existing_teams & postponed_teams).any?
      
      # Check venue capacity for expected combined attendance
      combined_attendance = (existing_match.expected_attendance || 1000) + 
                           (postponed_match.expected_attendance || 1000) * 0.7 # Assume 70% for second game
      
      return false if combined_attendance > existing_match.venue.capacity * 2 # Two separate crowds
      
      # Check if date is not too close to original postponed date
      days_from_original = (existing_match.scheduled_at.to_date - postponed_match.scheduled_at.to_date).abs
      
      days_from_original >= 3 # At least 3 days from original date
    end

    def calculate_doubleheader_feasibility(existing_match, postponed_match)
      score = 50 # Base score
      
      # Common teams boost
      existing_teams = [existing_match.home_team_id, existing_match.away_team_id]
      postponed_teams = [postponed_match.home_team_id, postponed_match.away_team_id]
      common_teams = (existing_teams & postponed_teams).size
      score += common_teams * 20
      
      # Date proximity penalty
      days_difference = (existing_match.scheduled_at.to_date - Date.current).to_i
      score -= [0, 20 - days_difference * 2].max # Penalty for very soon dates
      
      # Weather consideration for outdoor venues
      if existing_match.venue.outdoor?
        score -= 10 # Outdoor doubleheaders are more risky
      end
      
      # Weekend bonus
      score += 15 if [0, 6].include?(existing_match.scheduled_at.wday)
      
      [score, 100].min
    end

    def analyze_schedule_with_ai(optimization_report)
      current = optimization_report[:current_metrics]
      suggested = optimization_report[:suggested_changes]
      
      prompt = <<~PROMPT
        草野球リーグのシーズンスケジュール最適化分析:
        
        現在のスケジュール指標:
        - 総試合数: #{current[:total_matches]}
        - 連続試合: #{current[:back_to_back_games]}件
        - 平均移動距離: #{current[:average_team_travel]}km
        - 会場利用の偏差: #{current[:venue_utilization_variance]}
        - 週末試合率: #{current[:weekend_match_percentage]}%
        - プライムタイム率: #{current[:prime_time_percentage]}%
        
        提案された変更数: #{suggested.count}
        
        以下の点について日本語で分析してください:
        1. 現在のスケジュールの主な問題点
        2. 提案された変更の効果予測
        3. 実施上のリスクと注意点
        4. 追加の最適化提案
      PROMPT

      openai_client.analyze(prompt)
    end

    def generate_japanese_optimization_report(optimization_report)
      improvements = optimization_report[:improvement_summary] || {}
      
      prompt = <<~PROMPT
        シーズンスケジュール最適化レポートを作成してください:
        
        改善点:
        #{format_improvements(improvements)}
        
        提案された変更:
        #{format_suggested_changes(optimization_report[:suggested_changes])}
        
        リーグ運営者向けに、以下を含む実行可能なレポートを日本語で作成してください:
        1. エグゼクティブサマリー
        2. 具体的な実施手順
        3. 期待される成果
        4. 実施コストとROIの試算
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_improvements(improvements)
      return "改善点なし" if improvements.empty?
      
      improvements.map do |metric, data|
        metric_name = translate_metric_name(metric)
        change_type = data[:improvement] == 'better' ? '改善' : '悪化'
        "- #{metric_name}: #{data[:current]} → #{data[:expected]} (#{change_type}: #{data[:percentage_change]}%)"
      end.join("\n")
    end

    def translate_metric_name(metric)
      {
        back_to_back_games: '連続試合数',
        average_team_travel: '平均移動距離',
        venue_utilization_variance: '会場利用の偏差',
        weekend_match_percentage: '週末試合率',
        prime_time_percentage: 'プライムタイム率'
      }[metric] || metric.to_s
    end

    def format_suggested_changes(changes)
      return "変更提案なし" if changes.empty?
      
      changes.first(5).map do |change|
        case change[:type]
        when 'reschedule'
          "試合日程変更: #{change[:match].id} (#{change[:reason]})"
        when 'change_venue'
          "会場変更: #{change[:match].id} → #{change[:suggested_venue].name}"
        when 'swap_matches'
          "試合入れ替え: #{change[:match1].id} ↔ #{change[:match2].id}"
        else
          change[:reason] || 'その他の変更'
        end
      end.join("\n")
    end

    def analyze_doubleheader_options_with_ai(postponed_match, potential_dates)
      return [] if potential_dates.empty?
      
      prompt = <<~PROMPT
        延期試合のダブルヘッダー開催オプションを分析してください:
        
        延期試合: #{postponed_match.home_team.name} vs #{postponed_match.away_team.name}
        元の日程: #{postponed_match.scheduled_at.strftime('%Y/%m/%d')}
        
        ダブルヘッダー候補:
        #{format_doubleheader_options(potential_dates)}
        
        各オプションについて、以下を日本語で評価してください:
        1. 実現可能性
        2. チームと選手への負担
        3. 観客動員への影響
        4. 運営上の注意点
      PROMPT

      response = openai_client.analyze(prompt)
      
      # Parse response into individual recommendations
      parse_doubleheader_recommendations(response)
    end

    def format_doubleheader_options(dates)
      dates.map.with_index do |date, index|
        existing = date[:existing_match]
        "オプション#{index + 1}: #{date[:date].strftime('%Y/%m/%d')} (既存: #{existing.home_team.name} vs #{existing.away_team.name})"
      end.join("\n")
    end

    def parse_doubleheader_recommendations(response)
      # Extract recommendations for each option
      recommendations = []
      
      if response[:suggestions]
        response[:suggestions].each_with_index do |suggestion, index|
          recommendations[index] = {
            feasibility: extract_feasibility_score(suggestion),
            recommendation: suggestion,
            concerns: response[:concerns] ? response[:concerns][index] : nil
          }
        end
      end
      
      recommendations
    end

    def extract_feasibility_score(suggestion)
      # Try to extract a numerical score from the suggestion text
      if suggestion =~ /(\d+)%/
        $1.to_i
      else
        70 # Default score
      end
    end
  end
end