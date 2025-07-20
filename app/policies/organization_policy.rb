# frozen_string_literal: true

class OrganizationPolicy < ApplicationPolicy
  def manage_billing?
    user.admin? && user.organization == record
  end

  def view_billing?
    user.organization == record && (user.admin? || user.manager?)
  end

  def update_subscription?
    manage_billing?
  end

  def cancel_subscription?
    manage_billing?
  end

  def manage_payment_methods?
    manage_billing?
  end

  def view_invoices?
    view_billing?
  end

  def download_invoice?
    view_invoices?
  end
end