class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
         
  has_many :team_memberships, dependent: :destroy
  has_many :teams, through: :team_memberships
  has_many :managed_teams, class_name: 'Team', foreign_key: 'manager_id', dependent: :nullify
  has_many :managed_leagues, class_name: 'League', foreign_key: 'admin_id', dependent: :nullify
  has_many :payments, dependent: :destroy
  
  enum role: { player: 0, team_manager: 1, league_admin: 2, system_admin: 3 }
  
  validates :name, presence: true
  validates :phone, presence: true, uniqueness: true
  
  def admin?
    league_admin? || system_admin?
  end
  
  def manager?
    team_manager? || admin?
  end
end
