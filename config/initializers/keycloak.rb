# Keycloak configuration
# This file sets up the Keycloak integration for authentication

module Keycloak
  class Configuration
    attr_accessor :server_url, :realm, :client_id, :client_secret, :redirect_uri
    
    def initialize
      @server_url = ENV.fetch('KEYCLOAK_SERVER_URL', 'http://localhost:8080')
      @realm = ENV.fetch('KEYCLOAK_REALM', 'baseball-league')
      @client_id = ENV.fetch('KEYCLOAK_CLIENT_ID', 'baseball-league-app')
      @client_secret = ENV.fetch('KEYCLOAK_CLIENT_SECRET', '')
      @redirect_uri = ENV.fetch('KEYCLOAK_REDIRECT_URI', 'http://localhost:3000/auth/callback')
    end
    
    def auth_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/auth"
    end
    
    def token_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/token"
    end
    
    def userinfo_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/userinfo"
    end
    
    def logout_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/logout"
    end
    
    def introspect_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/token/introspect"
    end
    
    def jwks_url
      "#{server_url}/realms/#{realm}/protocol/openid-connect/certs"
    end
  end
  
  def self.configuration
    @configuration ||= Configuration.new
  end
  
  def self.configure
    yield(configuration) if block_given?
  end
end

# Configure Keycloak
Keycloak.configure do |config|
  # Configuration can be overridden here if needed
  # config.server_url = 'https://keycloak.example.com'
  # config.realm = 'production-realm'
end