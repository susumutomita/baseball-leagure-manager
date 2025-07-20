FactoryBot.define do
  factory :venue_availability do
    venue { nil }
    available_date { "2025-06-14" }
    start_time { "2025-06-14 23:05:27" }
    end_time { "2025-06-14 23:05:27" }
    is_available { false }
  end
end
