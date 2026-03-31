// ============================================================
// Zod バリデーションスキーマ — 全 API 入力の型安全な検証
// ============================================================
import { z } from "zod/v4";

// --- 共通 ---

export const uuidSchema = z.string().uuid();

// --- Game ---

export const createGameSchema = z.object({
  team_id: uuidSchema,
  title: z.string().min(1, "タイトルは必須です").max(200),
  game_type: z
    .enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"])
    .default("FRIENDLY"),
  game_date: z.string().date().nullable().default(null),
  start_time: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  ground_name: z.string().nullable().default(null),
  min_players: z.number().int().min(1).max(30).default(9),
  rsvp_deadline: z.string().datetime().nullable().default(null),
  note: z.string().max(1000).nullable().default(null),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const transitionGameSchema = z.object({
  status: z.enum([
    "DRAFT",
    "COLLECTING",
    "ASSESSING",
    "ARRANGING",
    "CONFIRMED",
    "COMPLETED",
    "SETTLED",
    "CANCELLED",
  ]),
  version: z.number().int().min(0).optional(),
  actor_id: z.string().default("SYSTEM"),
});
export type TransitionGameInput = z.infer<typeof transitionGameSchema>;

// --- RSVP ---

export const respondRsvpSchema = z.object({
  response: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
  channel: z.enum(["APP", "LINE", "EMAIL", "WEB"]).default("WEB"),
});
export type RespondRsvpInput = z.infer<typeof respondRsvpSchema>;

// --- Helper ---

export const createHelperSchema = z.object({
  team_id: uuidSchema,
  name: z.string().min(1, "名前は必須です").max(100),
  line_user_id: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  note: z.string().max(500).nullable().default(null),
});
export type CreateHelperInput = z.infer<typeof createHelperSchema>;

// --- HelperRequest ---

export const createHelperRequestsSchema = z.object({
  helper_ids: z.array(uuidSchema).min(1, "助っ人を1人以上選択してください"),
  message: z.string().max(500).nullable().default(null),
  actor_id: z.string().default("SYSTEM"),
});
export type CreateHelperRequestsInput = z.infer<
  typeof createHelperRequestsSchema
>;

export const respondHelperRequestSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED"]),
  cancel_reason: z.string().nullable().default(null),
  actor_id: z.string().default("SYSTEM"),
});
export type RespondHelperRequestInput = z.infer<
  typeof respondHelperRequestSchema
>;

// --- Negotiation ---

export const createNegotiationSchema = z.object({
  opponent_team_id: uuidSchema,
  proposed_dates: z
    .array(z.string().date())
    .min(1, "候補日を1日以上指定してください"),
  message: z.string().max(1000).nullable().default(null),
  actor_id: z.string().default("SYSTEM"),
  actor_type: z.enum(["USER", "SYSTEM", "AI"]).default("USER"),
});
export type CreateNegotiationInput = z.infer<typeof createNegotiationSchema>;

export const updateNegotiationSchema = z.object({
  status: z.enum(["SENT", "REPLIED", "ACCEPTED", "DECLINED", "CANCELLED"]),
  reply_message: z.string().max(1000).nullable().default(null),
  cancel_reason: z.string().nullable().default(null),
  actor_id: z.string().default("SYSTEM"),
  actor_type: z.enum(["USER", "SYSTEM", "AI"]).default("USER"),
});
export type UpdateNegotiationInput = z.infer<typeof updateNegotiationSchema>;

// --- Expense ---

export const createExpenseSchema = z.object({
  category: z.enum([
    "GROUND",
    "UMPIRE",
    "BALL",
    "DRINK",
    "TOURNAMENT_FEE",
    "OTHER",
  ]),
  amount: z.number().int().min(0, "金額は0以上です"),
  paid_by: uuidSchema.nullable().default(null),
  split_with_opponent: z.boolean().default(false),
  note: z.string().max(500).nullable().default(null),
  actor_id: z.string().default("SYSTEM"),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// --- Team ---

export const createTeamSchema = z.object({
  name: z.string().min(1, "チーム名は必須です").max(100),
  home_area: z.string().min(1, "活動エリアは必須です").max(200),
  activity_day: z.string().nullable().default(null),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

// --- Zod エラー → AppError 変換 ---

import type { ValidationErr } from "./result";

export function zodToValidationError(error: z.ZodError): ValidationErr {
  return {
    type: "VALIDATION_ERROR",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
