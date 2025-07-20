FactoryBot.define do
  factory :venue do
    organization { nil }
    name { "MyString" }
    address { "MyString" }
    latitude { "9.99" }
    longitude { "9.99" }
    capacity { 1 }
    facilities { "MyText" }
  end
end
