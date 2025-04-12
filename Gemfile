source "https://rubygems.org"

ruby "3.2.2"

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 7.1.5", ">= 7.1.5.1"

# The original asset pipeline for Rails [https://github.com/rails/sprockets-rails]
gem "sprockets-rails"

# Use postgresql as the database for Active Record
gem "pg", "~> 1.1"

# Use the Puma web server [https://github.com/puma/puma]
gem "puma", ">= 5.0"

# Use TypeScript for frontend development
gem "shakapacker", "~> 6.6"

# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem "turbo-rails"

# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem "stimulus-rails"

# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem "jbuilder"

# Use Devise for authentication
gem "devise"
gem "omniauth-keycloak", "~> 1.4"

# Multi-tenant architecture
gem "acts_as_tenant", "~> 0.6"
# Using activerecord-multi-tenant for Rails 7 compatibility
gem "activerecord-multi-tenant", "~> 1.3"

# Authorization
gem "pundit", "~> 2.3"

# API serialization
gem "jsonapi-serializer", "~> 2.2"

# Background processing
gem "sidekiq", "~> 7.1"
gem "sidekiq-scheduler", "~> 5.0"

# Payment processing
gem "stripe", "~> 9.0"

# Use Redis adapter to run Action Cable in production
gem "redis", ">= 4.0.1"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Use Active Storage variants [https://guides.rubyonrails.org/active_storage_overview.html#transforming-images]
gem "image_processing", "~> 1.2"

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ]
  gem "rspec-rails", "~> 6.0"
  gem "factory_bot_rails", "~> 6.2"
  gem "faker", "~> 3.2"
  gem "pry-rails", "~> 0.3.9"
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"
  
  # Static code analysis
  gem "rubocop", "~> 1.57", require: false
  gem "rubocop-rails", "~> 2.22", require: false
  gem "rubocop-rspec", "~> 2.25", require: false
  gem "rubocop-performance", "~> 1.19", require: false
  
  # Security analysis
  gem "brakeman", "~> 6.0", require: false
  
  # Documentation
  gem "yard", "~> 0.9.34", require: false
  
  # API documentation
  gem "rswag", "~> 2.11"
end

group :test do
  # Use system testing [https://guides.rubyonrails.org/testing.html#system-testing]
  gem "capybara"
  gem "selenium-webdriver"
  gem "simplecov", "~> 0.22.0", require: false
  gem "shoulda-matchers", "~> 5.3"
  gem "webmock", "~> 3.19"
end
