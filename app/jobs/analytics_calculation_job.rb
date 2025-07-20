# frozen_string_literal: true

class AnalyticsCalculationJob < ApplicationJob
  queue_as :analytics

  def perform(organization, season = nil)
    Rails.logger.info "Starting analytics calculation for organization ##{organization.id}"
    
    season ||= Season.current
    
    # Calculate player analytics
    performance_analyzer = Analytics::PerformanceAnalyzer.new
    
    organization.players.find_each do |player|
      begin
        performance_analyzer.analyze_player(player, season: season, force_recalculate: true)
      rescue StandardError => e
        Rails.logger.error "Failed to calculate analytics for player ##{player.id}: #{e.message}"
      end
    end
    
    # Calculate team analytics
    organization.teams.find_each do |team|
      begin
        TeamAnalytics.calculate_for_team(team, season)
      rescue StandardError => e
        Rails.logger.error "Failed to calculate analytics for team ##{team.id}: #{e.message}"
      end
    end
    
    Rails.logger.info "Completed analytics calculation for organization ##{organization.id}"
  end
end