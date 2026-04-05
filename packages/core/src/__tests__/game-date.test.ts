import { describe, expect, it } from "bun:test";
import {
  daysUntilGame,
  filterGamesByDateRange,
  formatGameSchedule,
  getThisWeekGames,
  isGameDay,
  isGameFuture,
  isGamePast,
  sortGamesByDate,
} from "../lib/game-date";
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

describe("daysUntilGame", () => {
  it("試合日まで3日のとき3を返す", () => {
    const now = new Date("2026-04-28T00:00:00Z");
    expect(daysUntilGame(createGame(), now)).toBe(3);
  });

  it("試合日が過去のとき負の値を返す", () => {
    const now = new Date("2026-05-03T00:00:00Z");
    expect(daysUntilGame(createGame(), now)).toBeLessThan(0);
  });

  it("game_dateがnullのときnullを返す", () => {
    expect(daysUntilGame(createGame({ game_date: null }))).toBeNull();
  });
});

describe("isGameDay", () => {
  it("今日が試合日のときtrueを返す", () => {
    const now = new Date("2026-05-01T10:00:00");
    expect(isGameDay(createGame(), now)).toBe(true);
  });

  it("今日が試合日でないときfalseを返す", () => {
    const now = new Date("2026-05-02T10:00:00");
    expect(isGameDay(createGame(), now)).toBe(false);
  });

  it("game_dateがnullのときfalseを返す", () => {
    expect(isGameDay(createGame({ game_date: null }))).toBe(false);
  });
});

describe("isGamePast", () => {
  it("試合日が昨日以前のときtrueを返す", () => {
    const now = new Date("2026-05-02T10:00:00");
    expect(isGamePast(createGame(), now)).toBe(true);
  });

  it("試合日が明日以降のときfalseを返す", () => {
    const now = new Date("2026-04-30T10:00:00");
    expect(isGamePast(createGame(), now)).toBe(false);
  });
});

describe("isGameFuture", () => {
  it("試合日が明日以降のときtrueを返す", () => {
    const now = new Date("2026-04-30T10:00:00");
    expect(isGameFuture(createGame(), now)).toBe(true);
  });

  it("試合日が今日のときfalseを返す", () => {
    const now = new Date("2026-05-01T10:00:00");
    expect(isGameFuture(createGame(), now)).toBe(false);
  });
});

describe("formatGameSchedule", () => {
  it("日付と時刻をフォーマットする", () => {
    const result = formatGameSchedule(createGame());
    expect(result).toContain("5/1");
    expect(result).toContain("09:00");
    expect(result).toContain("12:00");
  });

  it("時刻なしの場合は日付のみ", () => {
    const result = formatGameSchedule(
      createGame({ start_time: null, end_time: null }),
    );
    expect(result).toContain("5/1");
    expect(result).not.toContain("09:00");
  });

  it("game_dateがnullのとき「日程未定」を返す", () => {
    expect(formatGameSchedule(createGame({ game_date: null }))).toBe(
      "日程未定",
    );
  });
});

describe("sortGamesByDate", () => {
  it("昇順でソートする", () => {
    const games = [
      createGame({ id: "g-3", game_date: "2026-05-15" }),
      createGame({ id: "g-1", game_date: "2026-05-01" }),
      createGame({ id: "g-2", game_date: "2026-05-08" }),
    ];
    const sorted = sortGamesByDate(games);
    expect(sorted[0]?.id).toBe("g-1");
    expect(sorted[1]?.id).toBe("g-2");
    expect(sorted[2]?.id).toBe("g-3");
  });

  it("降順でソートできる", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-05-01" }),
      createGame({ id: "g-2", game_date: "2026-05-08" }),
    ];
    const sorted = sortGamesByDate(games, false);
    expect(sorted[0]?.id).toBe("g-2");
    expect(sorted[1]?.id).toBe("g-1");
  });

  it("日程未定の試合は最後に置く", () => {
    const games = [
      createGame({ id: "g-none", game_date: null }),
      createGame({ id: "g-1", game_date: "2026-05-01" }),
    ];
    const sorted = sortGamesByDate(games);
    expect(sorted[0]?.id).toBe("g-1");
    expect(sorted[1]?.id).toBe("g-none");
  });

  it("元の配列を変更しない", () => {
    const games = [createGame({ id: "g-1" })];
    const sorted = sortGamesByDate(games);
    expect(sorted).not.toBe(games);
  });
});

describe("filterGamesByDateRange", () => {
  it("指定期間内の試合のみ返す", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-04-15" }),
      createGame({ id: "g-2", game_date: "2026-05-01" }),
      createGame({ id: "g-3", game_date: "2026-06-01" }),
    ];
    const result = filterGamesByDateRange(
      games,
      new Date("2026-04-20"),
      new Date("2026-05-10"),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("g-2");
  });
});

describe("getThisWeekGames", () => {
  it("今週の試合を返す", () => {
    // 2026-05-01 is Friday
    const now = new Date("2026-04-28T10:00:00"); // Tuesday
    const games = [
      createGame({ id: "last-week", game_date: "2026-04-20" }),
      createGame({ id: "this-week", game_date: "2026-04-29" }), // Wednesday
      createGame({ id: "next-week", game_date: "2026-05-05" }),
    ];
    const result = getThisWeekGames(games, now);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("this-week");
  });
});
