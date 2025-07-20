class User < ApplicationRecord
  # Acts as tenant
  acts_as_tenant :organization

  # Associations
  belongs_to :organization

  # Validations
  validates :keycloak_id, presence: true, uniqueness: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :organization_id }
  validates :role, inclusion: { in: %w[admin member viewer] }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :admins, -> { where(role: 'admin') }
  scope :members, -> { where(role: 'member') }
  scope :viewers, -> { where(role: 'viewer') }

  # Callbacks
  before_validation :normalize_email

  # Class methods
  def self.find_or_create_from_keycloak!(keycloak_attributes, organization)
    user = find_or_initialize_by(keycloak_id: keycloak_attributes[:id])

    user.assign_attributes(
      email: keycloak_attributes[:email],
      name: keycloak_attributes[:name] || "#{keycloak_attributes[:given_name]} #{keycloak_attributes[:family_name]}".strip,
      organization: organization,
      last_login_at: Time.current
    )

    user.save!
    user
  end

  def self.system_user
    # Returns a system user for automated operations
    # In production, this should be properly configured
    find_by(email: 'system@example.com') || User.first
  end

  # Instance methods
  def admin?
    role == 'admin'
  end

  def member?
    role == 'member'
  end

  def viewer?
    role == 'viewer'
  end

  def can_manage_organization?
    admin?
  end

  def can_manage_teams?
    admin? || member?
  end

  def can_view_only?
    viewer?
  end

  def deactivate!
    update!(active: false)
  end

  def activate!
    update!(active: true)
  end

  def update_last_login!
    update_column(:last_login_at, Time.current)
  end

  def display_name
    name.presence || email.split('@').first
  end

  private

  def normalize_email
    self.email = email.downcase.strip if email.present?
  end
end

