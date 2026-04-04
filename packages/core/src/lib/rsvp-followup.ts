// ============================================================
// RSVP フォローアップ — 未回答メンバーへのフォローアップ戦略
// ============================================================
import type { Game, Member, Rsvp } from "../types/domain";

/** フォローアップ対象メンバー */
export interface FollowUpTarget {
  member: Pick<
    Member,
    "id" | "name" | "line_user_id" | "email" | "attendance_rate"
  >;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  suggestedChannel: "LINE" | "EMAIL" | "BOTH";
}

/** フォローアップ計画 */
export interface FollowUpPlan {
  game: Pick<
    Game,
    "id" | "title" | "game_date" | "rsvp_deadline" | "min_players"
  >;
  targets: FollowUpTarget[];
  totalNoResponse: number;
  currentAvailable: number;
  shortage: number;
}

/**
 * フォローアップ対象のメンバーを特定し、優先度を付ける
 */
export function planFollowUp(
  game: Game,
  rsvps: Rsvp[],
  members: Pick<
    Member,
    "id" | "name" | "line_user_id" | "email" | "attendance_rate"
  >[],
  now: Date = new Date(),
): FollowUpPlan {
  const rsvpMap = new Map(rsvps.map((r) => [r.member_id, r]));
  const currentAvailable = rsvps.filter(
    (r) => r.response === "AVAILABLE",
  ).length;
  const shortage = Math.max(0, game.min_players - currentAvailable);

  const targets: FollowUpTarget[] = [];

  for (const member of members) {
    const rsvp = rsvpMap.get(member.id);
    if (!rsvp || rsvp.response !== "NO_RESPONSE") continue;

    const urgency = determineUrgency(game, member, shortage, now);
    const reason = generateReason(urgency, member, game, now);
    const suggestedChannel = determineBestChannel(member);

    targets.push({ member, urgency, reason, suggestedChannel });
  }

  // 優先度順にソート (HIGH > MEDIUM > LOW)、同優先度なら出席率高い順
  targets.sort((a, b) => {
    const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.member.attendance_rate - a.member.attendance_rate;
  });

  return {
    game: {
      id: game.id,
      title: game.title,
      game_date: game.game_date,
      rsvp_deadline: game.rsvp_deadline,
      min_players: game.min_players,
    },
    targets,
    totalNoResponse: targets.length,
    currentAvailable,
    shortage,
  };
}

function determineUrgency(
  game: Game,
  member: Pick<Member, "attendance_rate">,
  shortage: number,
  now: Date,
): "HIGH" | "MEDIUM" | "LOW" {
  // 人数不足 + 締切���近 → HIGH
  if (shortage > 0 && game.rsvp_deadline) {
    const hoursToDeadline =
      (new Date(game.rsvp_deadline).getTime() - now.getTime()) /
      (1000 * 60 * 60);
    if (hoursToDeadline < 24) return "HIGH";
  }

  // 人数不足 + 出席率高いメンバー → HIGH (来てくれる可能性が高い)
  if (shortage > 0 && member.attendance_rate > 0.7) return "HIGH";

  // 人数不足 → MEDIUM
  if (shortage > 0) return "MEDIUM";

  // 人数足りているが��答なし → LOW
  return "LOW";
}

function generateReason(
  urgency: "HIGH" | "MEDIUM" | "LOW",
  member: Pick<Member, "name" | "attendance_rate">,
  game: Game,
  now: Date,
): string {
  switch (urgency) {
    case "HIGH":
      if (game.rsvp_deadline) {
        const hoursLeft = Math.round(
          (new Date(game.rsvp_deadline).getTime() - now.getTime()) /
            (1000 * 60 * 60),
        );
        if (hoursLeft < 24) {
          return `締��まであと${hoursLeft}時間。人数不足のため回答を急いでほしい`;
        }
      }
      return `出席率${Math.round(member.attendance_rate * 100)}%の${member.name}さん。参加が期待できる`;
    case "MEDIUM":
      return "人数不足のため回答をお願いしたい";
    case "LOW":
      return "出欠の回答をお願いしたい";
  }
}

function determineBestChannel(
  member: Pick<Member, "line_user_id" | "email">,
): "LINE" | "EMAIL" | "BOTH" {
  if (member.line_user_id && member.email) return "BOTH";
  if (member.line_user_id) return "LINE";
  return "EMAIL";
}
