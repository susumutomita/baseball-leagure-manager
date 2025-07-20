# acts_as_tenant configuration
ActsAsTenant.configure do |config|
  # Require tenant to be set - this helps prevent accidentally querying across tenants
  config.require_tenant = true
  
  # Allow read queries without tenant (useful for login/authentication)
  # Write queries will still require tenant
  config.pkey = :id
end

# Optional: Add helper method to ApplicationRecord
module ActsAsTenant
  module ModelExtensions
    # Helper method to temporarily disable tenant requirement
    def without_tenant(&block)
      ActsAsTenant.without_tenant(&block)
    end
    
    # Helper method to execute code with a specific tenant
    def with_tenant(tenant, &block)
      ActsAsTenant.with_tenant(tenant, &block)
    end
  end
end

# Extend ApplicationRecord with helper methods
Rails.application.config.after_initialize do
  ApplicationRecord.extend(ActsAsTenant::ModelExtensions) if defined?(ApplicationRecord)
end