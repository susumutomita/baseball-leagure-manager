# frozen_string_literal: true

module Analytics
  class ReportsController < ApplicationController
    before_action :authenticate_user!
    before_action :set_report, only: [:show, :download, :regenerate, :send_report]
    before_action :set_reportable, only: [:create]

    # List all reports
    def index
      @reports = policy_scope(PerformanceReport)
                  .includes(:reportable, :generated_by)
                  .order(created_at: :desc)
                  .page(params[:page])
                  .per(20)

      if params[:report_type].present?
        @reports = @reports.by_type(params[:report_type])
      end

      if params[:status].present?
        @reports = @reports.where(status: params[:status])
      end

      respond_to do |format|
        format.html
        format.json do
          render json: {
            reports: serialize_reports(@reports),
            pagination: pagination_meta(@reports)
          }
        end
      end
    end

    # Show a specific report
    def show
      authorize @report

      respond_to do |format|
        format.html
        format.json { render json: serialize_full_report(@report) }
      end
    end

    # Create a new report
    def create
      authorize PerformanceReport

      @report = build_report
      
      if @report.save
        # Report generation will be handled by background job
        render json: {
          report: serialize_report(@report),
          message: 'Report generation started'
        }, status: :created
      else
        render json: {
          errors: @report.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    # Download report in specified format
    def download
      authorize @report

      unless @report.completed?
        return render json: { error: 'Report not ready for download' }, status: :unprocessable_entity
      end

      respond_to do |format|
        format.pdf { send_pdf_report }
        format.csv { send_csv_report }
        format.json { render json: @report.content }
      end
    end

    # Regenerate a report
    def regenerate
      authorize @report

      unless @report.can_regenerate?
        return render json: { error: 'Report cannot be regenerated' }, status: :unprocessable_entity
      end

      @report.update!(status: 'pending')
      ReportGenerationJob.perform_later(@report)

      render json: {
        report: serialize_report(@report),
        message: 'Report regeneration started'
      }
    end

    # Send report to recipients
    def send_report
      authorize @report

      unless @report.completed?
        return render json: { error: 'Report must be completed before sending' }, status: :unprocessable_entity
      end

      recipients = params[:recipients] || @report.recipients
      
      if recipients.blank?
        return render json: { error: 'No recipients specified' }, status: :unprocessable_entity
      end

      @report.update!(recipients: recipients)
      @report.send_to_recipients

      render json: {
        message: 'Report sent successfully',
        recipients: recipients
      }
    end

    # Schedule automated reports
    def schedule
      authorize PerformanceReport

      schedule_params = params.require(:schedule).permit(
        :report_type, :frequency, :day_of_week, :time, :recipients => []
      )

      # This would integrate with a scheduling system
      # For now, return a placeholder response
      render json: {
        message: 'Report scheduling not yet implemented',
        schedule: schedule_params
      }
    end

    # Export analytics data
    def export
      authorize PerformanceReport

      export_type = params[:export_type] || 'player_analytics'
      format = params[:format] || 'csv'

      data = gather_export_data(export_type)

      respond_to do |format|
        format.csv { send_csv_export(data, export_type) }
        format.json { render json: data }
        format.xlsx { send_xlsx_export(data, export_type) }
      end
    end

    private

    def set_report
      @report = current_organization.performance_reports.find(params[:id])
    end

    def set_reportable
      reportable_type = params[:reportable_type]
      reportable_id = params[:reportable_id]

      @reportable = case reportable_type
                    when 'Player'
                      current_organization.players.find(reportable_id)
                    when 'Team'
                      current_organization.teams.find(reportable_id)
                    when 'Organization'
                      current_organization
                    else
                      nil
                    end

      unless @reportable
        render json: { error: 'Invalid reportable type or ID' }, status: :bad_request
      end
    end

    def build_report
      report_params = params.require(:report).permit(
        :report_type, :period_start, :period_end, :format, recipients: []
      )

      PerformanceReport.new(
        reportable: @reportable,
        generated_by: current_user,
        organization: current_organization,
        report_type: report_params[:report_type],
        period_start: report_params[:period_start],
        period_end: report_params[:period_end],
        format: report_params[:format] || 'json',
        recipients: report_params[:recipients],
        auto_generated: false
      )
    end

    def serialize_reports(reports)
      reports.map { |report| serialize_report(report) }
    end

    def serialize_report(report)
      {
        id: report.id,
        reportable_type: report.reportable_type,
        reportable_id: report.reportable_id,
        reportable_name: report.reportable.try(:name) || 'Organization',
        report_type: report.report_type,
        period_start: report.period_start,
        period_end: report.period_end,
        format: report.format,
        status: report.status,
        generated_by: {
          id: report.generated_by_id,
          name: report.generated_by.name
        },
        created_at: report.created_at,
        completed_at: report.status == 'completed' ? report.updated_at : nil,
        sent_at: report.sent_at,
        auto_generated: report.auto_generated
      }
    end

    def serialize_full_report(report)
      serialized = serialize_report(report)
      
      if report.completed?
        serialized.merge!(
          content: report.content,
          insights: report.insights,
          recommendations: report.recommendations
        )
      end

      if report.failed?
        serialized[:error_message] = report.error_message
      end

      serialized
    end

    def send_pdf_report
      pdf_generator = Reports::PdfGenerator.new(@report)
      pdf_data = pdf_generator.generate

      send_data pdf_data,
                filename: "#{@report.filename}.pdf",
                type: 'application/pdf',
                disposition: 'attachment'
    end

    def send_csv_report
      csv_generator = Reports::CsvGenerator.new(@report)
      csv_data = csv_generator.generate

      send_data csv_data,
                filename: "#{@report.filename}.csv",
                type: 'text/csv',
                disposition: 'attachment'
    end

    def gather_export_data(export_type)
      case export_type
      when 'player_analytics'
        PlayerAnalytics
          .joins(:player)
          .where(organization: current_organization)
          .includes(player: :team)
          .map do |analytics|
            {
              player_name: analytics.player.name,
              team: analytics.player.team&.name,
              position: analytics.player.position,
              batting_average: analytics.batting_average,
              ops: analytics.ops,
              fielding_percentage: analytics.fielding_percentage,
              performance_trend: analytics.performance_trend,
              league_rank: analytics.league_rank
            }
          end
      when 'team_analytics'
        TeamAnalytics
          .joins(:team)
          .where(organization: current_organization)
          .includes(:team)
          .map do |analytics|
            {
              team_name: analytics.team.name,
              winning_percentage: analytics.winning_percentage,
              team_batting_average: analytics.team_batting_average,
              team_era: analytics.team_era,
              team_fielding_percentage: analytics.team_fielding_percentage,
              league_rank: analytics.league_rank
            }
          end
      else
        []
      end
    end

    def send_csv_export(data, export_type)
      csv_data = CSV.generate(headers: true) do |csv|
        return csv if data.empty?

        csv << data.first.keys

        data.each do |row|
          csv << row.values
        end
      end

      send_data csv_data,
                filename: "#{export_type}_export_#{Date.current}.csv",
                type: 'text/csv',
                disposition: 'attachment'
    end

    def send_xlsx_export(data, export_type)
      # This would use a gem like axlsx or similar
      # For now, redirect to CSV
      send_csv_export(data, export_type)
    end

    def pagination_meta(reports)
      {
        current_page: reports.current_page,
        total_pages: reports.total_pages,
        total_count: reports.total_count,
        per_page: reports.limit_value
      }
    end
  end
end