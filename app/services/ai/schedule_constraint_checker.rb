# frozen_string_literal: true

module Ai
  class ScheduleConstraintChecker
    attr_reader :match_proposal, :config

    def initialize(match_proposal, config = nil)
      @match_proposal = match_proposal
      @config = config || match_proposal&.ai_matching_config
    end

    def check_all_constraints
      violations = []

      violations.concat(check_minimum_days_between_matches)
      violations.concat(check_consecutive_home_away_games)
      violations.concat(check_venue_availability)
      violations.concat(check_team_blackout_dates)
      violations.concat(check_max_games_per_week)
      violations.concat(check_travel_distance_limits)
      violations.concat(check_custom_constraints)

      violations
    end

    def check_minimum_days_between_matches
      violations = []
      return violations unless config&.min_days_between_matches&.positive?

      teams = match_proposal.affected_teams
      
      teams.each do |team|
        team_matches = match_proposal.match_proposal_details
                                    .select { |d| d.home_team_id == team.id || d.away_team_id == team.id }
                                    .sort_by(&:proposed_datetime)

        team_matches.each_cons(2) do |match1, match2|
          days_between = (match2.proposed_datetime - match1.proposed_datetime) / 1.day
          
          if days_between < config.min_days_between_matches
            violations << {
              type: :insufficient_rest,
              severity: :high,
              team_id: team.id,
              team_name: team.name,
              matches: [match1.id, match2.id],
              message: "#{team.name}の試合間隔が#{days_between.round(1)}日で、" \
                      "最小必要日数#{config.min_days_between_matches}日を下回っています",
              suggested_fix: "試合日程を調整して、最低#{config.min_days_between_matches}日の間隔を確保してください"
            }
          end
        end
      end

      violations
    end

    def check_consecutive_home_away_games
      violations = []
      return violations unless config

      teams = match_proposal.affected_teams
      
      teams.each do |team|
        team_matches = match_proposal.match_proposal_details
                                    .select { |d| d.home_team_id == team.id || d.away_team_id == team.id }
                                    .sort_by(&:proposed_datetime)

        consecutive_home = 0
        consecutive_away = 0
        
        team_matches.each_with_index do |match, index|
          if match.home_team_id == team.id
            consecutive_home += 1
            consecutive_away = 0
            
            if consecutive_home > config.max_consecutive_home_games
              violations << create_consecutive_violation(
                team, :home, consecutive_home, 
                team_matches[index - consecutive_home + 1..index]
              )
            end
          else
            consecutive_away += 1
            consecutive_home = 0
            
            if consecutive_away > config.max_consecutive_away_games
              violations << create_consecutive_violation(
                team, :away, consecutive_away,
                team_matches[index - consecutive_away + 1..index]
              )
            end
          end
        end
      end

      violations
    end

    def check_venue_availability
      violations = []
      
      # Group matches by venue and datetime
      venue_schedule = {}
      
      match_proposal.match_proposal_details.each do |detail|
        venue = detail.proposed_venue
        next unless venue.present?

        datetime_key = detail.proposed_datetime.strftime("%Y-%m-%d %H:00")
        venue_schedule[venue] ||= {}
        venue_schedule[venue][datetime_key] ||= []
        venue_schedule[venue][datetime_key] << detail
      end

      # Check for conflicts
      venue_schedule.each do |venue, schedule|
        schedule.each do |datetime, matches|
          if matches.size > 1
            violations << {
              type: :venue_conflict,
              severity: :high,
              venue: venue,
              datetime: datetime,
              matches: matches.map(&:id),
              message: "#{venue}で#{datetime}に#{matches.size}試合が重複しています",
              suggested_fix: "異なる時間帯または会場に変更してください"
            }
          end
        end
      end

      # Also check against existing matches
      check_existing_venue_conflicts(violations)
      
      violations
    end

    def check_team_blackout_dates
      violations = []
      
      # This would integrate with team preferences/blackout dates if available
      # For now, check common blackout periods
      
      match_proposal.match_proposal_details.each do |detail|
        # Check for matches on major holidays
        if major_holiday?(detail.proposed_datetime)
          violations << {
            type: :blackout_date,
            severity: :medium,
            match_id: detail.id,
            date: detail.proposed_datetime.to_date,
            message: "#{detail.proposed_datetime.strftime('%Y年%m月%d日')}は祝日のため、" \
                    "試合開催が困難な可能性があります",
            suggested_fix: "チームに確認するか、別の日程を検討してください"
          }
        end
      end

      violations
    end

    def check_max_games_per_week
      violations = []
      max_per_week = config&.max_games_per_week || 3
      
      teams = match_proposal.affected_teams
      
      teams.each do |team|
        team_matches = match_proposal.match_proposal_details
                                    .select { |d| d.home_team_id == team.id || d.away_team_id == team.id }

        # Group by week
        matches_by_week = team_matches.group_by do |match|
          match.proposed_datetime.beginning_of_week
        end

        matches_by_week.each do |week_start, week_matches|
          if week_matches.size > max_per_week
            violations << {
              type: :too_many_games_per_week,
              severity: :high,
              team_id: team.id,
              team_name: team.name,
              week: week_start.strftime("%Y年%m月%d日の週"),
              game_count: week_matches.size,
              message: "#{team.name}が#{week_start.strftime('%Y年%m月%d日')}の週に" \
                      "#{week_matches.size}試合あり、週間上限#{max_per_week}試合を超えています",
              suggested_fix: "一部の試合を他の週に移動してください"
            }
          end
        end
      end

      violations
    end

    def check_travel_distance_limits
      violations = []
      max_distance = config&.max_travel_distance_km
      return violations unless max_distance&.positive?

      match_proposal.match_proposal_details.each do |detail|
        distance = detail.travel_distance_km
        
        if distance > max_distance
          violations << {
            type: :excessive_travel,
            severity: :medium,
            match_id: detail.id,
            home_team: detail.home_team.name,
            away_team: detail.away_team.name,
            distance: distance.round(1),
            message: "#{detail.away_team.name}の移動距離が#{distance.round(1)}kmで、" \
                    "上限#{max_distance}kmを超えています",
            suggested_fix: "より近い対戦相手を検討するか、中立地での開催を検討してください"
          }
        end
      end

      violations
    end

    def check_custom_constraints
      violations = []
      return violations unless config&.custom_rules.present?

      rules = config.custom_rules
      
      # Example custom constraints
      if rules['no_night_games_for_teams']
        check_night_game_constraints(violations, rules['no_night_games_for_teams'])
      end

      if rules['rivalry_spacing']
        check_rivalry_spacing(violations, rules['rivalry_spacing'])
      end

      if rules['weather_constraints']
        check_weather_constraints(violations, rules['weather_constraints'])
      end

      violations
    end

    def would_violate_consecutive_games?(home_team, away_team)
      # Quick check for swap validation
      return false unless config

      # This is a simplified check - in production, would need full schedule context
      false
    end

    def validate_proposed_change(detail, new_datetime: nil, new_venue: nil)
      temp_violations = []

      if new_datetime
        # Check if new datetime would cause violations
        original_datetime = detail.proposed_datetime
        detail.proposed_datetime = new_datetime
        
        temp_violations.concat(check_minimum_days_between_matches)
        temp_violations.concat(check_venue_availability)
        
        detail.proposed_datetime = original_datetime
      end

      if new_venue
        # Check venue availability at the proposed time
        conflicts = Match.where(
          venue: new_venue,
          scheduled_at: (detail.proposed_datetime - 3.hours)..(detail.proposed_datetime + 3.hours)
        )
        
        if conflicts.exists?
          temp_violations << {
            type: :venue_conflict,
            severity: :high,
            message: "#{new_venue}は指定時間に既に予約されています"
          }
        end
      end

      temp_violations
    end

    private

    def create_consecutive_violation(team, type, count, matches)
      {
        type: :"excessive_consecutive_#{type}_games",
        severity: :medium,
        team_id: team.id,
        team_name: team.name,
        consecutive_count: count,
        matches: matches.map(&:id),
        message: "#{team.name}が#{count}試合連続で#{type == :home ? 'ホーム' : 'アウェイ'}になっており、" \
                "上限#{config.send("max_consecutive_#{type}_games")}試合を超えています",
        suggested_fix: "#{type == :home ? 'アウェイ' : 'ホーム'}試合を間に挟むように調整してください"
      }
    end

    def check_existing_venue_conflicts(violations)
      match_proposal.match_proposal_details.each do |detail|
        next unless detail.proposed_venue.present?

        existing_matches = Match.where(
          venue: detail.proposed_venue,
          scheduled_at: (detail.proposed_datetime - 2.hours)..(detail.proposed_datetime + 2.hours)
        ).where.not(status: [:cancelled, :postponed])

        if existing_matches.exists?
          violations << {
            type: :existing_venue_conflict,
            severity: :high,
            match_id: detail.id,
            venue: detail.proposed_venue,
            datetime: detail.proposed_datetime,
            existing_match_ids: existing_matches.pluck(:id),
            message: "#{detail.proposed_venue}は#{detail.proposed_datetime.strftime('%Y年%m月%d日 %H時')}頃に" \
                    "既に別の試合が予定されています",
            suggested_fix: "時間を3時間以上ずらすか、別の会場を選択してください"
          }
        end
      end
    end

    def major_holiday?(date)
      # Japanese holidays - simplified version
      holidays = [
        Date.new(date.year, 1, 1),   # New Year
        Date.new(date.year, 5, 3),   # Constitution Day
        Date.new(date.year, 5, 4),   # Greenery Day
        Date.new(date.year, 5, 5),   # Children's Day
        Date.new(date.year, 8, 11),  # Mountain Day
        Date.new(date.year, 11, 3),  # Culture Day
        Date.new(date.year, 11, 23), # Labor Thanksgiving Day
      ]

      holidays.include?(date.to_date)
    end

    def check_night_game_constraints(violations, team_names)
      return unless team_names.is_a?(Array)

      match_proposal.match_proposal_details.each do |detail|
        if team_names.include?(detail.home_team.name) || team_names.include?(detail.away_team.name)
          if detail.proposed_datetime.hour >= 18
            violations << {
              type: :night_game_restriction,
              severity: :medium,
              match_id: detail.id,
              message: "指定されたチームは夜間の試合ができません",
              suggested_fix: "日中の時間帯に変更してください"
            }
          end
        end
      end
    end

    def check_rivalry_spacing(violations, rivalry_rules)
      return unless rivalry_rules.is_a?(Hash)

      rivalry_rules.each do |rivalry_name, rules|
        team1_name = rules['team1']
        team2_name = rules['team2']
        min_games_between = rules['min_games_between'] || 10

        team1 = match_proposal.league.teams.find_by(name: team1_name)
        team2 = match_proposal.league.teams.find_by(name: team2_name)
        
        next unless team1 && team2

        rivalry_matches = match_proposal.match_proposal_details.select do |d|
          (d.home_team_id == team1.id && d.away_team_id == team2.id) ||
          (d.home_team_id == team2.id && d.away_team_id == team1.id)
        end.sort_by(&:proposed_datetime)

        rivalry_matches.each_cons(2) do |match1, match2|
          games_between = count_games_between(team1, match1.proposed_datetime, match2.proposed_datetime) +
                         count_games_between(team2, match1.proposed_datetime, match2.proposed_datetime)

          if games_between < min_games_between
            violations << {
              type: :rivalry_spacing,
              severity: :low,
              matches: [match1.id, match2.id],
              message: "#{rivalry_name}の試合間隔が近すぎます（#{games_between}試合）",
              suggested_fix: "最低#{min_games_between}試合の間隔を空けることを推奨します"
            }
          end
        end
      end
    end

    def check_weather_constraints(violations, weather_rules)
      return unless weather_rules.is_a?(Hash)

      # Example: No games in certain months for northern teams
      if weather_rules['winter_break_teams']
        winter_months = weather_rules['winter_months'] || [12, 1, 2]
        team_names = weather_rules['winter_break_teams']

        match_proposal.match_proposal_details.each do |detail|
          if winter_months.include?(detail.proposed_datetime.month)
            if team_names.include?(detail.home_team.name)
              violations << {
                type: :weather_constraint,
                severity: :medium,
                match_id: detail.id,
                message: "#{detail.home_team.name}は冬季期間中はホーム試合を開催できません",
                suggested_fix: "春季または秋季に変更してください"
              }
            end
          end
        end
      end
    end

    def count_games_between(team, date1, date2)
      # Count how many games the team would play between two dates
      match_proposal.match_proposal_details.count do |detail|
        (detail.home_team_id == team.id || detail.away_team_id == team.id) &&
        detail.proposed_datetime > date1 &&
        detail.proposed_datetime < date2
      end
    end
  end
end