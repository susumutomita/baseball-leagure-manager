Rails.application.routes.draw do
  # 認証関連
  get '/auth/login', to: 'auth#login', as: :login
  get '/auth/callback', to: 'auth#callback', as: :auth_callback
  delete '/auth/logout', to: 'auth#logout', as: :logout
  
  # 組織関連（認証が必要だが組織は不要）
  resources :organizations, except: [:show] do
    member do
      post :activate
      post :deactivate
    end
  end
  
  # ルートは組織選択後のホーム画面
  root 'home#index'
  get 'home/index'

  resources :teams do
    resources :players
    member do
      get :matches
      get :league_history
    end
  end

  resources :leagues do
    member do
      get :standings
      post :generate_schedule
      get :schedule
    end
    resources :league_teams, only: [:create, :destroy] do
      member do
        post :approve_registration
        post :reject_registration
      end
    end
    resources :matches, shallow: true do
      member do
        post :record_result
        post :postpone
        post :cancel
      end
      collection do
        post :auto_schedule
      end
    end
    
    # AI Matching Engine routes
    resource :ai_matching_config, only: [:show, :new, :create, :edit, :update, :destroy], module: :organizations do
      member do
        post :test_configuration
      end
    end
    
    resources :match_proposals, module: :organizations do
      member do
        post :approve
        post :reject
        post :apply
        post :optimize
      end
      collection do
        get :compare
      end
    end
  end

  resources :transactions, except: [:edit, :update, :destroy] do
    member do
      post :process_payment
      get :invoice
      post :refund
    end
    collection do
      get :payment_history
    end
  end

  # 組織スコープのルート（サブドメインまたはパスベース）
  scope '/:organization_slug', constraints: { organization_slug: /[a-z0-9\-]+/ } do
    get '/', to: 'home#index', as: :organization_root
    
    resources :teams do
      resources :players
    end
    
    resources :leagues do
      member do
        get :standings
        post :generate_schedule
      end
      
      # AI Matching Engine routes
      resource :ai_matching_config, only: [:show, :new, :create, :edit, :update, :destroy], module: :organizations do
        member do
          post :test_configuration
        end
      end
      
      resources :match_proposals, module: :organizations do
        member do
          post :approve
          post :reject
          post :apply
          post :optimize
        end
        collection do
          get :compare
        end
      end
    end
    
    resources :matches do
      member do
        post :record_result
      end
    end
    
    resources :transactions
  end
  
  # API endpoints for AI integration
  namespace :api do
    namespace :v1 do
      resources :matches, only: [:index, :show] do
        collection do
          post :suggest_schedule
        end
      end
      resources :leagues, only: [:index, :show] do
        member do
          get :statistics
        end
      end
    end
  end

  # Billing routes
  namespace :organizations do
    resource :billing, only: [:show], controller: 'billing' do
      member do
        get :usage
        get :portal
      end
    end
    
    resources :subscriptions do
      member do
        post :cancel
        post :reactivate
      end
      collection do
        get :success
      end
    end
    
    resources :payment_methods
    
    resources :invoices, only: [:index, :show] do
      member do
        get :download
        post :pay
      end
      collection do
        get :preview_next
      end
    end
    
    # Financial Management routes
    resources :budgets do
      member do
        post :optimize
      end
      collection do
        post :forecast
      end
    end
    
    resources :expenses do
      member do
        post :approve
      end
      collection do
        get :bulk_import
        post :bulk_import
        get :analysis
      end
    end
    
    resources :revenues do
      member do
        post :mark_received
      end
      collection do
        get :forecast
        get :growth_opportunities
        get :bulk_record
        post :bulk_record
      end
    end
    
    resources :financial_reports, only: [:index, :show, :new, :create] do
      member do
        get :download
        post :share
      end
      collection do
        get :dashboard
        get :analytics
      end
    end
  end
  
  # Stripe webhooks
  namespace :webhooks do
    post 'stripe', to: 'stripe_webhooks#create'
  end

  # Health check endpoint
  get "up" => "rails/health#show", as: :rails_health_check
end
