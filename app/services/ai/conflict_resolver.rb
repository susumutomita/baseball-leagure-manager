# frozen_string_literal: true

module Ai
  class ConflictResolver
    attr_reader :organization, :season, :openai_client

    def initialize(organization:, season: nil)
      @organization = organization
      @season = season || organization.seasons.active.first
      @openai_client = OpenAiClient.new(ENV.fetch('OPENAI_API_KEY', ''))
    end

    def resolve_conflicts(conflicts)
      return { resolutions: [], unresolved: [] } if conflicts.empty?

      # Group conflicts by type for better analysis
      grouped_conflicts = group_conflicts_by_type(conflicts)
      
      # Generate AI-powered resolution suggestions
      ai_suggestions = generate_ai_resolution_suggestions(grouped_conflicts)
      
      # Apply resolutions based on AI suggestions and rules
      resolution_results = apply_conflict_resolutions(conflicts, ai_suggestions)
      
      # Generate detailed report
      generate_resolution_report(resolution_results, ai_suggestions)
    end

    def analyze_schedule_conflicts(matches)
      conflicts = []
      
      # Venue conflicts
      venue_conflicts = detect_venue_conflicts(matches)
      conflicts.concat(venue_conflicts)
      
      # Team scheduling conflicts
      team_conflicts = detect_team_conflicts(matches)
      conflicts.concat(team_conflicts)
      
      # Travel time conflicts
      travel_conflicts = detect_travel_conflicts(matches)
      conflicts.concat(travel_conflicts)
      
      # Weather-related conflicts
      weather_conflicts = detect_weather_conflicts(matches)
      conflicts.concat(weather_conflicts)
      
      # Generate comprehensive analysis
      {
        total_conflicts: conflicts.count,
        by_type: conflicts.group_by(&:type).transform_values(&:count),
        critical_conflicts: conflicts.select { |c| c.severity == 'critical' },
        conflicts: conflicts,
        ai_analysis: analyze_conflicts_with_ai(conflicts)
      }
    end

    def suggest_resolution_strategy(conflict)
      conflict_data = prepare_conflict_data(conflict)
      
      prompt = build_resolution_prompt(conflict_data)
      ai_response = openai_client.analyze(prompt)
      
      parse_resolution_strategy(ai_response, conflict)
    end

    def validate_resolution(conflict, proposed_resolution)
      validation_results = {
        valid: true,
        issues: [],
        alternative_suggestions: []
      }
      
      # Check venue availability
      if proposed_resolution[:venue_change]
        unless venue_available_for_resolution?(proposed_resolution)
          validation_results[:valid] = false
          validation_results[:issues] << "提案された会場は利用できません"
        end
      end
      
      # Check team availability
      if proposed_resolution[:time_change]
        unless teams_available_for_resolution?(proposed_resolution)
          validation_results[:valid] = false
          validation_results[:issues] << "チームのスケジュールが競合しています"
        end
      end
      
      # Get AI validation
      ai_validation = validate_with_ai(conflict, proposed_resolution)
      validation_results[:ai_feedback] = ai_validation
      
      validation_results
    end

    private

    def group_conflicts_by_type(conflicts)
      conflicts.group_by(&:conflict_type)
    end

    def generate_ai_resolution_suggestions(grouped_conflicts)
      prompt = <<~PROMPT
        以下のスケジュール競合を分析し、解決策を提案してください：

        #{format_conflicts_for_ai(grouped_conflicts)}

        各競合に対して以下の形式で解決策を提案してください：
        1. 競合の種類と重要度
        2. 推奨される解決策（具体的な日時や会場の変更案）
        3. 代替案（もし主要な解決策が実行できない場合）
        4. 解決による影響（他の試合やチームへの影響）
        5. 実施の優先順位

        すべての提案は日本語で、実現可能で具体的なものにしてください。
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_conflicts_for_ai(grouped_conflicts)
      grouped_conflicts.map do |type, conflicts|
        <<~TEXT
          【#{translate_conflict_type(type)}】
          競合数: #{conflicts.count}
          
          詳細:
          #{conflicts.map { |c| format_single_conflict(c) }.join("\n")}
        TEXT
      end.join("\n\n")
    end

    def translate_conflict_type(type)
      {
        'venue_overlap' => '会場の重複',
        'team_overlap' => 'チームスケジュールの重複',
        'travel_distance' => '移動時間の問題',
        'weather_risk' => '天候リスク',
        'back_to_back' => '連続試合'
      }[type] || type
    end

    def format_single_conflict(conflict)
      if conflict.respond_to?(:match) && conflict.respond_to?(:conflicting_match)
        match1 = conflict.match
        match2 = conflict.conflicting_match
        
        <<~TEXT
          - #{match1.home_team.name} vs #{match1.away_team.name} 
            (#{match1.scheduled_at.strftime('%Y/%m/%d %H:%M')}, #{match1.venue.name})
            と
            #{match2.home_team.name} vs #{match2.away_team.name}
            (#{match2.scheduled_at.strftime('%Y/%m/%d %H:%M')}, #{match2.venue.name})
        TEXT
      else
        "- 競合ID: #{conflict.try(:id) || 'N/A'}"
      end
    end

    def apply_conflict_resolutions(conflicts, ai_suggestions)
      results = {
        resolved: [],
        partially_resolved: [],
        unresolved: []
      }
      
      conflicts.each do |conflict|
        resolution_strategy = extract_strategy_for_conflict(conflict, ai_suggestions)
        
        if resolution_strategy
          result = attempt_resolution(conflict, resolution_strategy)
          
          case result[:status]
          when :resolved
            results[:resolved] << result
          when :partial
            results[:partially_resolved] << result
          else
            results[:unresolved] << result
          end
        else
          results[:unresolved] << {
            conflict: conflict,
            reason: 'AIによる解決策の生成に失敗しました'
          }
        end
      end
      
      results
    end

    def extract_strategy_for_conflict(conflict, ai_suggestions)
      # Parse AI suggestions to find strategy for specific conflict
      # This is a simplified implementation
      {
        primary_solution: {
          type: determine_resolution_type(conflict),
          details: generate_resolution_details(conflict)
        },
        alternatives: generate_alternative_solutions(conflict),
        priority: calculate_resolution_priority(conflict)
      }
    end

    def determine_resolution_type(conflict)
      case conflict.conflict_type
      when 'venue_overlap'
        :change_venue
      when 'team_overlap'
        :reschedule
      when 'travel_distance'
        :adjust_schedule_sequence
      else
        :reschedule
      end
    end

    def generate_resolution_details(conflict)
      case conflict.conflict_type
      when 'venue_overlap'
        find_alternative_venue_details(conflict)
      when 'team_overlap'
        find_alternative_time_slot(conflict)
      when 'travel_distance'
        optimize_travel_schedule(conflict)
      else
        {}
      end
    end

    def find_alternative_venue_details(conflict)
      match = conflict.match
      alternative_venues = organization.venues
                                     .where.not(id: match.venue_id)
                                     .where('capacity >= ?', match.expected_attendance || 500)
      
      suitable_venue = alternative_venues.find do |venue|
        venue_available?(venue, match.scheduled_at) &&
        reasonable_distance_for_teams?(venue, match)
      end
      
      if suitable_venue
        {
          new_venue_id: suitable_venue.id,
          new_venue_name: suitable_venue.name,
          distance_impact: calculate_distance_impact(match, suitable_venue)
        }
      else
        nil
      end
    end

    def find_alternative_time_slot(conflict)
      match = conflict.match
      base_date = match.scheduled_at.to_date
      
      # Try different time slots within a week
      (0..7).each do |days_offset|
        [10, 13, 16, 19].each do |hour|
          new_time = (base_date + days_offset.days).to_datetime.change(hour: hour)
          
          if time_slot_available?(match, new_time)
            return {
              new_datetime: new_time,
              days_moved: days_offset,
              impact_assessment: assess_schedule_change_impact(match, new_time)
            }
          end
        end
      end
      
      nil
    end

    def optimize_travel_schedule(conflict)
      # Complex logic to optimize travel between consecutive matches
      # This is a simplified version
      {
        suggestion: 'スケジュールの順序を調整して移動距離を最適化',
        estimated_travel_reduction: '30%'
      }
    end

    def generate_alternative_solutions(conflict)
      alternatives = []
      
      # Always consider rescheduling as an alternative
      alternatives << {
        type: :reschedule,
        description: '試合日程の変更'
      }
      
      # Venue change as alternative
      if conflict.conflict_type != 'venue_overlap'
        alternatives << {
          type: :change_venue,
          description: '会場の変更'
        }
      end
      
      # Doubleheader option
      if can_create_doubleheader?(conflict)
        alternatives << {
          type: :doubleheader,
          description: 'ダブルヘッダーとして開催'
        }
      end
      
      alternatives
    end

    def calculate_resolution_priority(conflict)
      priority_score = 50 # Base score
      
      # Match importance
      if conflict.match.match_type == 'playoff'
        priority_score += 30
      elsif conflict.match.match_type == 'final'
        priority_score += 40
      end
      
      # Time until match
      days_until_match = (conflict.match.scheduled_at.to_date - Date.current).to_i
      if days_until_match <= 7
        priority_score += 20
      elsif days_until_match <= 14
        priority_score += 10
      end
      
      # Conflict severity
      case conflict.try(:severity) || assess_conflict_severity(conflict)
      when 'critical'
        priority_score += 25
      when 'high'
        priority_score += 15
      when 'medium'
        priority_score += 5
      end
      
      priority_score
    end

    def assess_conflict_severity(conflict)
      # Determine severity based on conflict type and impact
      case conflict.conflict_type
      when 'venue_overlap', 'team_overlap'
        'critical'
      when 'travel_distance'
        'high'
      else
        'medium'
      end
    end

    def attempt_resolution(conflict, strategy)
      case strategy[:primary_solution][:type]
      when :change_venue
        attempt_venue_change(conflict, strategy[:primary_solution][:details])
      when :reschedule
        attempt_reschedule(conflict, strategy[:primary_solution][:details])
      when :adjust_schedule_sequence
        attempt_schedule_adjustment(conflict, strategy[:primary_solution][:details])
      else
        { status: :failed, conflict: conflict, reason: '未対応の解決タイプ' }
      end
    end

    def attempt_venue_change(conflict, details)
      return { status: :failed, conflict: conflict, reason: '代替会場が見つかりません' } unless details
      
      match = conflict.match
      
      ActiveRecord::Base.transaction do
        match.update!(venue_id: details[:new_venue_id])
        conflict.update!(resolution_status: 'resolved', resolution_details: details)
        
        { 
          status: :resolved, 
          conflict: conflict, 
          resolution: details,
          message: "会場を#{details[:new_venue_name]}に変更しました"
        }
      end
    rescue => e
      { status: :failed, conflict: conflict, reason: e.message }
    end

    def attempt_reschedule(conflict, details)
      return { status: :failed, conflict: conflict, reason: '代替日時が見つかりません' } unless details
      
      match = conflict.match
      
      ActiveRecord::Base.transaction do
        match.update!(scheduled_at: details[:new_datetime])
        conflict.update!(resolution_status: 'resolved', resolution_details: details)
        
        { 
          status: :resolved, 
          conflict: conflict, 
          resolution: details,
          message: "試合を#{details[:new_datetime].strftime('%Y/%m/%d %H:%M')}に変更しました"
        }
      end
    rescue => e
      { status: :failed, conflict: conflict, reason: e.message }
    end

    def attempt_schedule_adjustment(conflict, details)
      # This would involve more complex logic to adjust multiple matches
      { 
        status: :partial, 
        conflict: conflict, 
        message: '手動でのスケジュール調整が必要です',
        suggestions: details
      }
    end

    def generate_resolution_report(results, ai_suggestions)
      report = {
        summary: generate_resolution_summary(results),
        resolved_conflicts: format_resolved_conflicts(results[:resolved]),
        partial_resolutions: format_partial_resolutions(results[:partially_resolved]),
        unresolved_conflicts: format_unresolved_conflicts(results[:unresolved]),
        ai_insights: extract_ai_insights(ai_suggestions),
        recommendations: generate_recommendations(results),
        metrics: calculate_resolution_metrics(results)
      }
      
      # Generate Japanese report using AI
      generate_japanese_report(report)
    end

    def generate_resolution_summary(results)
      total = results.values.sum(&:count)
      resolved_count = results[:resolved].count
      
      {
        total_conflicts: total,
        resolved: resolved_count,
        partially_resolved: results[:partially_resolved].count,
        unresolved: results[:unresolved].count,
        success_rate: total > 0 ? (resolved_count.to_f / total * 100).round(2) : 0
      }
    end

    def generate_japanese_report(report)
      prompt = <<~PROMPT
        以下のスケジュール競合解決結果をもとに、わかりやすい日本語のレポートを作成してください：

        解決結果サマリー:
        - 総競合数: #{report[:summary][:total_conflicts]}
        - 解決済み: #{report[:summary][:resolved]}
        - 部分的解決: #{report[:summary][:partially_resolved]}
        - 未解決: #{report[:summary][:unresolved]}
        - 成功率: #{report[:summary][:success_rate]}%

        レポートには以下を含めてください：
        1. 全体的な解決状況の評価
        2. 主要な解決策の説明
        3. 残存する課題と推奨アクション
        4. 今後のスケジュール管理への提言

        プロフェッショナルで読みやすい形式でお願いします。
      PROMPT

      ai_report = openai_client.analyze(prompt)
      
      report.merge(
        japanese_summary: ai_report[:summary] || ai_report,
        generated_at: Time.current
      )
    end

    def detect_venue_conflicts(matches)
      conflicts = []
      
      matches.combination(2).each do |match1, match2|
        if match1.venue_id == match2.venue_id &&
           (match1.scheduled_at - match2.scheduled_at).abs < 3.hours
          
          conflicts << OpenStruct.new(
            type: 'venue_overlap',
            conflict_type: 'venue_overlap',
            match: match1,
            conflicting_match: match2,
            severity: 'critical',
            details: {
              venue_name: match1.venue.name,
              time_overlap: calculate_time_overlap(match1, match2)
            }
          )
        end
      end
      
      conflicts
    end

    def detect_team_conflicts(matches)
      conflicts = []
      teams = matches.flat_map { |m| [m.home_team, m.away_team] }.uniq
      
      teams.each do |team|
        team_matches = matches.select { |m| m.home_team == team || m.away_team == team }
                              .sort_by(&:scheduled_at)
        
        team_matches.each_cons(2) do |match1, match2|
          time_between = match2.scheduled_at - match1.scheduled_at
          
          if time_between < 5.hours
            conflicts << OpenStruct.new(
              type: 'team_overlap',
              conflict_type: 'team_overlap',
              match: match1,
              conflicting_match: match2,
              team: team,
              severity: time_between < 3.hours ? 'critical' : 'high',
              details: {
                team_name: team.name,
                time_between: time_between,
                requires_travel: match1.venue != match2.venue
              }
            )
          end
        end
      end
      
      conflicts
    end

    def detect_travel_conflicts(matches)
      conflicts = []
      teams = matches.flat_map { |m| [m.home_team, m.away_team] }.uniq
      
      teams.each do |team|
        team_matches = matches.select { |m| m.home_team == team || m.away_team == team }
                              .sort_by(&:scheduled_at)
        
        team_matches.each_cons(2) do |match1, match2|
          if match1.venue != match2.venue
            travel_time = estimate_travel_time(match1.venue, match2.venue)
            time_available = match2.scheduled_at - (match1.scheduled_at + 3.hours) # 3 hours for game
            
            if travel_time > time_available
              conflicts << OpenStruct.new(
                type: 'travel_distance',
                conflict_type: 'travel_distance',
                match: match1,
                conflicting_match: match2,
                team: team,
                severity: 'high',
                details: {
                  team_name: team.name,
                  travel_time_required: travel_time,
                  time_available: time_available,
                  distance: calculate_distance(match1.venue, match2.venue)
                }
              )
            end
          end
        end
      end
      
      conflicts
    end

    def detect_weather_conflicts(matches)
      conflicts = []
      weather_scheduler = WeatherAwareScheduler.new(organization: organization)
      
      matches.each do |match|
        next unless match.venue.outdoor?
        
        weather_check = weather_scheduler.check_match_weather(match)
        
        if weather_check[:confidence] < 50 || !weather_check[:playable]
          conflicts << OpenStruct.new(
            type: 'weather_risk',
            conflict_type: 'weather_risk',
            match: match,
            conflicting_match: nil,
            severity: weather_check[:confidence] < 30 ? 'high' : 'medium',
            details: {
              weather_confidence: weather_check[:confidence],
              playable: weather_check[:playable],
              reason: weather_check[:reason],
              weather_details: weather_check[:details]
            }
          )
        end
      end
      
      conflicts
    end

    def calculate_time_overlap(match1, match2)
      start1 = match1.scheduled_at
      end1 = match1.scheduled_at + 3.hours
      start2 = match2.scheduled_at
      end2 = match2.scheduled_at + 3.hours
      
      overlap_start = [start1, start2].max
      overlap_end = [end1, end2].min
      
      [(overlap_end - overlap_start) / 1.hour, 0].max.round(2)
    end

    def estimate_travel_time(venue1, venue2)
      return 0.hours if venue1 == venue2
      
      distance = calculate_distance(venue1, venue2)
      # Assume average speed of 60 km/h including preparation time
      (distance / 60.0).hours + 1.hour # Add 1 hour for preparation
    end

    def calculate_distance(venue1, venue2)
      return 0 unless venue1.geocoded? && venue2.geocoded?
      
      venue1.distance_from(venue2) || 50 # Default 50km if calculation fails
    end

    def venue_available?(venue, datetime)
      !Match.where(venue: venue)
            .where('scheduled_at BETWEEN ? AND ?', datetime - 3.hours, datetime + 3.hours)
            .exists?
    end

    def reasonable_distance_for_teams?(venue, match)
      home_distance = calculate_distance(match.home_team.home_venue, venue)
      away_distance = calculate_distance(match.away_team.home_venue, venue)
      
      # Both teams should be within reasonable distance (e.g., 100km)
      home_distance <= 100 && away_distance <= 100
    end

    def time_slot_available?(match, new_time)
      # Check venue availability
      return false unless venue_available?(match.venue, new_time)
      
      # Check team availability
      team_ids = [match.home_team_id, match.away_team_id]
      !Match.where('(home_team_id IN (?) OR away_team_id IN (?)) AND scheduled_at BETWEEN ? AND ?',
                   team_ids, team_ids, new_time - 5.hours, new_time + 5.hours)
            .where.not(id: match.id)
            .exists?
    end

    def can_create_doubleheader?(conflict)
      # Check if the conflicting matches share at least one team
      return false unless conflict.respond_to?(:match) && conflict.respond_to?(:conflicting_match)
      
      match1_teams = [conflict.match.home_team_id, conflict.match.away_team_id]
      match2_teams = [conflict.conflicting_match.home_team_id, conflict.conflicting_match.away_team_id]
      
      (match1_teams & match2_teams).any?
    end

    def venue_available_for_resolution?(resolution)
      venue = Venue.find_by(id: resolution[:venue_change])
      return false unless venue
      
      venue_available?(venue, resolution[:datetime] || resolution[:match].scheduled_at)
    end

    def teams_available_for_resolution?(resolution)
      match = resolution[:match]
      new_time = resolution[:time_change] || match.scheduled_at
      
      time_slot_available?(match, new_time)
    end

    def validate_with_ai(conflict, proposed_resolution)
      prompt = <<~PROMPT
        以下の競合解決案を検証してください：

        競合の詳細:
        #{format_single_conflict(conflict)}

        提案された解決策:
        #{format_proposed_resolution(proposed_resolution)}

        この解決策について以下の観点から評価してください：
        1. 実現可能性（0-100のスコア）
        2. 他への影響の最小化
        3. 公平性
        4. 潜在的な問題点
        5. 改善提案

        簡潔に日本語で回答してください。
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_proposed_resolution(resolution)
      parts = []
      
      if resolution[:venue_change]
        venue = Venue.find_by(id: resolution[:venue_change])
        parts << "会場変更: #{venue&.name || '不明'}"
      end
      
      if resolution[:time_change]
        parts << "時間変更: #{resolution[:time_change].strftime('%Y/%m/%d %H:%M')}"
      end
      
      parts.join("\n")
    end

    def build_resolution_prompt(conflict_data)
      <<~PROMPT
        以下のスケジュール競合に対する最適な解決策を提案してください：

        #{conflict_data}

        解決策は以下の要素を含めてください：
        1. 主要な解決方法
        2. 実施手順
        3. 影響を受ける関係者への対応
        4. リスクと対策

        日本語で具体的に回答してください。
      PROMPT
    end

    def prepare_conflict_data(conflict)
      <<~DATA
        競合タイプ: #{translate_conflict_type(conflict.conflict_type)}
        重要度: #{conflict.severity}
        
        関連試合:
        #{format_single_conflict(conflict)}
        
        制約条件:
        - シーズン終了日: #{season.end_date}
        - 利用可能な会場数: #{organization.venues.count}
      DATA
    end

    def parse_resolution_strategy(ai_response, conflict)
      {
        strategy: ai_response[:summary] || '解決策の生成に失敗しました',
        steps: ai_response[:suggestions] || [],
        risks: ai_response[:concerns] || [],
        priority: calculate_resolution_priority(conflict),
        confidence: extract_confidence_score(ai_response)
      }
    end

    def extract_confidence_score(ai_response)
      # Extract confidence score from AI response if mentioned
      # Default to 70 if not found
      70
    end

    def analyze_conflicts_with_ai(conflicts)
      return {} if conflicts.empty?
      
      prompt = <<~PROMPT
        #{conflicts.count}件のスケジュール競合を分析しました。
        
        競合タイプ別:
        #{conflicts.group_by(&:type).transform_values(&:count).map { |k, v| "- #{translate_conflict_type(k)}: #{v}件" }.join("\n")}
        
        この競合パターンについて以下を分析してください：
        1. 主な競合の原因
        2. システム的な改善提案
        3. 今後の予防策
        4. 緊急度の評価

        簡潔に日本語でまとめてください。
      PROMPT

      openai_client.analyze(prompt)
    end

    def format_resolved_conflicts(resolved)
      resolved.map do |result|
        {
          conflict_type: translate_conflict_type(result[:conflict].conflict_type),
          resolution: result[:message],
          details: result[:resolution]
        }
      end
    end

    def format_partial_resolutions(partial)
      partial.map do |result|
        {
          conflict_type: translate_conflict_type(result[:conflict].conflict_type),
          message: result[:message],
          suggestions: result[:suggestions]
        }
      end
    end

    def format_unresolved_conflicts(unresolved)
      unresolved.map do |result|
        {
          conflict_type: translate_conflict_type(result[:conflict].conflict_type),
          reason: result[:reason]
        }
      end
    end

    def extract_ai_insights(ai_suggestions)
      {
        summary: ai_suggestions[:summary],
        key_recommendations: ai_suggestions[:suggestions],
        risk_factors: ai_suggestions[:concerns]
      }
    end

    def generate_recommendations(results)
      recommendations = []
      
      if results[:unresolved].any?
        recommendations << {
          priority: 'high',
          action: 'シーズン日程の延長を検討',
          reason: "#{results[:unresolved].count}件の競合が未解決"
        }
      end
      
      if results[:partially_resolved].any?
        recommendations << {
          priority: 'medium',
          action: '手動でのスケジュール調整',
          reason: "#{results[:partially_resolved].count}件が部分的解決のみ"
        }
      end
      
      recommendations
    end

    def calculate_resolution_metrics(results)
      total = results.values.sum(&:count)
      
      {
        total_conflicts: total,
        resolution_rate: total > 0 ? (results[:resolved].count.to_f / total * 100).round(2) : 0,
        average_priority: calculate_average_priority(results),
        estimated_impact: estimate_resolution_impact(results)
      }
    end

    def calculate_average_priority(results)
      all_conflicts = results.values.flatten
      return 0 if all_conflicts.empty?
      
      priorities = all_conflicts.map { |r| calculate_resolution_priority(r[:conflict]) }
      (priorities.sum.to_f / priorities.count).round(2)
    end

    def estimate_resolution_impact(results)
      {
        matches_affected: count_affected_matches(results),
        teams_affected: count_affected_teams(results),
        venues_changed: count_venue_changes(results)
      }
    end

    def count_affected_matches(results)
      matches = Set.new
      
      results.values.flatten.each do |result|
        conflict = result[:conflict]
        matches.add(conflict.match.id) if conflict.respond_to?(:match)
        matches.add(conflict.conflicting_match.id) if conflict.respond_to?(:conflicting_match)
      end
      
      matches.count
    end

    def count_affected_teams(results)
      teams = Set.new
      
      results.values.flatten.each do |result|
        conflict = result[:conflict]
        if conflict.respond_to?(:match)
          teams.add(conflict.match.home_team_id)
          teams.add(conflict.match.away_team_id)
        end
      end
      
      teams.count
    end

    def count_venue_changes(results)
      results[:resolved].count { |r| r[:resolution]&.dig(:new_venue_id).present? }
    end

    def calculate_distance_impact(match, new_venue)
      original_total = calculate_distance(match.home_team.home_venue, match.venue) +
                      calculate_distance(match.away_team.home_venue, match.venue)
      
      new_total = calculate_distance(match.home_team.home_venue, new_venue) +
                  calculate_distance(match.away_team.home_venue, new_venue)
      
      {
        original_total_km: original_total.round(2),
        new_total_km: new_total.round(2),
        difference_km: (new_total - original_total).round(2),
        percentage_change: original_total > 0 ? ((new_total - original_total) / original_total * 100).round(2) : 0
      }
    end

    def assess_schedule_change_impact(match, new_time)
      days_moved = (new_time.to_date - match.scheduled_at.to_date).abs
      
      {
        days_moved: days_moved,
        day_of_week_change: match.scheduled_at.strftime('%A') != new_time.strftime('%A'),
        time_of_day_change: match.scheduled_at.hour != new_time.hour,
        estimated_attendance_impact: estimate_attendance_impact(days_moved)
      }
    end

    def estimate_attendance_impact(days_moved)
      # Simple estimation: attendance decreases with more days moved
      case days_moved
      when 0 then 0
      when 1..3 then -5
      when 4..7 then -10
      else -15
      end
    end
  end
end