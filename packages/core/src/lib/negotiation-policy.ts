// ============================================================
// 交渉ポリシー — エージェント間交渉の自動判定ロジック
// ============================================================
import { z } from "zod/v4";

// --- 型定義 ---

export const DAY_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type DayOfWeek = (typeof DAY_OF_WEEK)[number];

export const TIME_SLOT = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type TimeSlot = (typeof TIME_SLOT)[number];

export const COST_SPLIT = ["HALF", "HOME_PAYS", "VISITOR_PAYS"] as const;
export type CostSplit = (typeof COST_SPLIT)[number];

export interface NegotiationPolicy {
  auto_accept: boolean;
  preferred_days: DayOfWeek[];
  preferred_time_slots: TimeSlot[];
  max_travel_minutes: number;
  cost_split: CostSplit;
  min_notice_days: number;
  blackout_dates: string[];
  auto_decline_reasons: string[];
}

// --- Zod スキーマ ---

export const negotiationPolicySchema = z.object({
  auto_accept: z.boolean(),
  preferred_days: z.array(z.enum(DAY_OF_WEEK)),
  preferred_time_slots: z.array(z.enum(TIME_SLOT)),
  max_travel_minutes: z.number().int().min(0).max(480),
  cost_split: z.enum(COST_SPLIT),
  min_notice_days: z.number().int().min(0).max(90),
  blackout_dates: z.array(z.string().date()),
  auto_decline_reasons: z.array(z.string().max(200)),
});

// --- パッチ用スキーマ (全フィールドoptional) ---

export const negotiationPolicyPatchSchema = negotiationPolicySchema.partial();

// --- デフォルトポリシー ---

export function getDefaultPolicy(): NegotiationPolicy {
  return {
    auto_accept: false,
    preferred_days: ["SATURDAY", "SUNDAY"],
    preferred_time_slots: ["MORNING", "AFTERNOON"],
    max_travel_minutes: 60,
    cost_split: "HALF",
    min_notice_days: 7,
    blackout_dates: [],
    auto_decline_reasons: [],
  };
}

// --- 提案の型 ---

export interface NegotiationProposal {
  date: string;
  time_slot: string;
  notice_days: number;
}

// --- ポリシーマッチ判定 ---

const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export function matchPolicy(
  proposal: NegotiationProposal,
  policy: NegotiationPolicy,
): { matched: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 曜日チェック
  if (policy.preferred_days.length > 0) {
    const proposalDate = new Date(`${proposal.date}T00:00:00`);
    const dayOfWeek = DAY_INDEX_MAP[proposalDate.getDay()];
    if (dayOfWeek && !policy.preferred_days.includes(dayOfWeek)) {
      reasons.push(
        `希望曜日外です (${dayOfWeek} は ${policy.preferred_days.join(", ")} に含まれません)`,
      );
    }
  }

  // 時間帯チェック
  if (policy.preferred_time_slots.length > 0) {
    if (!policy.preferred_time_slots.includes(proposal.time_slot as TimeSlot)) {
      reasons.push(
        `希望時間帯外です (${proposal.time_slot} は ${policy.preferred_time_slots.join(", ")} に含まれません)`,
      );
    }
  }

  // 最低通知日数チェック
  if (proposal.notice_days < policy.min_notice_days) {
    reasons.push(
      `通知日数が不足しています (${proposal.notice_days}日 < 最低${policy.min_notice_days}日)`,
    );
  }

  // ブラックアウト日チェック
  if (policy.blackout_dates.includes(proposal.date)) {
    reasons.push(`${proposal.date} はブラックアウト日に指定されています`);
  }

  return {
    matched: reasons.length === 0,
    reasons,
  };
}

// --- 自動承諾判定 ---

export function shouldAutoAccept(
  proposal: NegotiationProposal,
  policy: NegotiationPolicy,
): boolean {
  if (!policy.auto_accept) return false;
  const result = matchPolicy(proposal, policy);
  return result.matched;
}

// --- 自動辞退判定 ---

export function shouldAutoDecline(
  proposal: NegotiationProposal,
  policy: NegotiationPolicy,
): { decline: boolean; reason: string | null } {
  // ブラックアウト日チェック
  if (policy.blackout_dates.includes(proposal.date)) {
    return {
      decline: true,
      reason: `${proposal.date} はブラックアウト日に指定されています`,
    };
  }

  // 自動辞退理由チェック
  for (const reason of policy.auto_decline_reasons) {
    // 自動辞退理由がある場合、その理由に基づいて辞退
    return {
      decline: true,
      reason,
    };
  }

  return { decline: false, reason: null };
}
