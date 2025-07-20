# frozen_string_literal: true

# == Schema Information
#
# Table name: revenues
#
#  id              :bigint           not null, primary key
#  name            :string           not null
#  amount          :decimal(10, 2)   not null
#  revenue_date    :date             not null
#  revenue_type    :string           not null
#  payment_method  :string
#  payment_status  :string           default("pending")
#  description     :text
#  invoice_number  :string
#  organization_id :bigint           not null
#  budget_id       :bigint
#  team_id         :bigint
#  match_id        :bigint
#  invoice_id      :bigint
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#

class Revenue < ApplicationRecord
  include TenantScoped

  # Associations
  belongs_to :organization
  belongs_to :budget, optional: true
  belongs_to :team, optional: true
  belongs_to :match, optional: true
  belongs_to :invoice, optional: true

  # Validations
  validates :name, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :revenue_date, presence: true
  validates :revenue_type, presence: true, inclusion: { in: %w[
    registration_fee    # 参加費
    membership_fee      # 会費
    sponsor             # スポンサー料
    ticket_sales        # チケット売上
    merchandise         # グッズ売上
    donation            # 寄付
    subsidy             # 補助金
    other              # その他
  ] }
  validates :payment_status, inclusion: { in: %w[pending received cancelled refunded] }

  # Scopes
  scope :received, -> { where(payment_status: 'received') }
  scope :pending, -> { where(payment_status: 'pending') }
  scope :for_period, ->(start_date, end_date) { where(revenue_date: start_date..end_date) }
  scope :by_type, ->(type) { where(revenue_type: type) }
  scope :recurring, -> { where(revenue_type: %w[membership_fee sponsor]) }

  # Callbacks
  before_validation :generate_invoice_number, if: :should_generate_invoice_number?
  after_create :auto_create_invoice, if: :should_create_invoice?

  def mark_as_received!
    update!(payment_status: 'received')
  end

  def days_overdue
    return 0 unless payment_status == 'pending'
    return 0 if revenue_date > Date.current
    (Date.current - revenue_date).to_i
  end

  def is_overdue?
    days_overdue > 30
  end

  def expected_vs_actual_ratio
    return 0 unless budget
    expected = budget.revenue_amount / (budget.period_end - budget.period_start + 1) * 
               (Date.current - budget.period_start + 1)
    return 0 if expected.zero?
    (amount / expected * 100).round(2)
  end

  private

  def should_generate_invoice_number?
    invoice_number.blank? && %w[registration_fee membership_fee sponsor].include?(revenue_type)
  end

  def generate_invoice_number
    prefix = case revenue_type
             when 'registration_fee' then 'REG'
             when 'membership_fee' then 'MEM'
             when 'sponsor' then 'SPO'
             else 'REV'
             end
    
    self.invoice_number = "#{prefix}-#{Date.current.strftime('%Y%m')}-#{SecureRandom.hex(4).upcase}"
  end

  def should_create_invoice?
    invoice_id.blank? && team_id.present? && %w[registration_fee membership_fee].include?(revenue_type)
  end

  def auto_create_invoice
    AutoInvoiceGeneratorJob.perform_later(self)
  end
end