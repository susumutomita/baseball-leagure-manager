// ============================================================
// スケジュール競合検出 — 同日の試合重複を検出する
// ============================================================
import type { Game } from "../types/domain";

/** 競合情報 */
export interface ScheduleConflict {
  game1: Pick<Game, "id" | "title" | "game_date" | "start_time" | "end_time">;
  game2: Pick<Game, "id" | "title" | "game_date" | "start_time" | "end_time">;
  type: "SAME_DAY" | "TIME_OVERLAP";
  description: string;
}

/**
 * 試合間のスケジュール競合を検出する
 * CANCELLED/SETTLED は除外する
 */
export function detectConflicts(games: Game[]): ScheduleConflict[] {
  const activeGames = games.filter(
    (g) =>
      g.status !== "CANCELLED" &&
      g.status !== "SETTLED" &&
      g.game_date !== null,
  );

  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < activeGames.length; i++) {
    for (let j = i + 1; j < activeGames.length; j++) {
      const g1 = activeGames[i]!;
      const g2 = activeGames[j]!;

      if (g1.game_date !== g2.game_date) continue;

      if (g1.start_time && g2.start_time && g1.end_time && g2.end_time) {
        if (
          isTimeOverlap(g1.start_time, g1.end_time, g2.start_time, g2.end_time)
        ) {
          conflicts.push({
            game1: pick(g1),
            game2: pick(g2),
            type: "TIME_OVERLAP",
            description: `${g1.title}と${g2.title}の時間帯が重複しています (${g1.game_date})`,
          });
          continue;
        }
      }

      // 時刻情報がない場合は同日として報告
      if (!g1.start_time || !g2.start_time) {
        conflicts.push({
          game1: pick(g1),
          game2: pick(g2),
          type: "SAME_DAY",
          description: `${g1.title}と${g2.title}が同日です (${g1.game_date})`,
        });
      }
    }
  }

  return conflicts;
}

function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  return start1 < end2 && start2 < end1;
}

function pick(
  game: Game,
): Pick<Game, "id" | "title" | "game_date" | "start_time" | "end_time"> {
  return {
    id: game.id,
    title: game.title,
    game_date: game.game_date,
    start_time: game.start_time,
    end_time: game.end_time,
  };
}

/**
 * メンバーのRSVP競合を検出する
 * 同日に複数の試合にAVAILABLEと回答しているケースを検出
 */
export function detectMemberConflicts(
  games: Game[],
  memberRsvps: Map<string, Array<{ game_id: string; response: string }>>,
): Array<{ memberId: string; conflictingGameIds: string[]; date: string }> {
  const dateGamesMap = new Map<string, Game[]>();
  for (const game of games) {
    if (!game.game_date || game.status === "CANCELLED") continue;
    const existing = dateGamesMap.get(game.game_date) ?? [];
    existing.push(game);
    dateGamesMap.set(game.game_date, existing);
  }

  const conflicts: Array<{
    memberId: string;
    conflictingGameIds: string[];
    date: string;
  }> = [];

  for (const [memberId, rsvps] of memberRsvps) {
    const availableGameIds = new Set(
      rsvps.filter((r) => r.response === "AVAILABLE").map((r) => r.game_id),
    );

    for (const [date, dateGames] of dateGamesMap) {
      const conflicting = dateGames
        .filter((g) => availableGameIds.has(g.id))
        .map((g) => g.id);

      if (conflicting.length > 1) {
        conflicts.push({ memberId, conflictingGameIds: conflicting, date });
      }
    }
  }

  return conflicts;
}
