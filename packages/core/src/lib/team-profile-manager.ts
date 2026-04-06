// ============================================================
// チーム公開プロフィール管理 — Issue #112
// ============================================================
import type { TeamProfile } from "../types/domain";

/**
 * デフォルトプロフィールを構築
 */
export function createDefaultProfile(
  teamId: string,
): Omit<TeamProfile, "id" | "created_at" | "updated_at"> {
  return {
    team_id: teamId,
    is_public: false,
    description: null,
    activity_area: null,
    skill_level: null,
    member_count: 0,
    founded_year: null,
    looking_for_opponents: false,
    looking_for_helpers: false,
    photo_url: null,
    stats_json: {},
  };
}

/**
 * プロフィールの完成度チェック
 */
export function isProfileComplete(profile: TeamProfile): {
  complete: boolean;
  missing_fields: string[];
} {
  const missing: string[] = [];
  if (!profile.description) missing.push("description");
  if (!profile.activity_area) missing.push("activity_area");
  if (!profile.skill_level) missing.push("skill_level");
  if (!profile.founded_year) missing.push("founded_year");
  return { complete: missing.length === 0, missing_fields: missing };
}
