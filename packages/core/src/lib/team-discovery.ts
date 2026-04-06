// ============================================================
// チーム発見・レコメンド — Issue #112
// ============================================================
import type { SkillLevel, TeamProfile } from "../types/domain";
import { SKILL_LEVELS } from "../types/domain";

export type TeamSearchFilters = {
  area?: string;
  skill_level?: SkillLevel;
  looking_for_opponents?: boolean;
  looking_for_helpers?: boolean;
};

export type ScoredTeamProfile = TeamProfile & { score: number };

function skillDistance(a: SkillLevel, b: SkillLevel): number {
  return Math.abs(SKILL_LEVELS.indexOf(a) - SKILL_LEVELS.indexOf(b));
}

/**
 * 公開プロフィールをフィルタ検索
 */
export function searchPublicTeams(
  profiles: TeamProfile[],
  filters: TeamSearchFilters,
): TeamProfile[] {
  return profiles.filter((p) => {
    if (!p.is_public) return false;
    if (filters.area && p.activity_area !== filters.area) return false;
    if (filters.skill_level && p.skill_level !== filters.skill_level)
      return false;
    if (
      filters.looking_for_opponents !== undefined &&
      p.looking_for_opponents !== filters.looking_for_opponents
    )
      return false;
    if (
      filters.looking_for_helpers !== undefined &&
      p.looking_for_helpers !== filters.looking_for_helpers
    )
      return false;
    return true;
  });
}

/**
 * 自チームに似たチームをレコメンド
 */
export function recommendTeams(
  myProfile: TeamProfile,
  allProfiles: TeamProfile[],
): ScoredTeamProfile[] {
  return allProfiles
    .filter((p) => p.is_public && p.team_id !== myProfile.team_id)
    .map((p) => {
      let score = 0;
      // エリア一致
      if (
        myProfile.activity_area &&
        p.activity_area === myProfile.activity_area
      )
        score += 30;
      // スキルレベル近接度
      if (myProfile.skill_level && p.skill_level) {
        const dist = skillDistance(myProfile.skill_level, p.skill_level);
        score += Math.max(0, 20 - dist * 7);
      }
      // 対戦相手募集中
      if (p.looking_for_opponents) score += 15;
      // アクティブなチーム
      if (p.member_count >= 9) score += 10;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}
