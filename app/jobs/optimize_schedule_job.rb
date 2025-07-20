# frozen_string_literal: true

class OptimizeScheduleJob < ApplicationJob
  queue_as :low

  def perform(match_proposal_id, optimization_type = :travel_distance)
    match_proposal = MatchProposal.find(match_proposal_id)
    
    # Set organization context
    ActsAsTenant.with_tenant(match_proposal.organization) do
      case optimization_type.to_sym
      when :travel_distance
        optimize_for_travel_distance(match_proposal)
      when :venue_availability
        optimize_for_venue_availability(match_proposal)
      when :team_preferences
        optimize_for_team_preferences(match_proposal)
      when :comprehensive
        comprehensive_optimization(match_proposal)
      else
        Rails.logger.warn "Unknown optimization type: #{optimization_type}"
        optimize_for_travel_distance(match_proposal)
      end
      
      # Re-calculate scores after optimization
      recalculate_scores(match_proposal)
      
      # Notify about optimization completion
      notify_optimization_complete(match_proposal)
    end
  rescue StandardError => e
    Rails.logger.error "OptimizeScheduleJob failed for proposal #{match_proposal_id}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    
    notify_optimization_failure(match_proposal_id, e.message)
    raise
  end

  private

  def optimize_for_travel_distance(match_proposal)
    engine = Ai::MatchingEngine.new(match_proposal.league)
    engine.optimize_existing_schedule(match_proposal)
    
    match_proposal.proposal_metadata.merge!(
      last_optimization: Time.current,
      optimization_type: 'travel_distance'
    )
    match_proposal.save!
  end

  def optimize_for_venue_availability(match_proposal)
    # Check actual venue availability from external systems or database
    available_venues = fetch_available_venues(match_proposal)
    
    match_proposal.match_proposal_details.each do |detail|
      optimal_venue = find_optimal_available_venue(detail, available_venues)
      if optimal_venue && optimal_venue != detail.proposed_venue
        detail.update!(
          proposed_venue: optimal_venue,
          metadata: detail.metadata.merge(
            venue_changed: true,
            original_venue: detail.proposed_venue,
            change_reason: 'venue_availability'
          )
        )
      end
    end

    match_proposal.proposal_metadata.merge!(
      last_optimization: Time.current,
      optimization_type: 'venue_availability'
    )
    match_proposal.save!
  end

  def optimize_for_team_preferences(match_proposal)
    # Load team preferences
    preferences = load_team_preferences(match_proposal.league)
    
    # Adjust schedule based on preferences
    match_proposal.match_proposal_details.each do |detail|
      # Check home team time preferences
      home_pref = preferences[detail.home_team_id]
      away_pref = preferences[detail.away_team_id]
      
      if home_pref || away_pref
        optimal_time = find_mutually_preferred_time(detail, home_pref, away_pref)
        if optimal_time && optimal_time != detail.proposed_datetime
          detail.update!(
            proposed_datetime: optimal_time,
            metadata: detail.metadata.merge(
              time_adjusted: true,
              adjustment_reason: 'team_preferences'
            )
          )
        end
      end
    end

    match_proposal.proposal_metadata.merge!(
      last_optimization: Time.current,
      optimization_type: 'team_preferences'
    )
    match_proposal.save!
  end

  def comprehensive_optimization(match_proposal)
    # Run all optimizations in sequence
    optimize_for_travel_distance(match_proposal)
    optimize_for_venue_availability(match_proposal)
    optimize_for_team_preferences(match_proposal)
    
    # Final constraint check
    checker = Ai::ScheduleConstraintChecker.new(match_proposal)
    violations = checker.check_all_constraints
    
    if violations.any?
      # Try to resolve violations
      resolve_constraint_violations(match_proposal, violations)
    end

    match_proposal.proposal_metadata.merge!(
      last_optimization: Time.current,
      optimization_type: 'comprehensive',
      final_violations: violations.size
    )
    match_proposal.save!
  end

  def recalculate_scores(match_proposal)
    calculator = Ai::FairnessCalculator.new(match_proposal)
    
    match_proposal.strength_balance_score = calculator.calculate_strength_balance
    match_proposal.travel_efficiency_score = calculator.calculate_travel_efficiency
    match_proposal.schedule_preference_score = calculator.calculate_schedule_preference
    match_proposal.home_away_balance_score = calculator.calculate_home_away_balance
    match_proposal.overall_fairness_score = calculator.calculate_overall_fairness
    
    match_proposal.save!
  end

  def fetch_available_venues(match_proposal)
    # This would integrate with venue management system
    # For now, return a sample list
    venues = []
    
    match_proposal.league.teams.each do |team|
      if team.home_venue.present?
        venues << {
          name: team.home_venue,
          team_id: team.id,
          latitude: team.latitude,
          longitude: team.longitude,
          availability: fetch_venue_availability(team.home_venue)
        }
      end
    end
    
    venues
  end

  def fetch_venue_availability(venue_name)
    # Mock implementation - would query actual venue system
    # Returns array of unavailable datetime ranges
    existing_bookings = Match.where(venue: venue_name)
                             .where("scheduled_at > ?", Time.current)
                             .pluck(:scheduled_at)
    
    existing_bookings.map do |datetime|
      (datetime - 2.hours)..(datetime + 3.hours)
    end
  end

  def find_optimal_available_venue(detail, available_venues)
    suitable_venues = available_venues.select do |venue|
      # Check if venue is available at the proposed time
      !venue[:availability].any? { |range| range.cover?(detail.proposed_datetime) }
    end
    
    return nil if suitable_venues.empty?
    
    # Find venue that minimizes total travel
    optimizer = Ai::TravelDistanceOptimizer.new(detail.match_proposal.league)
    optimizer.find_optimal_venue(detail.home_team, detail.away_team, suitable_venues)
  end

  def load_team_preferences(league)
    # This would load actual team preferences from database
    # For now, return mock preferences
    preferences = {}
    
    league.teams.each do |team|
      preferences[team.id] = {
        preferred_days: [:saturday, :sunday],
        preferred_times: [10, 11, 13, 14], # hours
        blackout_dates: [],
        home_field_priority: true
      }
    end
    
    preferences
  end

  def find_mutually_preferred_time(detail, home_pref, away_pref)
    current_time = detail.proposed_datetime
    current_day = current_time.wday
    
    # Find days that work for both teams
    preferred_days = []
    preferred_days += home_pref[:preferred_days] if home_pref
    preferred_days += away_pref[:preferred_days] if away_pref
    preferred_days = preferred_days.uniq
    
    # If current day is not preferred, find nearest preferred day
    unless preferred_days.empty? || preferred_days.include?(current_day)
      # Find nearest preferred day
      days_ahead = preferred_days.map do |day|
        days_until = (day - current_day) % 7
        days_until = 7 if days_until == 0
        days_until
      end.min
      
      new_date = current_time + days_ahead.days
      
      # Find preferred time on that day
      preferred_hours = []
      preferred_hours += home_pref[:preferred_times] if home_pref
      preferred_hours += away_pref[:preferred_times] if away_pref
      preferred_hours = preferred_hours.uniq.sort
      
      if preferred_hours.any?
        hour = preferred_hours.find { |h| h >= 10 } || preferred_hours.first
        return new_date.change(hour: hour, min: 0)
      end
    end
    
    current_time
  end

  def resolve_constraint_violations(match_proposal, violations)
    violations.each do |violation|
      case violation[:type]
      when :insufficient_rest
        adjust_match_spacing(match_proposal, violation)
      when :venue_conflict
        resolve_venue_conflict(match_proposal, violation)
      when :excessive_consecutive_home_games, :excessive_consecutive_away_games
        rebalance_home_away(match_proposal, violation)
      end
    end
  end

  def adjust_match_spacing(match_proposal, violation)
    match_ids = violation[:matches]
    details = match_proposal.match_proposal_details.where(id: match_ids).order(:proposed_datetime)
    
    if details.size == 2
      # Move the second match later
      min_days = match_proposal.ai_matching_config.min_days_between_matches
      new_datetime = details.first.proposed_datetime + (min_days + 1).days
      
      # Ensure it's on a weekend
      while !new_datetime.saturday? && !new_datetime.sunday?
        new_datetime += 1.day
      end
      
      details.second.update!(proposed_datetime: new_datetime)
    end
  end

  def resolve_venue_conflict(match_proposal, violation)
    conflicting_details = match_proposal.match_proposal_details.where(id: violation[:matches])
    
    # Move all but the first match to different times
    conflicting_details.offset(1).each_with_index do |detail, index|
      new_time = detail.proposed_datetime + ((index + 1) * 3).hours
      detail.update!(proposed_datetime: new_time)
    end
  end

  def rebalance_home_away(match_proposal, violation)
    team_id = violation[:team_id]
    
    # Find matches where we can swap home/away
    swappable_matches = match_proposal.match_proposal_details.select do |detail|
      (detail.home_team_id == team_id || detail.away_team_id == team_id) &&
      can_swap_home_away?(detail)
    end
    
    # Swap some matches to balance
    swaps_needed = violation[:consecutive_count] - 
                  match_proposal.ai_matching_config.max_consecutive_home_games
    
    swappable_matches.first(swaps_needed).each do |detail|
      detail.update!(
        home_team_id: detail.away_team_id,
        away_team_id: detail.home_team_id,
        proposed_venue: detail.home_team.home_venue || "#{detail.home_team.city} Stadium"
      )
    end
  end

  def can_swap_home_away?(detail)
    # Check if swapping would create other violations
    checker = Ai::ScheduleConstraintChecker.new(detail.match_proposal)
    !checker.would_violate_consecutive_games?(detail.away_team, detail.home_team)
  end

  def notify_optimization_complete(match_proposal)
    league = match_proposal.league
    league.organization.users.admin.each do |admin|
      LeagueMailer.schedule_optimized(admin, league, match_proposal).deliver_later
    end
  end

  def notify_optimization_failure(match_proposal_id, error_message)
    match_proposal = MatchProposal.find_by(id: match_proposal_id)
    return unless match_proposal

    league = match_proposal.league
    league.organization.users.admin.each do |admin|
      LeagueMailer.schedule_optimization_failed(admin, league, error_message).deliver_later
    end
  end
end