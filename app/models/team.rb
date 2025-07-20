class Team < ApplicationRecord
  include TenantScoped

  # Associations
  has_many :players, dependent: :destroy
  has_many :home_matches, class_name: 'Match', foreign_key: 'home_team_id'
  has_many :away_matches, class_name: 'Match', foreign_key: 'away_team_id'
  has_many :transactions
  has_many :team_strength_metrics, dependent: :destroy
  has_one :current_strength_metric, -> { where(is_current: true) }, class_name: 'TeamStrengthMetric'
  has_many :team_analytics, dependent: :destroy
  has_many :performance_reports, as: :reportable, dependent: :destroy

  # AI Scheduler associations
  has_many :schedule_conflicts, dependent: :destroy

  # Validations
  validates :name, presence: true, uniqueness: true
  validates :city, presence: true
  validates :manager_name, presence: true
  validates :contact_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Methods
  def matches
    Match.where('home_team_id = ? OR away_team_id = ?', id, id)
  end

  def win_loss_record
    wins = matches.where(
      '(home_team_id = ? AND home_score > away_score) OR (away_team_id = ? AND away_score > home_score)', id, id
    ).count
    losses = matches.where(
      '(home_team_id = ? AND home_score < away_score) OR (away_team_id = ? AND away_score < home_score)', id, id
    ).count
    { wins: wins, losses: losses }
  end

  # AI Scheduler methods
  def has_conflict_on?(date, start_time = nil, end_time = nil)
    matches_on_date = matches.where('DATE(scheduled_at) = ?', date)

    if start_time && end_time
      matches_on_date = matches_on_date.where(
        'TIME(scheduled_at) BETWEEN ? AND ?',
        start_time,
        end_time
      )
    end

    matches_on_date.exists?
  end

  def next_available_date(from_date = Date.current)
    # 直近の試合がない日を探す
    date = from_date
    date += 1.day while has_conflict_on?(date)
    date
  end

  def travel_distance_to(venue)
    return nil unless home_venue_address.present? && venue.present?

    # Geocodingを使用して距離を計算（実装例）
    # 実際の実装では、チームの本拠地情報が必要
    return unless respond_to?(:geocoded?) && geocoded? && venue.geocoded?

    distance_to([venue.latitude, venue.longitude])

  end

  def schedule_density(date_range)
    matches_in_range = matches.where(scheduled_at: date_range).count
    total_days = date_range.count

    return 0 if total_days.zero?

    (matches_in_range.to_f / total_days * 100).round(2)
  end
end
