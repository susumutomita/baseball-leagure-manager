# frozen_string_literal: true

module Ai
  class OpenAiClient
    attr_reader :client

    def initialize(api_key)
      @client = OpenAI::Client.new(access_token: api_key)
    end

    def analyze(prompt)
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "あなたは草野球リーグの運営を支援するAIアシスタントです。" \
                      "公平で効率的なスケジュール作成と分析を行います。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }
      )

      parse_response(response)
    rescue StandardError => e
      Rails.logger.error "OpenAI API error: #{e.message}"
      {
        summary: "分析中にエラーが発生しました",
        suggestions: [],
        concerns: ["APIエラー: #{e.message}"]
      }
    end

    def generate_match_insights(match_data)
      prompt = build_match_insights_prompt(match_data)
      
      response = client.chat(
        parameters: {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system", 
              content: "草野球の試合分析を行い、両チームの特徴と戦略的アドバイスを提供します。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        }
      )

      parse_insights_response(response)
    end

    def suggest_lineup_optimization(team_data)
      prompt = build_lineup_prompt(team_data)
      
      response = client.chat(
        parameters: {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "野球チームの打順と守備位置の最適化を提案します。"
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: 0.6,
          max_tokens: 800
        }
      )

      parse_lineup_response(response)
    end

    private

    def parse_response(response)
      content = response.dig("choices", 0, "message", "content")
      return default_response unless content

      # Try to parse as JSON
      begin
        JSON.parse(content).symbolize_keys
      rescue JSON::ParserError
        # If not JSON, extract information from text
        extract_info_from_text(content)
      end
    end

    def parse_insights_response(response)
      content = response.dig("choices", 0, "message", "content")
      return {} unless content

      {
        insights: content,
        generated_at: Time.current
      }
    end

    def parse_lineup_response(response)
      content = response.dig("choices", 0, "message", "content")
      return {} unless content

      {
        lineup_suggestion: content,
        generated_at: Time.current
      }
    end

    def default_response
      {
        summary: "分析を完了できませんでした",
        suggestions: [],
        concerns: []
      }
    end

    def extract_info_from_text(text)
      {
        summary: extract_section(text, "要約", "全体評価"),
        suggestions: extract_list(text, "提案", "改善点"),
        concerns: extract_list(text, "懸念", "問題点")
      }
    end

    def extract_section(text, *keywords)
      keywords.each do |keyword|
        match = text.match(/#{keyword}[:：]\s*(.+?)(?=\n\n|\z)/m)
        return match[1].strip if match
      end
      text.split("\n").first || ""
    end

    def extract_list(text, *keywords)
      keywords.each do |keyword|
        match = text.match(/#{keyword}[:：]\s*\n((?:[-・*]\s*.+\n?)+)/m)
        if match
          return match[1].split("\n").map { |line| line.sub(/^[-・*]\s*/, "").strip }.reject(&:empty?)
        end
      end
      []
    end

    def build_match_insights_prompt(match_data)
      <<~PROMPT
        以下の草野球チームの対戦について分析してください:

        ホームチーム: #{match_data[:home_team][:name]}
        - 戦力評価: #{match_data[:home_team][:strength_rating]}
        - 最近の成績: #{match_data[:home_team][:recent_record]}
        - 得点力: #{match_data[:home_team][:offensive_rating]}
        - 守備力: #{match_data[:home_team][:defensive_rating]}

        アウェイチーム: #{match_data[:away_team][:name]}
        - 戦力評価: #{match_data[:away_team][:strength_rating]}
        - 最近の成績: #{match_data[:away_team][:recent_record]}
        - 得点力: #{match_data[:away_team][:offensive_rating]}
        - 守備力: #{match_data[:away_team][:defensive_rating]}

        過去の対戦成績: #{match_data[:head_to_head]}

        両チームの特徴を分析し、試合の見どころと各チームへの戦略的アドバイスを提供してください。
      PROMPT
    end

    def build_lineup_prompt(team_data)
      players_info = team_data[:players].map do |player|
        "#{player[:name]} (#{player[:position]}): " \
        "打率 #{player[:batting_average]}, " \
        "本塁打 #{player[:home_runs]}, " \
        "打点 #{player[:rbis]}"
      end.join("\n")

      <<~PROMPT
        #{team_data[:team_name]}の選手データ:
        
        #{players_info}

        チームの特徴:
        - 得点力: #{team_data[:offensive_rating]}
        - 機動力: #{team_data[:speed_rating]}
        - 守備力: #{team_data[:defensive_rating]}

        最適な打順と守備位置を提案してください。各選手の特徴を活かし、
        チーム全体のバランスを考慮した配置をお願いします。
      PROMPT
    end
  end
end