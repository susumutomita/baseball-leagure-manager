# frozen_string_literal: true

class PerformanceReportPolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def show?
    return false unless user.present?
    
    # Users can view their own reports
    return true if record.generated_by_id == user.id
    
    # Admins can view all reports
    return true if user.admin?
    
    # Team coaches can view team and player reports for their team
    if user.member? && record.reportable_type == 'Team'
      return record.reportable.coach_id == user.id if record.reportable.respond_to?(:coach_id)
    end
    
    # Players can view their own reports
    if record.reportable_type == 'Player'
      return record.reportable.user_id == user.id if record.reportable.respond_to?(:user_id)
    end
    
    false
  end

  def create?
    user.present? && (user.admin? || user.member?)
  end

  def download?
    show?
  end

  def regenerate?
    return false unless user.present?
    
    # Only admins and the original generator can regenerate
    user.admin? || record.generated_by_id == user.id
  end

  def send_report?
    regenerate?
  end

  def schedule?
    user.present? && user.admin?
  end

  def export?
    user.present? && (user.admin? || user.member?)
  end

  class Scope < Scope
    def resolve
      if user.admin?
        scope.all
      elsif user.member?
        # Members can see reports they generated or reports for their teams
        scope.where(generated_by: user)
             .or(scope.where(reportable_type: 'Organization'))
      else
        # Regular users can only see their own reports
        scope.where(generated_by: user)
      end
    end
  end
end