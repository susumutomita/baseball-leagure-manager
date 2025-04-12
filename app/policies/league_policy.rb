class LeaguePolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    user.present?
  end

  def update?
    user.admin? || record.admin_id == user.id
  end

  def destroy?
    user.admin? || record.admin_id == user.id
  end
  
  def schedule?
    update?
  end
  
  def matchups?
    update?
  end
  
  def financial_report?
    update?
  end
  
  def budget_suggestions?
    update?
  end

  class Scope < Scope
    def resolve
      scope.all
    end
  end
end
