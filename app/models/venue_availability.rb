class VenueAvailability < ApplicationRecord
  belongs_to :venue

  validates :available_date, presence: true
  validates :is_available, inclusion: { in: [true, false] }
  validates :start_time, presence: true, if: :is_available?
  validates :end_time, presence: true, if: :is_available?
  validates :max_concurrent_matches, numericality: { greater_than: 0, only_integer: true }, allow_nil: true
  validate :end_time_after_start_time, if: :both_times_present?
  validate :unique_availability_per_venue_per_date

  scope :available, -> { where(is_available: true) }
  scope :unavailable, -> { where(is_available: false) }
  scope :future, -> { where(available_date: Date.current..) }
  scope :by_date_range, ->(start_date, end_date) { where(available_date: start_date..end_date) }

  def mark_as_unavailable!
    update!(is_available: false)
  end

  def mark_as_available!
    update!(is_available: true)
  end

  # AI Scheduler methods
  def available_during?(start_time, end_time)
    return false unless is_available?
    return true unless self.start_time && self.end_time

    start_time >= self.start_time && end_time <= self.end_time
  end

  def overlaps_with?(other_start_time, other_end_time)
    return false unless is_available? && start_time && end_time

    start_time < other_end_time && end_time > other_start_time
  end

  def remaining_capacity
    return 0 unless is_available?

    max_matches = max_concurrent_matches || 1
    scheduled_matches = venue.matches
                             .where('DATE(scheduled_at) = ?', available_date)
                             .count

    [max_matches - scheduled_matches, 0].max
  end

  private

  def both_times_present?
    start_time.present? && end_time.present?
  end

  def end_time_after_start_time
    return unless both_times_present?

    return unless end_time <= start_time

    errors.add(:end_time, 'must be after start time')
  end

  def unique_availability_per_venue_per_date
    existing = VenueAvailability.where(
      venue: venue,
      available_date: available_date
    ).where.not(id: id)

    return unless existing.exists?

    errors.add(:available_date, 'already has availability record for this venue')
  end
end
