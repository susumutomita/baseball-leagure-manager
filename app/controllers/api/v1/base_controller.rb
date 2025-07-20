module Api
  module V1
    class BaseController < ActionController::API
      include ActsAsTenant::ControllerExtensions
      include KeycloakAuthenticatable

      # APIではJSONでエラーを返す
      rescue_from ActsAsTenant::Errors::NoTenantSet do
        render_error('Organization not set', :unprocessable_entity)
      end

      rescue_from ActiveRecord::RecordNotFound do |e|
        render_error(e.message, :not_found)
      end

      rescue_from ActiveRecord::RecordInvalid do |e|
        render_error(e.record.errors.full_messages.join(', '), :unprocessable_entity)
      end

      rescue_from ActionController::ParameterMissing do |e|
        render_error(e.message, :bad_request)
      end

      # API用のテナント設定
      set_current_tenant_through_filter
      before_action :set_api_tenant
      before_action :authenticate_api_user!

      private

      def set_api_tenant
        # APIトークンからorganization_idを取得
        if request.headers['X-Organization-ID'].present?
          organization = Organization.active.find(request.headers['X-Organization-ID'])
          set_current_tenant(organization)
        elsif current_user
          set_current_tenant(current_user.organization)
        end
      end

      def authenticate_api_user!
        # Bearer tokenを使った認証
        authenticate_with_bearer_token || render_unauthorized
      end

      def authenticate_with_bearer_token
        return false unless bearer_token.present?

        # Keycloakでトークンを検証
        user_info = verify_keycloak_token(bearer_token)
        return false unless user_info

        # ユーザーを取得または作成
        @current_user = User.find_by(keycloak_id: user_info[:sub])
        return false unless @current_user

        # 最終ログイン時刻を更新
        @current_user.update_last_login!
        true
      end

      def bearer_token
        pattern = /^Bearer /
        header = request.headers['Authorization']
        header.gsub(pattern, '') if header&.match(pattern)
      end

      def verify_keycloak_token(token)
        # Keycloakのintrospectionエンドポイントでトークンを検証
        response = HTTParty.post(
          Keycloak.configuration.introspect_url,
          body: {
            token: token,
            client_id: Keycloak.configuration.client_id,
            client_secret: Keycloak.configuration.client_secret
          }
        )

        return nil unless response.success? && response.parsed_response['active']

        {
          sub: response.parsed_response['sub'],
          email: response.parsed_response['email'],
          name: response.parsed_response['name']
        }
      rescue StandardError => e
        Rails.logger.error "Keycloak token verification failed: #{e.message}"
        nil
      end

      def render_unauthorized
        render_error('Unauthorized', :unauthorized)
      end

      def render_error(message, status)
        render json: {
          error: {
            message: message,
            status: status
          }
        }, status: status
      end

      def render_success(data, status = :ok)
        render json: {
          data: data,
          meta: {
            organization_id: current_tenant&.id,
            timestamp: Time.current.iso8601
          }
        }, status: status
      end

      # ページネーション用ヘルパー
      def pagination_dict(collection)
        {
          current_page: collection.current_page,
          total_pages: collection.total_pages,
          total_count: collection.total_count,
          per_page: collection.limit_value
        }
      end
    end
  end
end

