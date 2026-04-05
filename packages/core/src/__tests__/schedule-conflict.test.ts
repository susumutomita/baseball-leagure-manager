import { describe, expect, it } from "bun:test";
import {
  detectConflicts,
  detectMemberConflicts,
} from "../lib/schedule-conflict";
import type { Game } from "../types/domain";

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "CONFIRMED",
    game_date: "2026-05-01",
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

describe("detectConflicts", () => {
  describe("時間帯が重複するとき", () => {
    it("TIME_OVERLAP競合を検出する", () => {
      const games = [
        createGame({
          id: "g-1",
          title: "午前の試合",
          start_time: "09:00",
          end_time: "12:00",
        }),
        createGame({
          id: "g-2",
          title: "昼の試合",
          start_time: "11:00",
          end_time: "14:00",
        }),
      ];
      const conflicts = detectConflicts(games);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("TIME_OVERLAP");
    });
  });

  describe("同日だが時間が重複しないとき", () => {
    it("競合を検出しない", () => {
      const games = [
        createGame({
          id: "g-1",
          title: "午前の試合",
          start_time: "09:00",
          end_time: "12:00",
        }),
        createGame({
          id: "g-2",
          title: "午後の試合",
          start_time: "13:00",
          end_time: "16:00",
        }),
      ];
      const conflicts = detectConflicts(games);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("時刻情報がなく同日のとき", () => {
    it("SAME_DAY競合を検出する", () => {
      const games = [
        createGame({
          id: "g-1",
          title: "試合A",
          start_time: null,
          end_time: null,
        }),
        createGame({
          id: "g-2",
          title: "試合B",
          start_time: null,
          end_time: null,
        }),
      ];
      const conflicts = detectConflicts(games);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("SAME_DAY");
    });
  });

  describe("異なる日のとき", () => {
    it("競合を検出しない", () => {
      const games = [
        createGame({ id: "g-1", game_date: "2026-05-01" }),
        createGame({ id: "g-2", game_date: "2026-05-08" }),
      ];
      const conflicts = detectConflicts(games);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("キャンセル済みの試合があるとき", () => {
    it("キャンセル済みを除外する", () => {
      const games = [
        createGame({ id: "g-1", status: "CONFIRMED" }),
        createGame({ id: "g-2", status: "CANCELLED" }),
      ];
      const conflicts = detectConflicts(games);
      expect(conflicts).toHaveLength(0);
    });
  });
});

describe("detectMemberConflicts", () => {
  it("同日に複数の試合にAVAILABLEと回答しているメンバーを検出する", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-01" }),
      createGame({ id: "g-2", game_date: "2026-05-01" }),
    ];
    const memberRsvps = new Map([
      [
        "m-1",
        [
          { game_id: "g-1", response: "AVAILABLE" },
          { game_id: "g-2", response: "AVAILABLE" },
        ],
      ],
    ]);
    const conflicts = detectMemberConflicts(games, memberRsvps);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.memberId).toBe("m-1");
    expect(conflicts[0]?.conflictingGameIds).toContain("g-1");
    expect(conflicts[0]?.conflictingGameIds).toContain("g-2");
  });

  it("UNAVAILABLEの場合は競合にならない", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-01" }),
      createGame({ id: "g-2", game_date: "2026-05-01" }),
    ];
    const memberRsvps = new Map([
      [
        "m-1",
        [
          { game_id: "g-1", response: "AVAILABLE" },
          { game_id: "g-2", response: "UNAVAILABLE" },
        ],
      ],
    ]);
    const conflicts = detectMemberConflicts(games, memberRsvps);
    expect(conflicts).toHaveLength(0);
  });
});
