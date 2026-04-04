// ============================================================
// チーム戦力分析 — ロスター健全性チェック・ポジション充足判定
// ============================================================
import type { Member } from "../types/domain";

/** ポジション充足状況 */
export interface PositionCoverage {
  position: string;
  count: number;
  members: string[];
}

/** チーム戦力分析結果 */
export interface TeamCapacityReport {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  averageAttendanceRate: number;
  averageNoShowRate: number;
  positionCoverage: PositionCoverage[];
  warnings: string[];
}

/** 野球の基本ポジション */
const BASEBALL_POSITIONS = [
  "投手",
  "捕手",
  "一塁手",
  "二塁手",
  "三塁手",
  "遊撃手",
  "左翼手",
  "中堅手",
  "右翼手",
];

/**
 * チームの戦力分析を行う
 */
export function analyzeTeamCapacity(
  members: Member[],
  minPlayers = 9,
): TeamCapacityReport {
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const inactiveMembers = members.filter((m) => m.status !== "ACTIVE");

  const averageAttendanceRate =
    activeMembers.length > 0
      ? activeMembers.reduce((sum, m) => sum + m.attendance_rate, 0) /
        activeMembers.length
      : 0;

  const averageNoShowRate =
    activeMembers.length > 0
      ? activeMembers.reduce((sum, m) => sum + m.no_show_rate, 0) /
        activeMembers.length
      : 0;

  const positionCoverage = analyzePositions(activeMembers);
  const warnings = generateWarnings(
    activeMembers,
    averageAttendanceRate,
    positionCoverage,
    minPlayers,
  );

  return {
    totalMembers: members.length,
    activeMembers: activeMembers.length,
    inactiveMembers: inactiveMembers.length,
    averageAttendanceRate: Math.round(averageAttendanceRate * 1000) / 1000,
    averageNoShowRate: Math.round(averageNoShowRate * 1000) / 1000,
    positionCoverage,
    warnings,
  };
}

/**
 * ポジション別のカバー状況を分析する
 */
export function analyzePositions(members: Member[]): PositionCoverage[] {
  const positionMap = new Map<string, string[]>();

  // 基本ポジションの枠を作成
  for (const pos of BASEBALL_POSITIONS) {
    positionMap.set(pos, []);
  }

  // メンバーのポジションを割り当て
  for (const member of members) {
    for (const pos of member.positions_json ?? []) {
      const existing = positionMap.get(pos) ?? [];
      existing.push(member.name);
      positionMap.set(pos, existing);
    }
  }

  return Array.from(positionMap.entries()).map(([position, memberNames]) => ({
    position,
    count: memberNames.length,
    members: memberNames,
  }));
}

/**
 * 予想出席人数を算出する (平均出席率ベース)
 */
export function estimateAttendance(
  activeMembers: number,
  averageAttendanceRate: number,
): number {
  return Math.round(activeMembers * averageAttendanceRate);
}

function generateWarnings(
  activeMembers: Member[],
  averageAttendanceRate: number,
  positionCoverage: PositionCoverage[],
  minPlayers: number,
): string[] {
  const warnings: string[] = [];
  const expectedAttendance = estimateAttendance(
    activeMembers.length,
    averageAttendanceRate,
  );

  if (activeMembers.length < minPlayers) {
    warnings.push(
      `アクティブメンバー数(${activeMembers.length}人)が最低人数(${minPlayers}人)を下回っています`,
    );
  }

  if (expectedAttendance < minPlayers && activeMembers.length >= minPlayers) {
    warnings.push(
      `平均出席率(${Math.round(averageAttendanceRate * 100)}%)では予想出席人数(${expectedAttendance}人)が最低人数を下回ります`,
    );
  }

  // 捕手不足チェック
  const catchers = positionCoverage.find((p) => p.position === "捕手");
  if (catchers && catchers.count === 0) {
    warnings.push("捕手がいません。キャッチャーの確保が必要です");
  }

  // 投手不足チェック
  const pitchers = positionCoverage.find((p) => p.position === "投手");
  if (pitchers && pitchers.count < 2) {
    warnings.push(
      `投手が${pitchers?.count ?? 0}人のみです。リリーフの確保を推奨します`,
    );
  }

  // 無断欠席率が高いメンバーの警告
  const unreliableMembers = activeMembers.filter((m) => m.no_show_rate > 0.2);
  if (unreliableMembers.length > 0) {
    warnings.push(
      `無断欠席率20%超のメンバーが${unreliableMembers.length}人います`,
    );
  }

  return warnings;
}
