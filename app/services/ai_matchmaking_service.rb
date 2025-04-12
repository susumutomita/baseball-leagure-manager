
class AiMatchmakingService
  def initialize(league)
    @league = league
    @teams = @league.teams
    @client = OpenAI::Client.new
  end

  def generate_matchups(count = 1)
    return [] if @teams.count < 2

    team_stats = collect_team_stats

    response = @client.chat(
      parameters: {
        model: "gpt-4",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt(team_stats, count) }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    )

    matchups_data = JSON.parse(response.dig("choices", 0, "message", "content"))
    
    matchups_data["matchups"]
  end

  private

  def system_prompt
    "You are an AI assistant that helps create fair and competitive matchups for a baseball league. " \
    "Your task is to analyze team statistics and create balanced matchups that would result in " \
    "competitive and interesting games. The matchups should be returned as a JSON object."
  end

  def user_prompt(team_stats, count)
    "Create #{count} balanced baseball matchups with the following teams and their statistics:\n\n" \
    "#{format_team_stats(team_stats)}\n\n" \
    "Consider the following factors when creating matchups:\n" \
    "- Team skill level (win-loss record)\n" \
    "- Recent performance (last 5 games)\n" \
    "- Head-to-head history\n" \
    "- Team strengths and weaknesses\n\n" \
    "Return the matchups as a JSON object with the following structure:\n" \
    "{\n" \
    "  \"matchups\": [\n" \
    "    {\n" \
    "      \"home_team\": \"Team Name\",\n" \
    "      \"away_team\": \"Team Name\",\n" \
    "      \"reasoning\": \"Brief explanation of why this matchup is balanced and interesting\"\n" \
    "    },\n" \
    "    ...\n" \
    "  ]\n" \
    "}"
  end

  def collect_team_stats
    @teams.map do |team|
      {
        id: team.id,
        name: team.name,
        wins: team.games.where(winner_id: team.id).count,
        losses: team.games.where.not(winner_id: nil).where.not(winner_id: team.id).count,
        recent_games: team.games.order(scheduled_at: :desc).limit(5).map do |game|
          {
            opponent: game.home_team_id == team.id ? game.away_team.name : game.home_team.name,
            result: game.winner_id == team.id ? 'win' : (game.winner_id.nil? ? 'tie' : 'loss'),
            score: "#{game.home_score}-#{game.away_score}"
          }
        end
      }
    end
  end

  def format_team_stats(team_stats)
    team_stats.map do |stats|
      "Team: #{stats[:name]}\n" \
      "Record: #{stats[:wins]}-#{stats[:losses]}\n" \
      "Recent games: #{format_recent_games(stats[:recent_games])}\n"
    end.join("\n")
  end

  def format_recent_games(recent_games)
    recent_games.map do |game|
      "#{game[:result].capitalize} vs #{game[:opponent]} (#{game[:score]})"
    end.join(", ")
  end
end
