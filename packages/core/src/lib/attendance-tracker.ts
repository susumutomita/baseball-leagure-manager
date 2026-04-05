// ============================================================
// 出席率トラッカー — メンバーの出席傾向を分析するユーティリティ
// ============================================================
import type { Attendance, Member, Rsvp } from "../types/domain";

/** メンバーの出席統計 */
export interface MemberAttendanceStats {
  memberId: string;
  name: string;
  totalGames: number;
  attended: number;
  noShow: number;
  cancelled: number;
  attendanceRate: number;
  noShowRate: number;
  reliabilityScore: number;
}

/** RSVP 予測精度 (回答 vs 実際の出席) */
export interface RsvpAccuracy {
  memberId: string;
  totalRsvps: number;
  saidYesAndAttended: number;
  saidYesButNoShow: number;
  saidNoButAttended: number;
  accuracy: number;
}

/**
 * メンバーの出席統計を計算する
 */
export function calculateMemberAttendance(
  member: Pick<Member, "id" | "name">,
  attendances: Attendance[],
): MemberAttendanceStats {
  const myAttendances = attendances.filter(
    (a) => a.person_id === member.id && a.person_type === "MEMBER",
  );
  const totalGames = myAttendances.length;
  const attended = myAttendances.filter((a) => a.status === "ATTENDED").length;
  const noShow = myAttendances.filter((a) => a.status === "NO_SHOW").length;
  const cancelled = myAttendances.filter(
    (a) => a.status === "CANCELLED_SAME_DAY",
  ).length;

  const attendanceRate = totalGames > 0 ? attended / totalGames : 0;
  const noShowRate = totalGames > 0 ? noShow / totalGames : 0;

  // 信頼度スコア: 出席率 - (無断欠席率 * 2) - (当日キャンセル率 * 0.5)
  const cancelledRate = totalGames > 0 ? cancelled / totalGames : 0;
  const reliabilityScore = Math.max(
    0,
    Math.min(1, attendanceRate - noShowRate * 2 - cancelledRate * 0.5),
  );

  return {
    memberId: member.id,
    name: member.name,
    totalGames,
    attended,
    noShow,
    cancelled,
    attendanceRate: Math.round(attendanceRate * 1000) / 1000,
    noShowRate: Math.round(noShowRate * 1000) / 1000,
    reliabilityScore: Math.round(reliabilityScore * 1000) / 1000,
  };
}

/**
 * RSVP の予測精度を計算する
 * (RSVP で AVAILABLE と答えたのに実際は NO_SHOW, など)
 */
export function calculateRsvpAccuracy(
  memberId: string,
  rsvps: Rsvp[],
  attendances: Attendance[],
): RsvpAccuracy {
  const myRsvps = rsvps.filter((r) => r.member_id === memberId);
  const attendanceMap = new Map(
    attendances
      .filter((a) => a.person_id === memberId && a.person_type === "MEMBER")
      .map((a) => [a.game_id, a.status]),
  );

  let saidYesAndAttended = 0;
  let saidYesButNoShow = 0;
  let saidNoButAttended = 0;

  for (const rsvp of myRsvps) {
    const actual = attendanceMap.get(rsvp.game_id);
    if (!actual) continue;

    if (rsvp.response === "AVAILABLE") {
      if (actual === "ATTENDED") saidYesAndAttended++;
      else if (actual === "NO_SHOW") saidYesButNoShow++;
    } else if (rsvp.response === "UNAVAILABLE" && actual === "ATTENDED") {
      saidNoButAttended++;
    }
  }

  const totalWithOutcome =
    saidYesAndAttended + saidYesButNoShow + saidNoButAttended;
  const correct = saidYesAndAttended;
  const accuracy = totalWithOutcome > 0 ? correct / totalWithOutcome : 0;

  return {
    memberId,
    totalRsvps: myRsvps.length,
    saidYesAndAttended,
    saidYesButNoShow,
    saidNoButAttended,
    accuracy: Math.round(accuracy * 1000) / 1000,
  };
}

/**
 * チーム全体の出席ランキングを生成する
 */
export function rankByAttendance(
  stats: MemberAttendanceStats[],
): MemberAttendanceStats[] {
  return [...stats].sort((a, b) => {
    // 信頼度スコアで降順、同スコアなら出席率で降順
    if (b.reliabilityScore !== a.reliabilityScore) {
      return b.reliabilityScore - a.reliabilityScore;
    }
    return b.attendanceRate - a.attendanceRate;
  });
}
