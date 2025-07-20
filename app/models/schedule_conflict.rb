class ScheduleConflict < ApplicationRecord
  belongs_to :match
  belongs_to :conflicting_match, class_name: 'Match', optional: true
  belongs_to :venue, optional: true
  belongs_to :team, optional: true

  CONFLICT_TYPES = %w[
    venue_overlap
    team_overlap
    time_constraint
    travel_distance
    weather_conflict
    resource_unavailable
    official_unavailable
  ].freeze

  RESOLUTION_STATUSES = %w[pending resolved ignored auto_resolved].freeze
  SEVERITY_LEVELS = %w[low medium high critical].freeze

  validates :conflict_type, presence: true, inclusion: { in: CONFLICT_TYPES }
  validates :resolution_status, presence: true, inclusion: { in: RESOLUTION_STATUSES }
  validates :severity, presence: true, inclusion: { in: SEVERITY_LEVELS }
  validates :description, presence: true, length: { maximum: 500 }
  validates :detected_at, presence: true

  scope :pending, -> { where(resolution_status: 'pending') }
  scope :resolved, -> { where(resolution_status: 'resolved') }
  scope :by_type, ->(type) { where(conflict_type: type) }
  scope :by_severity, ->(severity) { where(severity: severity) }
  scope :critical, -> { where(severity: 'critical') }
  scope :recent, -> { order(detected_at: :desc) }
  scope :unresolved, -> { where(resolution_status: %w[pending ignored]) }

  def resolve!
    update!(resolution_status: 'resolved', resolved_at: Time.current)
  end

  def ignore!
    update!(resolution_status: 'ignored', resolved_at: Time.current)
  end

  def auto_resolve!
    update!(resolution_status: 'auto_resolved', resolved_at: Time.current)
  end

  def critical?
    severity == 'critical'
  end

  def affects_venue?
    conflict_type.in?(%w[venue_overlap resource_unavailable])
  end

  def affects_team?
    conflict_type.in?(%w[team_overlap travel_distance])
  end

  def resolution_time
    return nil unless resolved_at && detected_at

    ((resolved_at - detected_at) / 1.hour).round(2)
  end

  def suggested_resolution
    case conflict_type
    when 'venue_overlap'
      '会場の変更または時間の調整が必要です'
    when 'team_overlap'
      'チームの試合スケジュールを調整してください'
    when 'travel_distance'
      '移動時間を考慮した試合間隔の調整が必要です'
    when 'weather_conflict'
      '天候条件に応じた延期または会場変更を検討してください'
    when 'resource_unavailable'
      '必要なリソースの確保または代替手段を検討してください'
    when 'official_unavailable'
      '審判員のスケジュール調整または代替審判員の手配が必要です'
    else
      '詳細な確認と適切な解決策の検討が必要です'
    end
  end
end
