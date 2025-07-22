# frozen_string_literal: true

module Webhooks
  # Base controller for webhook endpoints
  # Inherits directly from ActionController::Base to avoid CSRF protection
  class BaseController < ActionController::Base
    # Webhooks don't need CSRF protection since they're authenticated
    # by provider-specific signatures
    skip_forgery_protection

    # Webhooks are called by external services, not users
    # Authentication is handled by signature verification
    
    # Set JSON as default format
    before_action :set_default_format

    private

    def set_default_format
      request.format = :json
    end
  end
end