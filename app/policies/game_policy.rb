class GamePolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    user.admin? || user.league_admin?
  end

  def update?
    user.admin? || user.league_admin? || record.league.admin_id == user.id
  end

  def destroy?
    user.admin? || user.league_admin? || record.league.admin_id == user.id
  end
  
  def complete?
    update? || record.umpire_id == user.id
  end

  class Scope < Scope
    def resolve
      scope.all
    end
  end
end
