# frozen_string_literal: true

module Organizations
  class InvoicesController < ApplicationController
    before_action :authenticate_user!
    before_action :authorize_billing_access!
    before_action :set_organization
    before_action :set_invoice, only: [:show, :download, :pay]

    def index
      @invoices = @organization.invoices.includes(:invoice_items).recent
      @unpaid_invoices = @invoices.unpaid
      @total_unpaid = @unpaid_invoices.sum(:total_cents)
      
      # Pagination
      @invoices = @invoices.page(params[:page]).per(20)
    end

    def show
      @invoice_items = @invoice.invoice_items.order(:created_at)
      
      respond_to do |format|
        format.html
        format.json { render json: invoice_json }
      end
    end

    def download
      # Check download signature if provided
      if params[:signature].present?
        begin
          payload = Rails.application.message_verifier(:invoice_download).verify(params[:signature])
          unless payload[:invoice_id] == @invoice.id && payload[:expires_at] > Time.current
            redirect_to organization_invoices_path(@organization), 
                        alert: "ダウンロードリンクが無効または期限切れです"
            return
          end
        rescue ActiveSupport::MessageVerifier::InvalidSignature
          redirect_to organization_invoices_path(@organization), 
                      alert: "無効なダウンロードリンクです"
          return
        end
      end

      # Generate or retrieve PDF
      pdf_path = if @invoice.stripe_invoice_pdf.present?
                   # Download from Stripe
                   download_stripe_pdf
                 else
                   # Generate custom PDF
                   invoice_generator.regenerate_invoice_pdf(@invoice)
                 end

      send_file pdf_path, 
                filename: "invoice_#{@invoice.invoice_number}.pdf",
                type: 'application/pdf',
                disposition: 'attachment'
    end

    def pay
      unless @invoice.open?
        redirect_to organization_invoice_path(@organization, @invoice), 
                    alert: "この請求書は支払い済みまたは無効です"
        return
      end

      begin
        payment_processor.process_invoice_payment(@invoice)
        redirect_to organization_invoice_path(@organization, @invoice), 
                    notice: "請求書の支払いが完了しました"
      rescue StandardError => e
        redirect_to organization_invoice_path(@organization, @invoice), 
                    alert: "支払いに失敗しました: #{e.message}"
      end
    end

    def preview_next
      # Preview next invoice
      @preview = invoice_generator.preview_next_invoice
      
      unless @preview
        redirect_to organization_billing_path(@organization), 
                    alert: "次回の請求書のプレビューはありません"
        return
      end
      
      respond_to do |format|
        format.html
        format.json { render json: @preview }
      end
    end

    private

    def set_organization
      @organization = current_user.organization
    end

    def set_invoice
      @invoice = @organization.invoices.find(params[:id])
    end

    def authorize_billing_access!
      authorize @organization, :manage_billing?
    end

    def payment_processor
      @payment_processor ||= Billing::PaymentProcessor.new(@organization)
    end

    def invoice_generator
      @invoice_generator ||= Billing::InvoiceGenerator.new(@organization)
    end

    def invoice_json
      {
        invoice: {
          id: @invoice.id,
          invoice_number: @invoice.invoice_number,
          status: @invoice.status,
          total_cents: @invoice.total_cents,
          subtotal_cents: @invoice.subtotal_cents,
          tax_cents: @invoice.tax_cents,
          currency: @invoice.currency,
          invoice_date: @invoice.invoice_date,
          due_date: @invoice.due_date,
          paid_at: @invoice.paid_at,
          download_url: @invoice.download_url
        },
        items: @invoice_items.map do |item|
          {
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            total_cents: item.total_cents
          }
        end,
        organization: {
          name: @organization.name,
          email: @organization.admin_users.first&.email
        }
      }
    end

    def download_stripe_pdf
      require 'open-uri'
      
      # Create temp file
      temp_file = Tempfile.new(['invoice', '.pdf'])
      
      # Download PDF from Stripe
      URI.open(@invoice.stripe_invoice_pdf) do |pdf|
        temp_file.write(pdf.read)
      end
      
      temp_file.rewind
      temp_file.path
    rescue StandardError => e
      Rails.logger.error "Failed to download Stripe PDF: #{e.message}"
      # Fall back to generating custom PDF
      invoice_generator.regenerate_invoice_pdf(@invoice)
    end
  end
end