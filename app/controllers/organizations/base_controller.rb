module Organizations
  class BaseController < ApplicationController
    # 組織内の操作を行うコントローラーの基底クラス
    before_action :require_organization!
    before_action :ensure_organization_active!

    private

    def ensure_organization_active!
      return if current_organization.active?

      sign_out_and_redirect
    end

    def sign_out_and_redirect
      reset_session
      redirect_to root_path, alert: '組織が無効化されています。管理者にお問い合わせください。'
    end

    # 組織の設定を取得
    def organization_settings
      @organization_settings ||= current_organization.settings.with_indifferent_access
    end

    helper_method :organization_settings

    # 組織のタイムゾーンを使用
    def use_organization_timezone(&)
      Time.use_zone(current_organization.time_zone, &)
    end

    around_action :with_organization_timezone

    def with_organization_timezone(&)
      use_organization_timezone(&)
    end

    # 組織の制限チェック
    def check_teams_limit!
      if current_organization.teams_limit_reached?
        redirect_back(fallback_location: teams_path, alert: 'チーム数の上限に達しています')
        return false
      end
      true
    end

    def check_players_limit!
      if current_organization.players_limit_reached?
        redirect_back(fallback_location: players_path, alert: '選手数の上限に達しています')
        return false
      end
      true
    end
  end
end

