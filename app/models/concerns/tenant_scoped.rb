module TenantScoped
  extend ActiveSupport::Concern

  included do
    acts_as_tenant :organization

    # 組織に紐付けられたモデルの共通バリデーション
    validate :organization_must_be_active

    # 組織に紐付けられたモデルの共通スコープ
    scope :for_organization, ->(organization) { where(organization: organization) }
  end

  private

  def organization_must_be_active
    return unless organization

    return if organization.active?

    errors.add(:organization, "が無効化されています")
  end
end

