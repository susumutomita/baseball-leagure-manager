class Organization < ApplicationRecord
  # Associations
  has_many :users, dependent: :destroy
  has_many :teams, dependent: :destroy
  has_many :leagues, dependent: :destroy
  has_many :players, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :matches, dependent: :destroy
  
  # Billing associations
  has_one :organization_subscription, dependent: :destroy
  has_many :payment_methods, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :usages, dependent: :destroy

  # Validations
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true,
                   format: { with: /\A[a-z0-9\-]+\z/, message: "は小文字英数字とハイフンのみ使用可能です" }
  validates :domain, uniqueness: { allow_nil: true },
                     format: { with: /\A[a-z0-9\-\.]+\z/, message: "は有効なドメイン形式である必要があります" }, allow_blank: true
  validates :time_zone, inclusion: { in: ActiveSupport::TimeZone.all.map(&:name) }

  # Callbacks
  before_validation :set_default_slug, on: :create

  # Scopes
  scope :active, -> { where(active: true) }

  # Class methods
  def self.find_by_domain!(domain)
    find_by!(domain: domain, active: true)
  end

  # Instance methods
  def deactivate!
    update!(active: false)
  end

  def activate!
    update!(active: true)
  end

  def teams_limit_reached?
    return false unless max_teams_limit

    teams.count >= max_teams_limit
  end

  def players_limit_reached?
    return false unless max_players_limit

    players.count >= max_players_limit
  end

  def admin_users
    users.where(role: 'admin')
  end

  def member_users
    users.where(role: 'member')
  end

  # Billing methods
  def stripe_customer
    return nil unless stripe_customer_id.present?
    @stripe_customer ||= Stripe::Customer.retrieve(stripe_customer_id)
  rescue Stripe::InvalidRequestError
    nil
  end

  def create_stripe_customer!
    return if stripe_customer_id.present?

    customer = Stripe::Customer.create(
      email: admin_users.first&.email,
      name: name,
      metadata: {
        organization_id: id,
        organization_slug: slug
      }
    )

    update!(stripe_customer_id: customer.id)
    customer
  end

  def current_subscription
    organization_subscription
  end

  def subscribed?
    organization_subscription&.active_or_trialing?
  end

  def on_trial?
    organization_subscription&.in_trial?
  end

  def subscription_plan
    organization_subscription&.subscription_plan
  end

  def default_payment_method
    payment_methods.default.first
  end

  def can_access_feature?(feature)
    return false unless subscribed?
    organization_subscription.can_use_feature?(feature)
  end

  def within_plan_limits?(resource, count = 1)
    return false unless subscribed?
    organization_subscription.within_usage_limit?(resource, count)
  end

  private

  def set_default_slug
    return if slug.present?

    base_slug = name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')
    candidate_slug = base_slug
    counter = 1

    while Organization.exists?(slug: candidate_slug)
      candidate_slug = "#{base_slug}-#{counter}"
      counter += 1
    end

    self.slug = candidate_slug
  end
end

