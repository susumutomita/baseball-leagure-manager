import { describe, expect, it } from "bun:test";
import { generateICalFeed, generateVEvent } from "../lib/ical";
import type { Game } from "../types/domain";

// --- テストヘルパー ---

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COLLECTING",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: "ground-1",
    ground_name: "テスト球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-20T00:00:00Z",
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

describe("generateICalFeed", () => {
  describe("試合が存在するとき", () => {
    it("有効な VCALENDAR 構造を返す", () => {
      const games = [createGame()];
      const result = generateICalFeed(games, "テストチーム");

      expect(result).toContain("BEGIN:VCALENDAR");
      expect(result).toContain("END:VCALENDAR");
      expect(result).toContain("VERSION:2.0");
      expect(result).toContain("PRODID:-//match-engine//mound//JP");
      expect(result).toContain("X-WR-CALNAME:テストチーム");
    });

    it("VEVENT を含む", () => {
      const games = [createGame()];
      const result = generateICalFeed(games, "テストチーム");

      expect(result).toContain("BEGIN:VEVENT");
      expect(result).toContain("END:VEVENT");
    });
  });

  describe("試合が空のとき", () => {
    it("VEVENT を含まない空のカレンダーを返す", () => {
      const result = generateICalFeed([], "テストチーム");

      expect(result).toContain("BEGIN:VCALENDAR");
      expect(result).toContain("END:VCALENDAR");
      expect(result).not.toContain("BEGIN:VEVENT");
    });
  });

  describe("複数の試合があるとき", () => {
    it("すべての試合分の VEVENT を含む", () => {
      const games = [
        createGame({ id: "game-1" }),
        createGame({ id: "game-2", title: "第二試合" }),
      ];
      const result = generateICalFeed(games, "テストチーム");

      const eventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
      expect(eventCount).toBe(2);
    });
  });
});

describe("generateVEvent", () => {
  describe("start_time と end_time が設定されているとき", () => {
    it("DTSTART/DTEND に時刻付きの値を設定する", () => {
      const game = createGame({
        game_date: "2026-05-01",
        start_time: "09:00",
        end_time: "12:00",
      });
      const result = generateVEvent(game);

      expect(result).toContain("DTSTART:20260501T090000");
      expect(result).toContain("DTEND:20260501T120000");
    });
  });

  describe("start_time が null のとき", () => {
    it("VALUE=DATE 形式の終日イベントを生成する", () => {
      const game = createGame({
        game_date: "2026-05-01",
        start_time: null,
        end_time: null,
      });
      const result = generateVEvent(game);

      expect(result).toContain("DTSTART;VALUE=DATE:20260501");
      expect(result).toContain("DTEND;VALUE=DATE:20260501");
    });
  });

  describe("試合が CONFIRMED のとき", () => {
    it("STATUS を CONFIRMED にする", () => {
      const game = createGame({ status: "CONFIRMED" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:CONFIRMED");
    });
  });

  describe("試合が COLLECTING のとき", () => {
    it("STATUS を TENTATIVE にする", () => {
      const game = createGame({ status: "COLLECTING" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:TENTATIVE");
    });
  });

  describe("ground_name が設定されているとき", () => {
    it("LOCATION を含む", () => {
      const game = createGame({ ground_name: "テスト球場" });
      const result = generateVEvent(game);

      expect(result).toContain("LOCATION:テスト球場");
    });
  });

  describe("ground_name が null のとき", () => {
    it("LOCATION を含まない", () => {
      const game = createGame({ ground_name: null });
      const result = generateVEvent(game);

      expect(result).not.toContain("LOCATION:");
    });
  });

  it("UID にゲーム ID を設定する", () => {
    const game = createGame({ id: "abc-123" });
    const result = generateVEvent(game);

    expect(result).toContain("UID:abc-123");
  });

  it("SUMMARY にタイトルを設定する", () => {
    const game = createGame({ title: "春季リーグ第1戦" });
    const result = generateVEvent(game);

    expect(result).toContain("SUMMARY:春季リーグ第1戦");
  });

  describe("試合が CANCELLED のとき", () => {
    it("STATUS を CANCELLED にする", () => {
      const game = createGame({ status: "CANCELLED" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:CANCELLED");
    });
  });

  describe("note が設定されているとき", () => {
    it("DESCRIPTION を含む", () => {
      const game = createGame({ note: "雨天時は中止" });
      const result = generateVEvent(game);

      expect(result).toContain("DESCRIPTION:雨天時は中止");
    });
  });

  describe("note が null のとき", () => {
    it("DESCRIPTION を含まない", () => {
      const game = createGame({ note: null });
      const result = generateVEvent(game);

      expect(result).not.toContain("DESCRIPTION:");
    });
  });

  it("DTSTAMP を含む", () => {
    const game = createGame();
    const result = generateVEvent(game);

    expect(result).toContain("DTSTAMP:");
  });

  it("特殊文字をエスケープする", () => {
    const game = createGame({ title: "試合; テスト, チーム" });
    const result = generateVEvent(game);

    expect(result).toContain("SUMMARY:試合\\; テスト\\, チーム");
  });
});
