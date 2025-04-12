class TeamMembership < ApplicationRecord
  belongs_to :user
  belongs_to :team
  
  enum role: { player: 0, coach: 1, manager: 2 }
  
  validates :user_id, uniqueness: { scope: :team_id }
  validates :jersey_number, uniqueness: { scope: :team_id }, allow_nil: true
  
  scope :active, -> { where(active: true) }
end
