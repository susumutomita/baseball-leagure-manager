# frozen_string_literal: true

class FinancialInsightGeneratorJob < ApplicationJob
  queue_as :low

  def perform(financial_report)
    # Generate AI insights for the financial report
    advisor = Ai::FinancialAdvisor.new(organization: financial_report.organization)
    
    # Get comprehensive advice
    advice = advisor.generate_financial_advice
    
    # Update report with insights
    financial_report.update!(
      insights: {
        generated_at: Time.current,
        summary: advice[:summary],
        key_findings: advice[:priority_issues],
        recommendations: advice[:short_term_actions],
        long_term_strategy: advice[:long_term_strategy],
        action_items: advice[:action_plan]
      }
    )
    
    Rails.logger.info "Generated insights for financial report #{financial_report.id}"
  end
end