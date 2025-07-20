# frozen_string_literal: true

# Create subscription plans
plans = [
  {
    name: SubscriptionPlan::BASIC_PLAN,
    price_cents: 0,
    currency: 'jpy',
    billing_interval: 'month',
    position: 1,
    features: [
      'basic_features',
      'team_management',
      'match_scheduling',
      'basic_statistics'
    ],
    limits: SubscriptionPlan::DEFAULT_LIMITS[SubscriptionPlan::BASIC_PLAN]
  },
  {
    name: SubscriptionPlan::PRO_PLAN,
    price_cents: 500000, # ¥5,000
    currency: 'jpy',
    billing_interval: 'month',
    position: 2,
    features: [
      'basic_features',
      'team_management',
      'match_scheduling',
      'basic_statistics',
      'advanced_statistics',
      'ai_match_proposals',
      'custom_reports',
      'api_access',
      'priority_support'
    ],
    limits: SubscriptionPlan::DEFAULT_LIMITS[SubscriptionPlan::PRO_PLAN]
  },
  {
    name: SubscriptionPlan::ENTERPRISE_PLAN,
    price_cents: 2000000, # ¥20,000
    currency: 'jpy',
    billing_interval: 'month',
    position: 3,
    features: [
      'basic_features',
      'team_management',
      'match_scheduling',
      'basic_statistics',
      'advanced_statistics',
      'ai_match_proposals',
      'custom_reports',
      'api_access',
      'priority_support',
      'white_label',
      'dedicated_support',
      'custom_integrations',
      'data_export',
      'sla_guarantee'
    ],
    limits: SubscriptionPlan::DEFAULT_LIMITS[SubscriptionPlan::ENTERPRISE_PLAN]
  }
]

plans.each do |plan_data|
  plan = SubscriptionPlan.find_or_initialize_by(name: plan_data[:name])
  plan.assign_attributes(plan_data)
  plan.save!
  
  puts "Created/Updated plan: #{plan.name}"
end

# Create Stripe products and prices in production
if Rails.env.production? && ENV['CREATE_STRIPE_PRODUCTS'].present?
  require_relative '../../app/services/billing/stripe_service'
  
  stripe_service = Billing::StripeService.new
  
  SubscriptionPlan.all.each do |plan|
    next if plan.stripe_price_id.present?
    
    # Create product
    product = stripe_service.create_product(
      name: "#{plan.name.capitalize} Plan",
      description: "#{plan.name.capitalize} subscription plan for Baseball League Manager"
    )
    
    # Create price
    price = stripe_service.create_price(
      product_id: product.id,
      unit_amount: plan.price_cents,
      currency: plan.currency,
      recurring: { interval: plan.billing_interval }
    )
    
    # Update plan with Stripe IDs
    plan.update!(stripe_price_id: price.id)
    
    puts "Created Stripe product and price for #{plan.name}"
  end
end