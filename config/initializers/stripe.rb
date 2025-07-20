# frozen_string_literal: true

Rails.configuration.stripe = {
  publishable_key: ENV['STRIPE_PUBLISHABLE_KEY'] || Rails.application.credentials.dig(:stripe, :publishable_key),
  secret_key: ENV['STRIPE_SECRET_KEY'] || Rails.application.credentials.dig(:stripe, :secret_key),
  webhook_secret: ENV['STRIPE_WEBHOOK_SECRET'] || Rails.application.credentials.dig(:stripe, :webhook_secret)
}

Stripe.api_key = Rails.configuration.stripe[:secret_key]

# Set API version for consistency
Stripe.api_version = '2023-10-16'

# Configure Stripe logging in development
if Rails.env.development?
  Stripe.log_level = Stripe::LEVEL_INFO
end