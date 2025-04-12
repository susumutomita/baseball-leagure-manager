Rails.application.routes.draw do
  get 'home/index'
  root 'home#index'

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

  # Health check endpoint
  get "up" => "rails/health#show", as: :rails_health_check
end
