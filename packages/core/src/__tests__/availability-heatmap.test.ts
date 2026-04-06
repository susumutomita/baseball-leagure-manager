import { describe, expect, it } from "vitest";
import {
  analyzeMemberAvailability,
  analyzeTeamAvailability,
} from "../lib/availability-heatmap";
import type { Game, Rsvp } from "../types/domain";

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COMPLETED",
    game_date: "2026-05-03", // Sunday
    start_time: "09:00",
    end_time: "12:00",
    ground_id: null,
    ground_name: null,
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: null,
    note: null,
    version: 0,
    available_count: 0,
    unavailable_count: 0,
    maybe_count: 0,
    no_response_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createRsvp(
  gameId: string,
  memberId: string,
  response: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE" = "AVAILABLE",
): Rsvp {
  return {
    id: `rsvp-${gameId}-${memberId}`,
    game_id: gameId,
    member_id: memberId,
    response,
    responded_at: "2026-04-01T00:00:00Z",
    response_channel: "APP",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("analyzeMemberAvailability", () => {
  it("曜日別の出席傾向を返す", () => {
    // 日曜日の試合に複数回参加
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-03" }), // Sunday
      createGame({ id: "g-2", game_date: "2026-05-10" }), // Sunday
      createGame({ id: "g-3", game_date: "2026-05-17" }), // Sunday
      createGame({ id: "g-4", game_date: "2026-05-04" }), // Monday
    ];
    const rsvps = [
      createRsvp("g-1", "m-1", "AVAILABLE"),
      createRsvp("g-2", "m-1", "AVAILABLE"),
      createRsvp("g-3", "m-1", "UNAVAILABLE"),
      createRsvp("g-4", "m-1", "UNAVAILABLE"),
    ];
    const result = analyzeMemberAvailability("m-1", rsvps, games);

    const sunday = result.dayOfWeekTrends.find((d) => d.dayOfWeek === 0);
    expect(sunday?.totalGames).toBe(3);
    expect(sunday?.availableCount).toBe(2);
    expect(sunday?.availableRate).toBeCloseTo(0.667, 2);
  });

  it("データが少ない曜日はbestDay/worstDayに含めない", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-03" }), // Sunday
    ];
    const rsvps = [createRsvp("g-1", "m-1", "AVAILABLE")];
    const result = analyzeMemberAvailability("m-1", rsvps, games);
    expect(result.bestDay).toBeNull(); // 3試合未満
    expect(result.worstDay).toBeNull();
  });
});

describe("analyzeTeamAvailability", () => {
  it("チーム全体の曜日別出席率を返す", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-03" }), // Sunday
    ];
    const rsvps = [
      createRsvp("g-1", "m-1", "AVAILABLE"),
      createRsvp("g-1", "m-2", "AVAILABLE"),
      createRsvp("g-1", "m-3", "UNAVAILABLE"),
    ];
    const result = analyzeTeamAvailability(rsvps, games);
    const sunday = result.find((d) => d.dayOfWeek === 0);
    expect(sunday?.totalGames).toBe(3); // 3 RSVPs
    expect(sunday?.availableCount).toBe(2);
    expect(sunday?.availableRate).toBeCloseTo(0.667, 2);
  });

  it("NO_RESPONSEは集計に含めない", () => {
    const games = [createGame({ id: "g-1", game_date: "2026-05-03" })];
    const rsvps = [
      createRsvp("g-1", "m-1", "AVAILABLE"),
      createRsvp("g-1", "m-2", "NO_RESPONSE"),
    ];
    const result = analyzeTeamAvailability(rsvps, games);
    const sunday = result.find((d) => d.dayOfWeek === 0);
    expect(sunday?.totalGames).toBe(1); // NO_RESPONSE除外
  });
});
