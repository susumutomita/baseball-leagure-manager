class Venue < ApplicationRecord
  # Geocoding
  geocoded_by :address
  after_validation :geocode, if: :will_save_change_to_address?

  # Associations
  belongs_to :organization
  has_many :venue_availabilities, dependent: :destroy
  has_many :matches, dependent: :nullify
  has_many :schedule_conflicts, through: :matches

  # Validations
  validates :name, presence: true, length: { maximum: 100 }
  validates :address, presence: true, length: { maximum: 255 }
  validates :capacity, presence: true, numericality: { greater_than: 0, only_integer: true }
  validates :surface_type, inclusion: { in: %w[grass artificial_turf dirt indoor], allow_nil: true }
  validates :field_dimensions, length: { maximum: 255 }, allow_nil: true

  # Scopes
  scope :available_on, lambda { |date|
    joins(:venue_availabilities).where(venue_availabilities: { available_date: date, is_available: true })
  }
  scope :by_capacity, ->(min_capacity) { where(capacity: min_capacity..) }

  # Methods
  def available_on?(date, start_time = nil, end_time = nil)
    availability = venue_availabilities.find_by(available_date: date)
    return false unless availability&.is_available?

    if start_time && end_time && availability.start_time && availability.end_time
      start_time >= availability.start_time && end_time <= availability.end_time
    else
      true
    end
  end

  def distance_from(other_venue)
    return nil unless geocoded? && other_venue.geocoded?

    distance_to([other_venue.latitude, other_venue.longitude])
  end

  # AI Scheduler methods
  def can_host_match?(match_date, start_time = nil, end_time = nil)
    available_on?(match_date, start_time, end_time) &&
      !has_conflicting_matches?(match_date, start_time, end_time)
  end

  def has_conflicting_matches?(match_date, start_time = nil, end_time = nil)
    query = matches.where('DATE(scheduled_at) = ?', match_date)

    if start_time && end_time
      query = query.where(
        'TIME(scheduled_at) BETWEEN ? AND ?',
        start_time,
        end_time
      )
    end

    query.exists?
  end

  def utilization_rate(date_range)
    total_days = date_range.count
    return 0 if total_days.zero?

    utilized_days = matches
                    .where(scheduled_at: date_range)
                    .select('DATE(scheduled_at)')
                    .distinct
                    .count

    (utilized_days.to_f / total_days * 100).round(2)
  end
end
