// ============================================================
// 個人成績・チーム統計 集計ロジック
// ============================================================

/** 打席結果から打数除外 (犠打・四死球) */
const NON_AB_RESULTS = ["WALK", "HIT_BY_PITCH", "SAC_BUNT", "SAC_FLY"] as const;

interface AtBat {
  result: string;
  rbi: number;
  runs_scored: boolean;
  stolen_base: boolean;
}

export interface BattingStats {
  games: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  sacBunts: number;
  sacFlies: number;
  stolenBases: number;
  runsScored: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

/** 打撃成績を集計 */
export function calculateBattingStats(
  atBats: AtBat[],
  gamesPlayed: number,
): BattingStats {
  const pa = atBats.length;
  const singles = atBats.filter((ab) => ab.result === "SINGLE").length;
  const doubles = atBats.filter((ab) => ab.result === "DOUBLE").length;
  const triples = atBats.filter((ab) => ab.result === "TRIPLE").length;
  const homeRuns = atBats.filter((ab) => ab.result === "HOMERUN").length;
  const hits = singles + doubles + triples + homeRuns;

  const walks = atBats.filter((ab) => ab.result === "WALK").length;
  const hitByPitch = atBats.filter((ab) => ab.result === "HIT_BY_PITCH").length;
  const strikeouts = atBats.filter((ab) => ab.result === "STRIKEOUT").length;
  const sacBunts = atBats.filter((ab) => ab.result === "SAC_BUNT").length;
  const sacFlies = atBats.filter((ab) => ab.result === "SAC_FLY").length;

  const nonAb = atBats.filter((ab) =>
    (NON_AB_RESULTS as readonly string[]).includes(ab.result),
  ).length;
  const ab = pa - nonAb;

  const rbi = atBats.reduce((sum, a) => sum + a.rbi, 0);
  const stolenBases = atBats.filter((a) => a.stolen_base).length;
  const runsScored = atBats.filter((a) => a.runs_scored).length;

  const avg = ab > 0 ? hits / ab : 0;
  const obp = pa > 0 ? (hits + walks + hitByPitch) / pa : 0;
  const totalBases = singles + doubles * 2 + triples * 3 + homeRuns * 4;
  const slg = ab > 0 ? totalBases / ab : 0;
  const ops = obp + slg;

  return {
    games: gamesPlayed,
    plateAppearances: pa,
    atBats: ab,
    hits,
    singles,
    doubles,
    triples,
    homeRuns,
    rbi,
    walks,
    hitByPitch,
    strikeouts,
    sacBunts,
    sacFlies,
    stolenBases,
    runsScored,
    avg: round3(avg),
    obp: round3(obp),
    slg: round3(slg),
    ops: round3(ops),
  };
}

interface PitchingStat {
  innings_pitched: number;
  earned_runs: number;
  hits_allowed: number;
  walks: number;
  strikeouts: number;
  home_runs_allowed: number;
  is_winning_pitcher: boolean;
  is_losing_pitcher: boolean;
}

export interface PitchingStats {
  games: number;
  inningsPitched: number;
  earnedRuns: number;
  era: number;
  whip: number;
  strikeouts: number;
  walks: number;
  k9: number;
  bb9: number;
  wins: number;
  losses: number;
}

/** 投球成績を集計 */
export function calculatePitchingStats(stats: PitchingStat[]): PitchingStats {
  const games = stats.length;
  const ip = stats.reduce((sum, s) => sum + Number(s.innings_pitched), 0);
  const er = stats.reduce((sum, s) => sum + s.earned_runs, 0);
  const ha = stats.reduce((sum, s) => sum + s.hits_allowed, 0);
  const bb = stats.reduce((sum, s) => sum + s.walks, 0);
  const so = stats.reduce((sum, s) => sum + s.strikeouts, 0);
  const wins = stats.filter((s) => s.is_winning_pitcher).length;
  const losses = stats.filter((s) => s.is_losing_pitcher).length;

  return {
    games,
    inningsPitched: ip,
    earnedRuns: er,
    era: ip > 0 ? round2((er / ip) * 7) : 0,
    whip: ip > 0 ? round2((ha + bb) / ip) : 0,
    strikeouts: so,
    walks: bb,
    k9: ip > 0 ? round2((so / ip) * 9) : 0,
    bb9: ip > 0 ? round2((bb / ip) * 9) : 0,
    wins,
    losses,
  };
}

interface GameResultRow {
  result: string | null;
  our_score: number | null;
  opponent_score: number | null;
}

export interface TeamStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalRunsScored: number;
  totalRunsAllowed: number;
  runDifferential: number;
}

/** チーム統計を集計 */
export function calculateTeamStats(results: GameResultRow[]): TeamStats {
  const wins = results.filter((r) => r.result === "WIN").length;
  const losses = results.filter((r) => r.result === "LOSE").length;
  const draws = results.filter((r) => r.result === "DRAW").length;
  const totalRunsScored = results.reduce(
    (sum, r) => sum + (r.our_score ?? 0),
    0,
  );
  const totalRunsAllowed = results.reduce(
    (sum, r) => sum + (r.opponent_score ?? 0),
    0,
  );

  return {
    totalGames: results.length,
    wins,
    losses,
    draws,
    winRate: wins + losses > 0 ? round3(wins / (wins + losses)) : 0,
    totalRunsScored,
    totalRunsAllowed,
    runDifferential: totalRunsScored - totalRunsAllowed,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
