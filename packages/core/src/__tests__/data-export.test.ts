import { describe, expect, it } from "vitest";
import {
  exportGamesToCSV,
  exportMembersToCSV,
  exportRsvpsToCSV,
  toCSV,
} from "../lib/data-export";
import type { Game, Member, Rsvp } from "../types/domain";

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
    ground_name: "テスト球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: null,
    note: null,
    version: 0,
    available_count: 8,
    unavailable_count: 2,
    maybe_count: 1,
    no_response_count: 3,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("toCSV", () => {
  it("ヘッダーとデータ行をCSVに変換する", () => {
    const csv = toCSV(
      ["名前", "年齢"],
      [
        ["田中", "30"],
        ["鈴木", "25"],
      ],
    );
    expect(csv).toBe("名前,年齢\n田中,30\n鈴木,25");
  });

  it("カンマを含む値をエスケープする", () => {
    const csv = toCSV(["名前"], [["田中, 太郎"]]);
    expect(csv).toContain('"田中, 太郎"');
  });

  it("ダブルクォートをエスケープする", () => {
    const csv = toCSV(["名前"], [['田中"太郎"']]);
    expect(csv).toContain('"田中""太郎"""');
  });
});

describe("exportGamesToCSV", () => {
  it("試合一覧をCSVに変換する", () => {
    const csv = exportGamesToCSV([createGame()]);
    expect(csv).toContain("ID,タイトル");
    expect(csv).toContain("game-1");
    expect(csv).toContain("テスト試合");
    expect(csv).toContain("2026-05-01");
  });

  it("複数の試合を出力する", () => {
    const csv = exportGamesToCSV([
      createGame({ id: "g-1" }),
      createGame({ id: "g-2" }),
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // ヘッダー + 2行
  });
});

describe("exportMembersToCSV", () => {
  it("メンバー一覧をCSVに変換する", () => {
    const member: Member = {
      id: "m-1",
      team_id: "team-1",
      name: "田中太郎",
      tier: "PRO",
      line_user_id: "U123",
      email: "tanaka@example.com",
      expo_push_token: null,
      positions_json: ["投手", "外野手"],
      jersey_number: 1,
      attendance_rate: 0.85,
      no_show_rate: 0.05,
      role: "MEMBER",
      status: "ACTIVE",
      joined_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const csv = exportMembersToCSV([member]);
    expect(csv).toContain("田中太郎");
    expect(csv).toContain("投手/外野手");
    expect(csv).toContain("85%");
    expect(csv).toContain("済"); // LINE連携
  });
});

describe("exportRsvpsToCSV", () => {
  it("出欠一覧をCSVに変換する", () => {
    const rsvps: Rsvp[] = [
      {
        id: "r-1",
        game_id: "g-1",
        member_id: "m-1",
        response: "AVAILABLE",
        responded_at: "2026-04-01T10:00:00Z",
        response_channel: "LINE",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const names = new Map([["m-1", "田中太郎"]]);
    const csv = exportRsvpsToCSV(rsvps, names);
    expect(csv).toContain("田中太郎");
    expect(csv).toContain("参加");
    expect(csv).toContain("LINE");
  });

  it("未回答の回答を「未回答」と表示する", () => {
    const rsvps: Rsvp[] = [
      {
        id: "r-1",
        game_id: "g-1",
        member_id: "m-1",
        response: "NO_RESPONSE",
        responded_at: null,
        response_channel: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const names = new Map([["m-1", "鈴木"]]);
    const csv = exportRsvpsToCSV(rsvps, names);
    expect(csv).toContain("未回答");
  });
});
