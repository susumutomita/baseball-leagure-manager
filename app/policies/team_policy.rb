class TeamPolicy < ApplicationPolicy
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
    user.admin? || record.manager_id == user.id
  end

  def destroy?
    user.admin? || record.manager_id == user.id
  end

  class Scope < Scope
    def resolve
      scope.all
    end
  end
end
