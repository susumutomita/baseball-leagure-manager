import { describe, expect, it } from "vitest";
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

    it("各ゲームのUID が個別に含まれる", () => {
      const games = [
        createGame({ id: "game-abc" }),
        createGame({ id: "game-xyz" }),
      ];
      const result = generateICalFeed(games, "テストチーム");

      expect(result).toContain("UID:game-abc");
      expect(result).toContain("UID:game-xyz");
    });

    it("3つ以上の試合でも正しく生成される", () => {
      const games = [
        createGame({ id: "g1", title: "第1試合" }),
        createGame({ id: "g2", title: "第2試合" }),
        createGame({ id: "g3", title: "第3試合" }),
        createGame({ id: "g4", title: "第4試合" }),
      ];
      const result = generateICalFeed(games, "チーム名");

      const eventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
      expect(eventCount).toBe(4);
    });
  });

  describe("カレンダー名に特殊文字が含まれるとき", () => {
    it("カンマがエスケープされる", () => {
      const result = generateICalFeed([], "チームA,B");

      expect(result).toContain("X-WR-CALNAME:チームA\\,B");
    });

    it("セミコロンがエスケープされる", () => {
      const result = generateICalFeed([], "チーム;テスト");

      expect(result).toContain("X-WR-CALNAME:チーム\\;テスト");
    });
  });

  describe("出力フォーマットのとき", () => {
    it("CRLF で改行される", () => {
      const result = generateICalFeed([], "テスト");

      expect(result).toContain("\r\n");
    });

    it("末尾が CRLF で終わる", () => {
      const result = generateICalFeed([], "テスト");

      expect(result.endsWith("\r\n")).toBe(true);
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

  describe("end_time が null で start_time がある場合", () => {
    it("end_time にデフォルト値 (12:00) が使われる", () => {
      const game = createGame({
        game_date: "2026-05-01",
        start_time: "10:00",
        end_time: null,
      });
      const result = generateVEvent(game);

      expect(result).toContain("DTSTART:20260501T100000");
      expect(result).toContain("DTEND:20260501T120000");
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

  describe("試合が COMPLETED のとき", () => {
    it("STATUS を CONFIRMED にする", () => {
      const game = createGame({ status: "COMPLETED" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:CONFIRMED");
    });
  });

  describe("試合が SETTLED のとき", () => {
    it("STATUS を CONFIRMED にする", () => {
      const game = createGame({ status: "SETTLED" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:CONFIRMED");
    });
  });

  describe("試合が DRAFT のとき", () => {
    it("STATUS を TENTATIVE にする", () => {
      const game = createGame({ status: "DRAFT" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:TENTATIVE");
    });
  });

  describe("試合が CANCELLED のとき", () => {
    it("STATUS を CANCELLED にする", () => {
      const game = createGame({ status: "CANCELLED" });
      const result = generateVEvent(game);

      expect(result).toContain("STATUS:CANCELLED");
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

  describe("ground_name に特殊文字が含まれるとき", () => {
    it("カンマがエスケープされる", () => {
      const game = createGame({ ground_name: "球場A,B" });
      const result = generateVEvent(game);

      expect(result).toContain("LOCATION:球場A\\,B");
    });

    it("セミコロンがエスケープされる", () => {
      const game = createGame({ ground_name: "球場;第1グラウンド" });
      const result = generateVEvent(game);

      expect(result).toContain("LOCATION:球場\\;第1グラウンド");
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

  describe("タイトルに特殊文字が含まれるとき", () => {
    it("カンマがエスケープされる", () => {
      const game = createGame({ title: "練習試合,ダブルヘッダー" });
      const result = generateVEvent(game);

      expect(result).toContain("SUMMARY:練習試合\\,ダブルヘッダー");
    });
  });

  describe("午後の時刻が設定されているとき", () => {
    it("正しい時刻フォーマットで出力される", () => {
      const game = createGame({
        game_date: "2026-12-25",
        start_time: "14:30",
        end_time: "17:00",
      });
      const result = generateVEvent(game);

      expect(result).toContain("DTSTART:20261225T143000");
      expect(result).toContain("DTEND:20261225T170000");
    });
  });

  describe("VEVENT ブロック構造のとき", () => {
    it("BEGIN:VEVENT で始まり END:VEVENT で終わる", () => {
      const game = createGame();
      const result = generateVEvent(game);

      expect(result.startsWith("BEGIN:VEVENT")).toBe(true);
      expect(result.endsWith("END:VEVENT")).toBe(true);
    });
  });
});
