import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "チーム名は必須です").max(100),
  home_area: z.string().min(1, "活動エリアは必須です").max(100),
  level_band: z.string().optional(),
  payment_method: z.string().optional(),
});

export const createMemberSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1, "名前は必須です").max(50),
  tier: z.enum(["PRO", "LITE"]),
  email: z
    .string()
    .email("メールアドレスが不正です")
    .optional()
    .or(z.literal("")),
  positions_json: z.array(z.string()).default([]),
  jersey_number: z.coerce.number().int().min(0).max(999).optional(),
});

export const createGameSchema = z.object({
  team_id: z.string().min(1),
  title: z.string().min(1, "タイトルは必須です").max(200),
  game_type: z.enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"]),
  game_date: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  ground_name: z.string().nullable().optional(),
  min_players: z.coerce.number().int().min(1).max(30).default(9),
  note: z.string().nullable().optional(),
});

export const updateRsvpSchema = z.object({
  response: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
  channel: z.string().optional(),
});
