
class AiSchedulerService
  def initialize(league, season)
    @league = league
    @season = season
    @teams = @league.teams
    @venues = @league.venues
    @client = OpenAI::Client.new
  end

  def generate_schedule
    return if @teams.count < 2

    response = @client.chat(
      parameters: {
        model: "gpt-4",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    )

    schedule_data = JSON.parse(response.dig("choices", 0, "message", "content"))
    
    create_games_from_schedule(schedule_data)
  end

  private

  def system_prompt
    "You are an AI assistant that helps schedule baseball games for a league. " \
    "Your task is to create a fair and balanced schedule for a season, taking into account " \
    "team availability, venue availability, and ensuring each team plays approximately " \
    "the same number of games. The schedule should be returned as a JSON object."
  end

  def user_prompt
    "Create a baseball league schedule with the following parameters:\n" \
    "- Season start date: #{@season.start_date}\n" \
    "- Season end date: #{@season.end_date}\n" \
    "- Number of teams: #{@teams.count}\n" \
    "- Teams: #{@teams.pluck(:name).join(', ')}\n" \
    "- Available venues: #{@venues.pluck(:name).join(', ')}\n" \
    "- Each team should play against every other team at least once\n" \
    "- Games should be scheduled on weekends (Saturday and Sunday) between 9:00 AM and 7:00 PM\n" \
    "- Each game lasts approximately 3 hours\n" \
    "- Teams should have at least 1 day of rest between games\n\n" \
    "Return the schedule as a JSON object with the following structure:\n" \
    "{\n" \
    "  \"games\": [\n" \
    "    {\n" \
    "      \"date\": \"YYYY-MM-DD\",\n" \
    "      \"time\": \"HH:MM\",\n" \
    "      \"home_team\": \"Team Name\",\n" \
    "      \"away_team\": \"Team Name\",\n" \
    "      \"venue\": \"Venue Name\"\n" \
    "    },\n" \
    "    ...\n" \
    "  ]\n" \
    "}"
  end

  def create_games_from_schedule(schedule_data)
    schedule_data["games"].each do |game_data|
      date = Date.parse(game_data["date"])
      time = Time.parse(game_data["time"])
      scheduled_at = DateTime.new(date.year, date.month, date.day, time.hour, time.min, 0)
      
      home_team = @teams.find_by(name: game_data["home_team"])
      away_team = @teams.find_by(name: game_data["away_team"])
      venue = @venues.find_by(name: game_data["venue"])
      
      next unless home_team && away_team && venue
      
      Game.create!(
        league: @league,
        season: @season,
        home_team: home_team,
        away_team: away_team,
        venue: venue,
        scheduled_at: scheduled_at,
        status: :scheduled
      )
    end
  end
end
