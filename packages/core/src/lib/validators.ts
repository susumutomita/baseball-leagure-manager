// ============================================================
// Zod バリデーションスキーマ — 全 API 入力の型安全な検証
// ============================================================
import { z } from "zod/v4";

// --- 共通 ---

export const uuidSchema = z.string().uuid();

// --- Game ---

/** HH:MM 形式の時刻文字列 */
const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "時刻はHH:MM形式で入力してください");

export const createGameSchema = z
  .object({
    team_id: uuidSchema,
    title: z.string().min(1, "タイトルは必須です").max(200),
    game_type: z
      .enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"])
      .default("FRIENDLY"),
    game_date: z.string().date().nullable().default(null),
    start_time: timeStringSchema.nullable().default(null),
    end_time: timeStringSchema.nullable().default(null),
    ground_name: z.string().nullable().default(null),
    min_players: z.number().int().min(1).max(30).default(9),
    rsvp_deadline: z.string().datetime().nullable().default(null),
    note: z.string().max(1000).nullable().default(null),
  })
  .superRefine((data, ctx) => {
    // start_time と end_time が両方指定されている場合、start < end を検証
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      ctx.addIssue({
        code: "custom",
        message: "開始時刻は終了時刻より前である必要があります",
        path: ["end_time"],
      });
    }
    // rsvp_deadline と game_date が両方指定されている場合、deadline < game_date を検証
    if (data.rsvp_deadline && data.game_date) {
      const deadline = new Date(data.rsvp_deadline);
      const gameDate = new Date(data.game_date);
      if (deadline >= gameDate) {
        ctx.addIssue({
          code: "custom",
          message: "出欠締切は試合日より前である必要があります",
          path: ["rsvp_deadline"],
        });
      }
    }
  });
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const updateGameSchema = z
  .object({
    title: z.string().min(1, "タイトルは必須です").max(200).optional(),
    game_type: z
      .enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"])
      .optional(),
    game_date: z.string().date().nullable().optional(),
    start_time: timeStringSchema.nullable().optional(),
    end_time: timeStringSchema.nullable().optional(),
    ground_name: z.string().nullable().optional(),
    ground_id: z.string().uuid().nullable().optional(),
    min_players: z.number().int().min(1).max(30).optional(),
    rsvp_deadline: z.string().datetime().nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      ctx.addIssue({
        code: "custom",
        message: "開始時刻は終了時刻より前である必要があります",
        path: ["end_time"],
      });
    }
    if (data.rsvp_deadline && data.game_date) {
      const deadline = new Date(data.rsvp_deadline);
      const gameDate = new Date(data.game_date);
      if (deadline >= gameDate) {
        ctx.addIssue({
          code: "custom",
          message: "出欠締切は試合日より前である必要があります",
          path: ["rsvp_deadline"],
        });
      }
    }
  });
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export const transitionGameSchema = z.object({
  status: z.enum([
    "DRAFT",
    "COLLECTING",
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

export const createNegotiationSchema = z
  .object({
    opponent_team_id: uuidSchema,
    proposed_dates: z
      .array(z.string().date())
      .min(1, "候補日を1日以上指定してください"),
    message: z.string().max(1000).nullable().default(null),
    actor_id: z.string().default("SYSTEM"),
    actor_type: z.enum(["USER", "SYSTEM", "AI"]).default("USER"),
  })
  .superRefine((data, ctx) => {
    // proposed_dates に過去日が含まれていないことを検証
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDates = data.proposed_dates.filter((d) => new Date(d) < today);
    if (pastDates.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "候補日に過去の日付は指定できません",
        path: ["proposed_dates"],
      });
    }
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

// --- Ground ---

export const createGroundSchema = z.object({
  team_id: uuidSchema,
  name: z.string().min(1, "グラウンド名は必須です").max(200),
  municipality: z.string().min(1, "市区町村は必須です").max(200),
  source_url: z.string().url().nullable().default(null),
  cost_per_slot: z.number().int().min(0).nullable().default(null),
  is_hardball_ok: z.boolean().default(false),
  has_night_lights: z.boolean().default(false),
  note: z.string().max(500).nullable().default(null),
});
export type CreateGroundInput = z.infer<typeof createGroundSchema>;

export const updateGroundWatchSchema = z.object({
  watch_active: z.boolean(),
  conditions_json: z.record(z.string(), z.unknown()).nullable().default(null),
});
export type UpdateGroundWatchInput = z.infer<typeof updateGroundWatchSchema>;

// --- Notification ---

export const sendNotificationSchema = z.object({
  game_id: uuidSchema,
  notification_type: z.enum([
    "RSVP_REQUEST",
    "REMINDER",
    "DEADLINE",
    "HELPER_REQUEST",
    "SETTLEMENT",
    "CANCELLATION",
    "GROUND_ALERT",
  ]),
  message: z.string().max(1000).nullable().default(null),
});
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

// --- League ---

export const createLeagueSchema = z.object({
  name: z.string().min(1, "リーグ名は必須です").max(200),
  season: z.string().min(1, "シーズンは必須です").max(100),
  area: z.string().max(200).nullable().default(null),
  format: z
    .enum(["ROUND_ROBIN", "TOURNAMENT", "DOUBLE_ROUND_ROBIN"])
    .default("ROUND_ROBIN"),
  organizer_user_id: uuidSchema,
  max_teams: z.number().int().min(2).max(100).default(20),
});
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const recordMatchResultSchema = z.object({
  home_score: z.number().int().min(0, "スコアは0以上です"),
  away_score: z.number().int().min(0, "スコアは0以上です"),
});
export type RecordMatchResultInput = z.infer<typeof recordMatchResultSchema>;

// --- Team Invitation ---

export const createInvitationSchema = z.object({
  team_id: uuidSchema,
  invite_type: z.enum(["OPPONENT", "HELPER", "LEAGUE", "MEMBER"]),
  created_by: uuidSchema,
  expires_at: z.string().datetime().nullable().default(null),
  max_uses: z.number().int().min(1).nullable().default(null),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// --- Team Profile ---

export const updateTeamProfileSchema = z.object({
  is_public: z.boolean().optional(),
  description: z.string().max(1000).nullable().optional(),
  activity_area: z.string().max(200).nullable().optional(),
  skill_level: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "COMPETITIVE"])
    .nullable()
    .optional(),
  member_count: z.number().int().min(0).optional(),
  founded_year: z.number().int().min(1900).max(2100).nullable().optional(),
  looking_for_opponents: z.boolean().optional(),
  looking_for_helpers: z.boolean().optional(),
  photo_url: z.string().url().nullable().optional(),
});
export type UpdateTeamProfileInput = z.infer<typeof updateTeamProfileSchema>;

// --- Team RSVP Settings ---

export const updateTeamRsvpSettingsSchema = z.object({
  deadline_default_response: z.enum(["UNAVAILABLE", "NO_RESPONSE"]).optional(),
  rsvp_visibility: z.enum(["ALL", "ADMIN_ONLY", "AGGREGATE_ONLY"]).optional(),
  reminder_escalation: z.boolean().optional(),
  early_bird_priority: z.boolean().optional(),
});
export type UpdateTeamRsvpSettingsInput = z.infer<
  typeof updateTeamRsvpSettingsSchema
>;

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
