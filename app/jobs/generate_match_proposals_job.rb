# frozen_string_literal: true

class GenerateMatchProposalsJob < ApplicationJob
  queue_as :default

  def perform(league_id, options = {})
    league = League.find(league_id)
    
    # Set organization context for multi-tenancy
    ActsAsTenant.with_tenant(league.organization) do
      engine = Ai::MatchingEngine.new(league, options)
      proposal = engine.generate_proposal
      
      # Notify league administrators
      notify_administrators(league, proposal) if proposal.persisted?
      
      proposal
    end
  rescue StandardError => e
    Rails.logger.error "GenerateMatchProposalsJob failed for league #{league_id}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    
    # Notify administrators of failure
    notify_failure(league_id, e.message) if league_id
    
    raise
  end

  private

  def notify_administrators(league, proposal)
    # Send notifications to league administrators
    league.organization.users.admin.each do |admin|
      LeagueMailer.match_proposal_generated(admin, league, proposal).deliver_later
    end
    
    # Create in-app notification
    create_notification(league, proposal)
  end

  def notify_failure(league_id, error_message)
    league = League.find_by(id: league_id)
    return unless league

    league.organization.users.admin.each do |admin|
      LeagueMailer.match_proposal_generation_failed(admin, league, error_message).deliver_later
    end
  end

  def create_notification(league, proposal)
    # This would integrate with a notification system
    # For now, log the event
    Rails.logger.info "Match proposal #{proposal.id} generated for league #{league.name}"
  end
end