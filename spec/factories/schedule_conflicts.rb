FactoryBot.define do
  factory :schedule_conflict do
    match { nil }
    conflicting_match { nil }
    conflict_type { "MyString" }
    resolution_status { "MyString" }
    resolved_at { "2025-06-14 23:05:34" }
  end
end
