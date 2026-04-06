import { describe, expect, it } from "vitest";
import {
  getDefaultPolicy,
  matchPolicy,
  shouldAutoAccept,
  shouldAutoDecline,
} from "../lib/negotiation-policy";
import type {
  NegotiationPolicy,
  NegotiationProposal,
} from "../lib/negotiation-policy";

// --- テストヘルパー ---

function createPolicy(
  overrides: Partial<NegotiationPolicy> = {},
): NegotiationPolicy {
  return {
    ...getDefaultPolicy(),
    ...overrides,
  };
}

function createProposal(
  overrides: Partial<NegotiationProposal> = {},
): NegotiationProposal {
  return {
    date: "2026-05-02", // 土曜日
    time_slot: "MORNING",
    notice_days: 14,
    ...overrides,
  };
}

// --- getDefaultPolicy ---

describe("getDefaultPolicy", () => {
  it("デフォルトポリシーを返す", () => {
    const policy = getDefaultPolicy();
    expect(policy.auto_accept).toBe(false);
    expect(policy.preferred_days).toContain("SATURDAY");
    expect(policy.preferred_days).toContain("SUNDAY");
    expect(policy.min_notice_days).toBe(7);
    expect(policy.blackout_dates).toEqual([]);
  });
});

// --- matchPolicy ---

describe("matchPolicy", () => {
  describe("すべての条件を満たしているとき", () => {
    it("matched: true を返す", () => {
      const policy = createPolicy();
      const proposal = createProposal();

      const result = matchPolicy(proposal, policy);

      expect(result.matched).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe("ブラックアウト日に該当するとき", () => {
    it("matched: false を返す", () => {
      const policy = createPolicy({ blackout_dates: ["2026-05-02"] });
      const proposal = createProposal({ date: "2026-05-02" });

      const result = matchPolicy(proposal, policy);

      expect(result.matched).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("ブラックアウト日"),
      );
    });
  });

  describe("希望曜日外のとき", () => {
    it("matched: false を返す", () => {
      const policy = createPolicy({ preferred_days: ["SATURDAY", "SUNDAY"] });
      // 2026-05-04 は月曜日
      const proposal = createProposal({ date: "2026-05-04" });

      const result = matchPolicy(proposal, policy);

      expect(result.matched).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("希望曜日外"),
      );
    });
  });

  describe("希望時間帯外のとき", () => {
    it("matched: false を返す", () => {
      const policy = createPolicy({ preferred_time_slots: ["MORNING"] });
      const proposal = createProposal({ time_slot: "EVENING" });

      const result = matchPolicy(proposal, policy);

      expect(result.matched).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("希望時間帯外"),
      );
    });
  });

  describe("通知日数が不足しているとき", () => {
    it("matched: false を返す", () => {
      const policy = createPolicy({ min_notice_days: 14 });
      const proposal = createProposal({ notice_days: 3 });

      const result = matchPolicy(proposal, policy);

      expect(result.matched).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("通知日数が不足"),
      );
    });
  });
});

// --- shouldAutoAccept ---

describe("shouldAutoAccept", () => {
  describe("auto_accept=true でポリシーに合致するとき", () => {
    it("true を返す", () => {
      const policy = createPolicy({ auto_accept: true });
      const proposal = createProposal();

      const result = shouldAutoAccept(proposal, policy);

      expect(result).toBe(true);
    });
  });

  describe("auto_accept=false のとき", () => {
    it("false を返す", () => {
      const policy = createPolicy({ auto_accept: false });
      const proposal = createProposal();

      const result = shouldAutoAccept(proposal, policy);

      expect(result).toBe(false);
    });
  });

  describe("auto_accept=true だがポリシーに合致しないとき", () => {
    it("false を返す", () => {
      const policy = createPolicy({
        auto_accept: true,
        blackout_dates: ["2026-05-02"],
      });
      const proposal = createProposal({ date: "2026-05-02" });

      const result = shouldAutoAccept(proposal, policy);

      expect(result).toBe(false);
    });
  });
});

// --- shouldAutoDecline ---

describe("shouldAutoDecline", () => {
  describe("ブラックアウト日に該当するとき", () => {
    it("decline: true を返す", () => {
      const policy = createPolicy({ blackout_dates: ["2026-05-02"] });
      const proposal = createProposal({ date: "2026-05-02" });

      const result = shouldAutoDecline(proposal, policy);

      expect(result.decline).toBe(true);
      expect(result.reason).toContain("ブラックアウト日");
    });
  });

  describe("自動辞退理由が設定されているとき", () => {
    it("decline: true を返す", () => {
      const policy = createPolicy({
        auto_decline_reasons: ["大会期間中のため対応不可"],
      });
      const proposal = createProposal();

      const result = shouldAutoDecline(proposal, policy);

      expect(result.decline).toBe(true);
      expect(result.reason).toBe("大会期間中のため対応不可");
    });
  });

  describe("辞退理由がないとき", () => {
    it("decline: false を返す", () => {
      const policy = createPolicy();
      const proposal = createProposal();

      const result = shouldAutoDecline(proposal, policy);

      expect(result.decline).toBe(false);
      expect(result.reason).toBeNull();
    });
  });
});
