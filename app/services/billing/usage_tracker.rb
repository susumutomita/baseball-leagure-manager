# frozen_string_literal: true

module Billing
  class UsageTracker
    attr_reader :organization

    def initialize(organization)
      @organization = organization
    end

    def track_team_creation(team)
      track_usage('teams', 1, { team_id: team.id, team_name: team.name })
      check_team_limit
    end

    def track_team_deletion(team)
      track_usage('teams', -1, { team_id: team.id, team_name: team.name })
    end

    def track_match_creation(match)
      track_usage('matches_per_month', 1, { match_id: match.id })
      check_match_limit
    end

    def track_player_addition(player, team)
      track_usage('players_per_team', 1, { 
        player_id: player.id, 
        team_id: team.id,
        team_name: team.name 
      })
      check_player_limit(team)
    end

    def track_api_call(endpoint:, method:, user: nil)
      Usage.track_api_call(
        organization: organization,
        endpoint: endpoint,
        method: method
      )
      
      # Check API limit
      if api_limit_exceeded?
        raise 'API呼び出し制限を超過しました。プランをアップグレードしてください。'
      end
    end

    def track_storage_usage(bytes_added)
      Usage.track_storage_change(
        organization: organization,
        bytes_added: bytes_added
      )
      
      check_storage_limit
    end

    def get_current_usage_summary
      subscription = organization.organization_subscription
      return {} unless subscription

      {
        teams: {
          used: organization.teams.count,
          limit: subscription.subscription_plan.limit_for('teams'),
          percentage: calculate_usage_percentage('teams')
        },
        matches_this_month: {
          used: matches_this_month,
          limit: subscription.subscription_plan.limit_for('matches_per_month'),
          percentage: calculate_usage_percentage('matches_per_month')
        },
        max_players_per_team: {
          used: max_players_per_team,
          limit: subscription.subscription_plan.limit_for('players_per_team'),
          percentage: calculate_usage_percentage('players_per_team')
        },
        storage_gb: {
          used: storage_usage_gb.round(2),
          limit: subscription.subscription_plan.limit_for('storage_gb'),
          percentage: calculate_usage_percentage('storage_gb')
        },
        api_calls_today: {
          used: api_calls_today,
          limit: subscription.subscription_plan.limit_for('api_calls_per_day'),
          percentage: calculate_usage_percentage('api_calls_per_day')
        }
      }
    end

    def get_usage_trends(days: 30)
      end_date = Date.current
      start_date = end_date - days.days

      trends = {}
      
      # Daily API calls
      trends[:api_calls] = (start_date..end_date).map do |date|
        {
          date: date,
          count: Usage.aggregate_for_period(
            organization: organization,
            resource: 'api_calls',
            start_date: date.beginning_of_day,
            end_date: date.end_of_day
          )
        }
      end

      # Daily storage changes
      trends[:storage] = (start_date..end_date).map do |date|
        {
          date: date,
          bytes: Usage.aggregate_for_period(
            organization: organization,
            resource: 'storage_bytes',
            start_date: date.beginning_of_day,
            end_date: date.end_of_day
          )
        }
      end

      trends
    end

    def generate_usage_report(period: :monthly)
      case period
      when :daily
        generate_daily_report
      when :weekly
        generate_weekly_report
      when :monthly
        generate_monthly_report
      else
        raise ArgumentError, "Invalid period: #{period}"
      end
    end

    def alert_approaching_limits
      subscription = organization.organization_subscription
      return unless subscription&.active?

      alerts = []

      # Check each resource
      %w[teams matches_per_month players_per_team storage_gb api_calls_per_day].each do |resource|
        usage_percentage = calculate_usage_percentage(resource)
        
        if usage_percentage >= 90
          alerts << {
            resource: resource,
            usage_percentage: usage_percentage,
            current: subscription.current_usage_for(resource),
            limit: subscription.subscription_plan.limit_for(resource)
          }
        end
      end

      # Send alert if any limits are approaching
      if alerts.any?
        OrganizationMailer.usage_limit_alert(organization, alerts).deliver_later
      end

      alerts
    end

    private

    def track_usage(resource, quantity, metadata = {})
      return unless organization.organization_subscription&.active_or_trialing?

      Usage.record(
        organization: organization,
        resource: resource,
        quantity: quantity,
        metadata: metadata
      )
    end

    def check_team_limit
      subscription = organization.organization_subscription
      return unless subscription

      unless subscription.within_usage_limit?('teams')
        if subscription.subscription_plan.pro? || subscription.subscription_plan.enterprise?
          # Track overage for billing
          track_overage('teams')
        else
          # Prevent creation on basic plan
          raise 'チーム数の上限に達しました。プランをアップグレードしてください。'
        end
      end
    end

    def check_match_limit
      subscription = organization.organization_subscription
      return unless subscription

      unless subscription.within_usage_limit?('matches_per_month')
        if subscription.subscription_plan.pro? || subscription.subscription_plan.enterprise?
          track_overage('matches_per_month')
        else
          raise '月間試合数の上限に達しました。プランをアップグレードしてください。'
        end
      end
    end

    def check_player_limit(team)
      subscription = organization.organization_subscription
      return unless subscription

      players_count = team.players.count
      limit = subscription.subscription_plan.limit_for('players_per_team')

      if limit != -1 && players_count > limit
        if subscription.subscription_plan.pro? || subscription.subscription_plan.enterprise?
          track_overage('players_per_team')
        else
          raise 'チーム当たりの選手数上限に達しました。プランをアップグレードしてください。'
        end
      end
    end

    def check_storage_limit
      subscription = organization.organization_subscription
      return unless subscription

      unless subscription.within_usage_limit?('storage_gb')
        if subscription.subscription_plan.pro? || subscription.subscription_plan.enterprise?
          track_overage('storage_gb')
        else
          raise 'ストレージ容量の上限に達しました。プランをアップグレードしてください。'
        end
      end
    end

    def api_limit_exceeded?
      subscription = organization.organization_subscription
      return false unless subscription

      !subscription.within_usage_limit?('api_calls_per_day')
    end

    def track_overage(resource)
      # Record overage for billing purposes
      overage_amount = organization.organization_subscription.overage_for(resource)
      
      Rails.logger.info "Overage tracked for organization #{organization.id}: #{resource} - #{overage_amount}"
      
      # You might want to send this to Stripe as a usage record
      # or accumulate it for the next invoice
    end

    def calculate_usage_percentage(resource)
      subscription = organization.organization_subscription
      return 0 unless subscription

      limit = subscription.subscription_plan.limit_for(resource)
      return 0 if limit == -1 # Unlimited

      current = subscription.current_usage_for(resource)
      ((current.to_f / limit) * 100).round(2)
    end

    def matches_this_month
      organization.matches.where(
        created_at: Time.current.beginning_of_month..Time.current.end_of_month
      ).count
    end

    def max_players_per_team
      organization.teams.joins(:players).group('teams.id').count.values.max || 0
    end

    def storage_usage_gb
      # Calculate from Active Storage
      total_bytes = organization.teams
                              .joins(logo_attachment: :blob)
                              .sum('active_storage_blobs.byte_size')
      
      total_bytes / 1.gigabyte.to_f
    end

    def api_calls_today
      Usage.aggregate_for_period(
        organization: organization,
        resource: 'api_calls',
        start_date: Time.current.beginning_of_day,
        end_date: Time.current.end_of_day
      )
    end

    def generate_daily_report
      {
        date: Date.current,
        usage: get_current_usage_summary,
        api_calls: api_calls_today,
        new_teams: organization.teams.where(created_at: Date.current.all_day).count,
        new_matches: organization.matches.where(created_at: Date.current.all_day).count
      }
    end

    def generate_weekly_report
      start_date = 1.week.ago.beginning_of_day
      end_date = Time.current.end_of_day

      {
        period: "#{start_date.to_date} - #{end_date.to_date}",
        usage: get_current_usage_summary,
        total_api_calls: Usage.aggregate_for_period(
          organization: organization,
          resource: 'api_calls',
          start_date: start_date,
          end_date: end_date
        ),
        new_teams: organization.teams.where(created_at: start_date..end_date).count,
        new_matches: organization.matches.where(created_at: start_date..end_date).count,
        trends: get_usage_trends(days: 7)
      }
    end

    def generate_monthly_report
      start_date = Time.current.beginning_of_month
      end_date = Time.current.end_of_month

      {
        month: start_date.strftime('%Y年%m月'),
        usage: get_current_usage_summary,
        total_api_calls: Usage.aggregate_for_period(
          organization: organization,
          resource: 'api_calls',
          start_date: start_date,
          end_date: end_date
        ),
        total_matches: organization.matches.where(created_at: start_date..end_date).count,
        overage_charges: organization.organization_subscription&.calculate_overage_charges || {},
        trends: get_usage_trends(days: 30)
      }
    end
  end
end