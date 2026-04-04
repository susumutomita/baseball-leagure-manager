import { describe, expect, it } from "bun:test";
import { estimateGameCost } from "../lib/cost-estimator";

describe("estimateGameCost", () => {
  const historicalData = [
    {
      game_type: "FRIENDLY" as const,
      expenses: [
        { category: "GROUND" as const, amount: 5000 },
        { category: "UMPIRE" as const, amount: 2000 },
      ],
    },
    {
      game_type: "FRIENDLY" as const,
      expenses: [
        { category: "GROUND" as const, amount: 6000 },
        { category: "UMPIRE" as const, amount: 2000 },
        { category: "BALL" as const, amount: 1000 },
      ],
    },
    {
      game_type: "FRIENDLY" as const,
      expenses: [
        { category: "GROUND" as const, amount: 4000 },
        { category: "UMPIRE" as const, amount: 2000 },
      ],
    },
  ];

  it("同じゲームタイプから見積もりを生成する", () => {
    const result = estimateGameCost(historicalData, "FRIENDLY", 10);
    expect(result.estimatedTotal).toBeGreaterThan(0);
    expect(result.estimatedPerMember).toBeGreaterThan(0);
    expect(result.basedOnGames).toBe(3);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("カテゴリ別の内訳を含む", () => {
    const result = estimateGameCost(historicalData, "FRIENDLY", 10);
    const ground = result.breakdown.find((b) => b.category === "GROUND");
    expect(ground).toBeDefined();
    expect(ground!.estimatedAmount).toBe(5000); // (5000+6000+4000)/3
  });

  it("一人あたりの見積もりを切り上げで計算する", () => {
    const result = estimateGameCost(historicalData, "FRIENDLY", 3);
    expect(result.estimatedPerMember).toBe(
      Math.ceil(result.estimatedTotal / 3),
    );
  });

  it("データがないときLOW信頼度を返す", () => {
    const result = estimateGameCost([], "FRIENDLY", 10);
    expect(result.confidence).toBe("LOW");
    expect(result.estimatedTotal).toBe(0);
    expect(result.basedOnGames).toBe(0);
  });

  it("異なるゲームタイプのデータが不足時は全データを使用する", () => {
    const result = estimateGameCost(historicalData, "LEAGUE", 10);
    expect(result.basedOnGames).toBe(3); // LEAGUE=0件なので全データ
    expect(result.confidence).toBe("LOW"); // LEAGUE固有のデータなし
  });

  it("5件以上の同種データがあるときHIGH信頼度を返す", () => {
    const moreData = Array.from({ length: 5 }, () => ({
      game_type: "FRIENDLY" as const,
      expenses: [{ category: "GROUND" as const, amount: 5000 }],
    }));
    const result = estimateGameCost(moreData, "FRIENDLY", 10);
    expect(result.confidence).toBe("HIGH");
  });
});
