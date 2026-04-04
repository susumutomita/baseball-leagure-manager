#!/usr/bin/env bun
/**
 * CSV Import Script — チームデータの一括インポート
 *
 * Usage:
 *   bun run scripts/import-csv.ts members ./data/members.csv
 *   bun run scripts/import-csv.ts games ./data/games.csv
 *   bun run scripts/import-csv.ts opponents ./data/opponents.csv
 *   bun run scripts/import-csv.ts helpers ./data/helpers.csv
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { z } from "zod";

// ─── Zod schemas ───

const MemberRowSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1),
  tier: z.enum(["PRO", "LITE"]).default("PRO"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MEMBER"]).default("MEMBER"),
  email: z.string().email().optional().or(z.literal("")),
  line_user_id: z.string().optional().or(z.literal("")),
  positions_json: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return "[]";
      try {
        JSON.parse(v);
        return v;
      } catch {
        return "[]";
      }
    }),
  jersey_number: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).max(999).optional()),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("ACTIVE"),
});

const GameRowSchema = z.object({
  team_id: z.string().uuid(),
  title: z.string().min(1),
  game_type: z
    .enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"])
    .default("FRIENDLY"),
  status: z
    .enum([
      "DRAFT",
      "COLLECTING",
      "ASSESSING",
      "ARRANGING",
      "CONFIRMED",
      "COMPLETED",
      "SETTLED",
      "CANCELLED",
    ])
    .default("DRAFT"),
  game_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  start_time: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  end_time: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  ground_name: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  min_players: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : 9))
    .pipe(z.number().int().min(1)),
  note: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

const OpponentRowSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1),
  area: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  contact_name: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  contact_email: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  contact_phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  home_ground: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  note: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

const HelperRowSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  line_user_id: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  note: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

type ResourceType = "members" | "games" | "opponents" | "helpers";

const SCHEMAS: Record<ResourceType, z.ZodType> = {
  members: MemberRowSchema,
  games: GameRowSchema,
  opponents: OpponentRowSchema,
  helpers: HelperRowSchema,
};

const TABLE_NAMES: Record<ResourceType, string> = {
  members: "members",
  games: "games",
  opponents: "opponent_teams",
  helpers: "helpers",
};

const CONFLICT_COLUMNS: Record<ResourceType, string | null> = {
  members: null,
  games: null,
  opponents: null,
  helpers: null,
};

// ─── CSV parser ───

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ─── Supabase client ───

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
    process.exit(1);
  }
  return { url, key };
}

async function upsertRow(
  supabaseUrl: string,
  supabaseKey: string,
  table: string,
  row: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(row),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `${res.status}: ${body}` };
  }
  return { ok: true };
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: bun run scripts/import-csv.ts <members|games|opponents|helpers> <csv-file>",
    );
    process.exit(1);
  }

  const resourceType = args[0] as ResourceType;
  const csvPath = args[1];

  if (!SCHEMAS[resourceType]) {
    console.error(
      `Unknown resource type: ${resourceType}. Supported: members, games, opponents, helpers`,
    );
    process.exit(1);
  }

  const schema = SCHEMAS[resourceType];
  const table = TABLE_NAMES[resourceType];

  console.log(`Importing ${resourceType} from ${csvPath} -> ${table}`);

  const file = Bun.file(csvPath);
  if (!(await file.exists())) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const text = await file.text();
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows from CSV`);

  if (rows.length === 0) {
    console.log("No data to import.");
    return;
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      console.error(
        `Row ${i + 1}: Validation failed — ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
      failed++;
      continue;
    }

    const result = await upsertRow(
      supabaseUrl,
      supabaseKey,
      table,
      parsed.data as Record<string, unknown>,
    );

    if (result.ok) {
      imported++;
    } else {
      if (result.error?.includes("duplicate") || result.error?.includes("23505")) {
        skipped++;
      } else {
        console.error(`Row ${i + 1}: Insert failed — ${result.error}`);
        failed++;
      }
    }

    process.stdout.write(
      `\r  Progress: ${i + 1}/${rows.length} (imported: ${imported}, skipped: ${skipped}, failed: ${failed})`,
    );
  }

  console.log(
    `\nDone! imported: ${imported}, skipped: ${skipped}, failed: ${failed}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main();
