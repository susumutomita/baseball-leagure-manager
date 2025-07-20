# frozen_string_literal: true

module Ai
  class TravelDistanceOptimizer
    attr_reader :subject

    def initialize(subject)
      @subject = subject # Can be a League or MatchProposal
    end

    def optimize
      if subject.is_a?(MatchProposal)
        optimize_match_proposal
      else
        optimize_league_schedule
      end
    end

    def cluster_teams_by_location(teams)
      # Simple k-means clustering based on location
      return [teams] if teams.size <= 4

      # Filter teams with location data
      located_teams = teams.select { |t| t.latitude.present? && t.longitude.present? }
      unlocated_teams = teams - located_teams

      # If not enough teams have location data, return as single cluster
      return [teams] if located_teams.size < 2

      # Determine optimal number of clusters (roughly sqrt of team count)
      k = [Math.sqrt(located_teams.size).round, 2].max
      k = [k, located_teams.size].min

      clusters = perform_kmeans_clustering(located_teams, k)
      
      # Add unlocated teams to the smallest cluster
      unless unlocated_teams.empty?
        smallest_cluster = clusters.min_by(&:size)
        smallest_cluster.concat(unlocated_teams)
      end

      clusters
    end

    def calculate_total_travel_distance(matches)
      matches.sum do |match|
        calculate_distance(
          match[:home_team] || match.home_team,
          match[:away_team] || match.away_team
        )
      end
    end

    def find_optimal_venue(home_team, away_team, available_venues = nil)
      # If no venues specified, use home team's venue
      return home_team.home_venue || "#{home_team.city} Stadium" unless available_venues&.any?

      # Find venue that minimizes total travel for both teams
      optimal_venue = available_venues.min_by do |venue|
        home_distance = calculate_distance_to_venue(home_team, venue)
        away_distance = calculate_distance_to_venue(away_team, venue)
        home_distance + away_distance
      end

      optimal_venue[:name]
    end

    def create_travel_efficient_schedule(teams, constraints = {})
      matches = []
      match_date = constraints[:start_date] || 1.week.from_now

      # Create regional groups
      clusters = cluster_teams_by_location(teams)
      
      # Phase 1: Intra-cluster matches (minimize travel)
      clusters.each do |cluster|
        cluster.combination(2).each do |team1, team2|
          matches << {
            home_team: team1,
            away_team: team2,
            proposed_datetime: next_available_date(match_date, matches),
            phase: "regional"
          }
        end
      end

      # Phase 2: Inter-cluster matches (necessary for full league play)
      if clusters.size > 1 && constraints[:full_round_robin]
        clusters.combination(2).each do |cluster1, cluster2|
          create_inter_cluster_matches(cluster1, cluster2, matches, match_date)
        end
      end

      # Optimize match order to minimize back-to-back long trips
      optimize_match_order(matches)
    end

    private

    def optimize_match_proposal
      details = subject.match_proposal_details.includes(:home_team, :away_team)
      
      # Group matches by date
      matches_by_date = details.group_by { |d| d.proposed_datetime.to_date }
      
      optimized_schedule = []
      
      matches_by_date.each do |date, day_matches|
        # For each day, optimize the order to minimize total travel
        optimized_order = optimize_daily_schedule(day_matches)
        
        optimized_order.each_with_index do |match, index|
          optimized_schedule << {
            detail_id: match.id,
            datetime: date.to_datetime + (10 + index * 3).hours,
            venue: find_optimal_venue(match.home_team, match.away_team)
          }
        end
      end

      optimized_schedule
    end

    def optimize_league_schedule
      teams = subject.teams.includes(:current_strength_metric)
      create_travel_efficient_schedule(teams, {
        start_date: subject.start_date,
        full_round_robin: true
      })
    end

    def perform_kmeans_clustering(teams, k)
      # Initialize centroids randomly
      centroids = teams.sample(k).map { |t| [t.latitude, t.longitude] }
      
      # Run k-means iterations
      10.times do
        # Assign teams to nearest centroid
        clusters = Array.new(k) { [] }
        
        teams.each do |team|
          nearest_idx = find_nearest_centroid(team, centroids)
          clusters[nearest_idx] << team
        end

        # Update centroids
        clusters.each_with_index do |cluster, idx|
          next if cluster.empty?
          
          avg_lat = cluster.sum(&:latitude) / cluster.size.to_f
          avg_lon = cluster.sum(&:longitude) / cluster.size.to_f
          centroids[idx] = [avg_lat, avg_lon]
        end
      end

      # Final assignment
      final_clusters = Array.new(k) { [] }
      teams.each do |team|
        nearest_idx = find_nearest_centroid(team, centroids)
        final_clusters[nearest_idx] << team
      end

      final_clusters.reject(&:empty?)
    end

    def find_nearest_centroid(team, centroids)
      distances = centroids.map do |centroid|
        calculate_distance_between_points(
          team.latitude, team.longitude,
          centroid[0], centroid[1]
        )
      end
      
      distances.index(distances.min)
    end

    def calculate_distance(team1, team2)
      return 0.0 unless team1.latitude && team1.longitude && 
                        team2.latitude && team2.longitude

      calculate_distance_between_points(
        team1.latitude, team1.longitude,
        team2.latitude, team2.longitude
      )
    end

    def calculate_distance_between_points(lat1, lon1, lat2, lon2)
      # Haversine formula
      rad_per_deg = Math::PI / 180
      rkm = 6371

      dlat_rad = (lat2 - lat1) * rad_per_deg
      dlon_rad = (lon2 - lon1) * rad_per_deg

      lat1_rad = lat1 * rad_per_deg
      lat2_rad = lat2 * rad_per_deg

      a = Math.sin(dlat_rad / 2) ** 2 + 
          Math.cos(lat1_rad) * Math.cos(lat2_rad) * 
          Math.sin(dlon_rad / 2) ** 2
      
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      rkm * c
    end

    def calculate_distance_to_venue(team, venue)
      return 0.0 unless team.latitude && team.longitude && 
                        venue[:latitude] && venue[:longitude]

      calculate_distance_between_points(
        team.latitude, team.longitude,
        venue[:latitude], venue[:longitude]
      )
    end

    def next_available_date(base_date, existing_matches)
      # Simple implementation - can be enhanced
      latest_match = existing_matches.max_by { |m| m[:proposed_datetime] }
      
      if latest_match
        latest_match[:proposed_datetime] + 1.week
      else
        base_date
      end
    end

    def create_inter_cluster_matches(cluster1, cluster2, matches, base_date)
      # Select border teams (closest to other cluster) for inter-cluster play
      border_teams1 = find_border_teams(cluster1, cluster2)
      border_teams2 = find_border_teams(cluster2, cluster1)

      # Create matches between border teams
      border_teams1.product(border_teams2).each do |(team1, team2)|
        matches << {
          home_team: team1,
          away_team: team2,
          proposed_datetime: next_available_date(base_date, matches),
          phase: "inter_regional"
        }
      end
    end

    def find_border_teams(cluster, other_cluster)
      # Find teams in cluster closest to the other cluster
      cluster.sort_by do |team|
        next Float::INFINITY unless team.latitude && team.longitude
        
        # Average distance to teams in other cluster
        distances = other_cluster.map do |other_team|
          calculate_distance(team, other_team)
        end.compact
        
        distances.empty? ? Float::INFINITY : distances.sum / distances.size.to_f
      end.first([cluster.size / 3, 2].max)
    end

    def optimize_match_order(matches)
      # Use a simple greedy algorithm to minimize travel between consecutive away games
      optimized = []
      remaining = matches.dup
      
      # Start with a random match
      current = remaining.delete_at(0)
      optimized << current

      while remaining.any?
        # Find the next match that minimizes travel for teams
        next_match = find_next_optimal_match(current, remaining)
        remaining.delete(next_match)
        optimized << next_match
        current = next_match
      end

      optimized
    end

    def find_next_optimal_match(current_match, remaining_matches)
      # Simple heuristic: find match with teams geographically close to current match's teams
      remaining_matches.min_by do |match|
        # Calculate "transition cost" between matches
        transition_cost(current_match, match)
      end
    end

    def transition_cost(match1, match2)
      # Cost based on travel distance if same team plays consecutive away games
      cost = 0.0

      # Check if any team plays in both matches
      common_teams = [
        match1[:home_team], match1[:away_team]
      ] & [
        match2[:home_team], match2[:away_team]
      ]

      common_teams.each do |team|
        # If team plays away in both matches, add travel distance
        if match1[:away_team] == team && match2[:away_team] == team
          cost += calculate_distance(match1[:home_team], match2[:home_team])
        end
      end

      cost
    end

    def optimize_daily_schedule(matches)
      # For matches on the same day, optimize venue usage and minimize travel
      return matches if matches.size <= 1

      # TSP-like problem: find order that minimizes total travel
      # Using nearest neighbor heuristic
      optimized = []
      remaining = matches.dup
      
      # Start with match that has minimum total travel distance
      current = remaining.min_by { |m| m.travel_distance_km }
      remaining.delete(current)
      optimized << current

      while remaining.any?
        # Find nearest match based on venue proximity
        nearest = remaining.min_by do |match|
          venue_distance(current, match)
        end
        
        remaining.delete(nearest)
        optimized << nearest
        current = nearest
      end

      optimized
    end

    def venue_distance(match1, match2)
      # Estimate distance between match venues
      # If same venue, distance is 0
      return 0 if match1.proposed_venue == match2.proposed_venue

      # Otherwise use home team locations as proxy
      calculate_distance(match1.home_team, match2.home_team)
    end
  end
end