class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
  
  # Multitenancy support
  # All models that should be scoped to organization will inherit from this
end
