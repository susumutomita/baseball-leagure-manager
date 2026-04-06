import { describe, expect, it } from "vitest";
import { recommendOpponents, scoreOpponent } from "../lib/opponent-matcher";
import type { OpponentTeam } from "../types/domain";

function createOpponent(overrides: Partial<OpponentTeam> = {}): OpponentTeam {
  return {
    id: "opp-1",
    team_id: "team-1",
    name: "テスト相手チーム",
    area: "横浜市",
    contact_name: "山田太郎",
    contact_email: "yamada@example.com",
    contact_line: "U1234567",
    contact_phone: "090-1234-5678",
    home_ground: "横浜球場",
    note: null,
    times_played: 3,
    last_played_at: "2025-12-01T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("scoreOpponent", () => {
  describe("エリアが一致するとき", () => {
    it("スコアが高くなる", () => {
      const result = scoreOpponent(createOpponent({ area: "横浜市" }), {
        homeArea: "横浜市",
      });
      expect(result.reasons).toContainEqual(
        expect.stringContaining("活動エリア"),
      );
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("対戦回数が3-5回のとき", () => {
    it("適度な対戦経験として評価される", () => {
      const result = scoreOpponent(createOpponent({ times_played: 4 }), {});
      expect(result.reasons).toContainEqual(
        expect.stringContaining("適度な対戦経験"),
      );
    });
  });

  describe("未対戦のチームのとき", () => {
    it("低めのスコアだが推薦対象になる", () => {
      const result = scoreOpponent(
        createOpponent({ times_played: 0, last_played_at: null }),
        {},
      );
      expect(result.reasons).toContainEqual(expect.stringContaining("未対戦"));
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("半年以上対戦なしのとき", () => {
    it("高い再対戦ボーナスがつく", () => {
      const now = new Date("2026-07-01T00:00:00Z");
      const result = scoreOpponent(
        createOpponent({ last_played_at: "2025-12-01T00:00:00Z" }),
        {},
        now,
      );
      expect(result.reasons).toContainEqual(
        expect.stringContaining("半年以上"),
      );
    });
  });
});

describe("recommendOpponents", () => {
  it("スコア順に推薦する", () => {
    const opponents = [
      createOpponent({
        id: "opp-low",
        name: "低スコア",
        area: "大阪",
        times_played: 0,
        last_played_at: null,
        contact_email: null,
        contact_line: null,
        contact_phone: null,
      }),
      createOpponent({
        id: "opp-high",
        name: "高スコア",
        area: "横浜市",
        times_played: 3,
        last_played_at: "2025-06-01T00:00:00Z",
      }),
    ];
    const now = new Date("2026-04-01T00:00:00Z");
    const result = recommendOpponents(
      opponents,
      { homeArea: "横浜市" },
      5,
      now,
    );
    expect(result[0]?.opponentTeam.id).toBe("opp-high");
    expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
  });

  it("limit数に制限する", () => {
    const opponents = Array.from({ length: 10 }, (_, i) =>
      createOpponent({ id: `opp-${i}`, name: `チーム${i}` }),
    );
    const result = recommendOpponents(opponents, {}, 3);
    expect(result).toHaveLength(3);
  });
});
