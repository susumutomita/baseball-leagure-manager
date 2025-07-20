# frozen_string_literal: true

require "openai"

# OpenAI API configuration
# The API key should be set in environment variables for security
# You can get your API key from https://platform.openai.com/api-keys
#
# In development, you can set it in .env file:
# OPENAI_ACCESS_TOKEN=your-api-key-here
#
# In production, set it as an environment variable on your server

OpenAI.configure do |config|
  config.access_token = ENV.fetch("OPENAI_ACCESS_TOKEN", nil)
  config.organization_id = ENV.fetch("OPENAI_ORGANIZATION_ID", nil) # Optional
  config.request_timeout = 120 # Optional, defaults to 120 seconds
end