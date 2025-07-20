class RescheduledMatch < ApplicationRecord
  belongs_to :match
  belongs_to :original_venue, class_name: 'Venue', optional: true
  belongs_to :new_venue, class_name: 'Venue', optional: true
  belongs_to :initiated_by, class_name: 'User', optional: true

  RESCHEDULE_REASONS = %w[
    weather_rain
    weather_storm
    weather_extreme_heat
    weather_snow
    venue_unavailable
    venue_maintenance
    team_conflict
    official_unavailable
    emergency
    league_decision
    facility_issue
    transportation_issue
    other
  ].freeze

  validates :original_date, presence: true
  validates :new_date, presence: true
  validates :reason, presence: true, inclusion: { in: RESCHEDULE_REASONS }
  validates :description, length: { maximum: 500 }, allow_nil: true
  validates :notification_sent, inclusion: { in: [true, false] }
  validate :new_date_different_from_original
  validate :new_date_in_future, if: :new_date_changed?

  scope :by_reason, ->(reason) { where(reason: reason) }
  scope :weather_related, lambda {
    where(reason: %w[weather_rain weather_storm weather_extreme_heat weather_snow])
  }
  scope :venue_related, -> { where(reason: %w[venue_unavailable venue_maintenance facility_issue]) }
  scope :recent, -> { order(created_at: :desc) }
  scope :pending_notification, -> { where(notification_sent: false) }
  scope :this_season, -> { joins(:match).where(matches: { scheduled_at: 6.months.ago.. }) }

  # AI Scheduler methods
  def weather_related?
    reason.start_with?('weather_')
  end

  def venue_related?
    reason.in?(%w[venue_unavailable venue_maintenance facility_issue])
  end

  def emergency_reschedule?
    reason == 'emergency'
  end

  def days_rescheduled
    return nil unless original_date && new_date

    (new_date.to_date - original_date.to_date).to_i
  end

  def venue_changed?
    original_venue_id != new_venue_id
  end

  def send_notifications!
    return true if notification_sent?

    # ここで実際の通知ロジックを実装
    # 例: NotificationService.send_reschedule_notification(self)

    update!(notification_sent: true, notification_sent_at: Time.current)
  end

  def reason_display
    case reason
    when 'weather_rain' then '雨天'
    when 'weather_storm' then '嵐・強風'
    when 'weather_extreme_heat' then '猛暑'
    when 'weather_snow' then '雪'
    when 'venue_unavailable' then '会場利用不可'
    when 'venue_maintenance' then '会場メンテナンス'
    when 'team_conflict' then 'チーム都合'
    when 'official_unavailable' then '審判員不在'
    when 'emergency' then '緊急事態'
    when 'league_decision' then '主催者判断'
    when 'facility_issue' then '設備問題'
    when 'transportation_issue' then '交通問題'
    when 'other' then 'その他'
    else reason.humanize
    end
  end

  private

  def new_date_different_from_original
    return unless original_date && new_date

    return unless original_date.to_date == new_date.to_date

    errors.add(:new_date, 'must be different from original date')
  end

  def new_date_in_future
    return unless new_date

    return unless new_date < Time.current

    errors.add(:new_date, 'cannot be in the past')
  end
end
