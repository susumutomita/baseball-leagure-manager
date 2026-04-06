// ============================================================
// リーグ日程生成 — Issue #111
// ラウンドロビン / ダブルラウンドロビン
// ============================================================

export type ScheduledMatch = {
  home_team_id: string;
  away_team_id: string;
  round: number;
  match_number: number;
};

/**
 * ラウンドロビン (総当たり) スケジュール生成
 * circle method アルゴリズムを使用
 */
export function generateRoundRobinSchedule(
  teamIds: string[],
): ScheduledMatch[] {
  if (teamIds.length < 2) return [];

  // 奇数の場合 BYE チームを追加
  const teams = [...teamIds];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push("__BYE__");

  const n = teams.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: ScheduledMatch[] = [];
  let matchNumber = 1;

  // teams[0] は固定、残りをローテーション
  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let round = 1; round <= rounds; round++) {
    const roundTeams = [fixed, ...rotating];

    for (let i = 0; i < matchesPerRound; i++) {
      const home = roundTeams[i];
      const away = roundTeams[n - 1 - i];

      // BYE チームとの試合はスキップ
      if (home === "__BYE__" || away === "__BYE__") continue;

      matches.push({
        home_team_id: home,
        away_team_id: away,
        round,
        match_number: matchNumber++,
      });
    }

    // ローテーション: 末尾を先頭に移動
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}

/**
 * ダブルラウンドロビン (ホーム&アウェイ総当たり)
 */
export function generateDoubleRoundRobinSchedule(
  teamIds: string[],
): ScheduledMatch[] {
  const firstHalf = generateRoundRobinSchedule(teamIds);
  const secondHalfStart = firstHalf.length;

  // 後半はホーム・アウェイを入れ替え
  const firstHalfRounds =
    firstHalf.length > 0 ? Math.max(...firstHalf.map((m) => m.round)) : 0;

  const secondHalf = firstHalf.map((m, i) => ({
    home_team_id: m.away_team_id,
    away_team_id: m.home_team_id,
    round: m.round + firstHalfRounds,
    match_number: secondHalfStart + i + 1,
  }));

  return [...firstHalf, ...secondHalf];
}
