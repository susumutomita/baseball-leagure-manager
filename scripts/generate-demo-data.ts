#!/usr/bin/env bun
/**
 * デモデータ自動生成スクリプト
 *
 * 使い方:
 *   bun run scripts/generate-demo-data.ts > supabase/seed-demo.sql
 *
 * 生成データ:
 *   - 3チーム x 15-20メンバー
 *   - 年間30-40試合/チーム
 *   - 出欠、成績、経費、精算の実績データ
 */

const TEAM_NAMES = [
  { name: "サンダーボルツ", area: "東京都・世田谷区", day: "日曜日" },
  { name: "ブレイブスターズ", area: "神奈川県・横浜市", day: "土曜日" },
  { name: "フェニックス", area: "東京都・杉並区", day: "日曜日" },
];

const POSITIONS = [
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

const LAST_NAMES = [
  "田中",
  "鈴木",
  "佐藤",
  "山田",
  "高橋",
  "中村",
  "小林",
  "加藤",
  "吉田",
  "渡辺",
  "伊藤",
  "松本",
  "井上",
  "木村",
  "林",
  "斎藤",
  "前田",
  "藤田",
  "岡田",
  "原",
];

const FIRST_NAMES = [
  "太郎",
  "一郎",
  "次郎",
  "三郎",
  "四郎",
  "五郎",
  "六郎",
  "七郎",
  "八郎",
  "九郎",
  "十郎",
  "隆",
  "翔",
  "大輔",
  "健",
  "誠",
  "修",
  "亮",
  "浩",
  "剛",
];

function uuid(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(4, "0");
  return `${prefix}${hex}-${hex}-4${hex.slice(1)}-8${hex.slice(1)}-${prefix}${hex}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// --- 生成 ---

const lines: string[] = [];
lines.push("-- ============================================================");
lines.push("-- デモデータ (自動生成)");
lines.push(`-- 生成日時: ${new Date().toISOString()}`);
lines.push("-- ============================================================");
lines.push("");

// チーム
lines.push("-- チーム");
for (let t = 0; t < TEAM_NAMES.length; t++) {
  const team = TEAM_NAMES[t]!;
  const teamId = uuid("aaaa0000", t + 1);
  lines.push(
    `INSERT INTO teams (id, name, home_area, activity_day) VALUES ('${teamId}', '${escapeSQL(team.name)}', '${escapeSQL(team.area)}', '${escapeSQL(team.day)}');`,
  );
}
lines.push("");

// メンバー
lines.push("-- メンバー");
const allMembers: Array<{ id: string; teamId: string; name: string }> = [];
for (let t = 0; t < TEAM_NAMES.length; t++) {
  const teamId = uuid("aaaa0000", t + 1);
  const memberCount = randomInt(15, 20);

  for (let m = 0; m < memberCount; m++) {
    const memberId = uuid(`bbbb${String(t).padStart(4, "0")}`, m + 1);
    const name = `${LAST_NAMES[(t * 7 + m) % LAST_NAMES.length]}${FIRST_NAMES[m % FIRST_NAMES.length]}`;
    const tier = m < 10 ? "PRO" : "LITE";
    const role = m === 0 ? "SUPER_ADMIN" : m === 1 ? "ADMIN" : "MEMBER";
    const pos = POSITIONS[m % POSITIONS.length]!;
    const attendance = randomInt(50, 95);
    const noShow = randomInt(0, 15);
    const status = m < memberCount - 2 ? "ACTIVE" : "INACTIVE";

    allMembers.push({ id: memberId, teamId, name });
    lines.push(
      `INSERT INTO members (id, team_id, name, tier, role, positions_json, jersey_number, attendance_rate, no_show_rate, status) VALUES ('${memberId}', '${teamId}', '${escapeSQL(name)}', '${tier}', '${role}', '["${escapeSQL(pos)}"]', ${m + 1}, ${attendance}, ${noShow}, '${status}');`,
    );
  }
}
lines.push("");

// 対戦相手
lines.push("-- 対戦相手チーム");
const opponentNames = [
  "レッドソックス",
  "ブルージェイズ",
  "イーグルス",
  "ファルコンズ",
  "タイガース",
  "ドラゴンズ",
];
for (let t = 0; t < TEAM_NAMES.length; t++) {
  const teamId = uuid("aaaa0000", t + 1);
  for (let o = 0; o < 2; o++) {
    const oppId = uuid(`cccc${String(t).padStart(4, "0")}`, o + 1);
    const oppName = opponentNames[(t * 2 + o) % opponentNames.length]!;
    lines.push(
      `INSERT INTO opponent_teams (id, team_id, name, area, times_played) VALUES ('${oppId}', '${teamId}', '${escapeSQL(oppName)}', '東京都', ${randomInt(0, 8)});`,
    );
  }
}
lines.push("");

// グラウンド
lines.push("-- グラウンド");
for (let t = 0; t < TEAM_NAMES.length; t++) {
  const teamId = uuid("aaaa0000", t + 1);
  const groundId = uuid(`eeee${String(t).padStart(4, "0")}`, 1);
  lines.push(
    `INSERT INTO grounds (id, team_id, name, municipality, cost_per_slot) VALUES ('${groundId}', '${teamId}', '${escapeSQL(TEAM_NAMES[t]!.area)}球場', '${escapeSQL(TEAM_NAMES[t]!.area)}', ${randomInt(3000, 6000)});`,
  );
}
lines.push("");

// 試合 (各チーム30-40試合)
lines.push("-- 試合");
const STATUSES = ["SETTLED", "COMPLETED", "CONFIRMED", "COLLECTING", "DRAFT"];
let gameIdx = 0;
for (let t = 0; t < TEAM_NAMES.length; t++) {
  const teamId = uuid("aaaa0000", t + 1);
  const groundId = uuid(`eeee${String(t).padStart(4, "0")}`, 1);
  const oppId = uuid(`cccc${String(t).padStart(4, "0")}`, 1);
  const gameCount = randomInt(30, 40);

  for (let g = 0; g < gameCount; g++) {
    gameIdx++;
    const gameId = uuid("dddd0000", gameIdx);
    const month = Math.floor(g / 4) + 1;
    const day = ((g % 4) * 7 + randomInt(1, 7));
    const clampedMonth = Math.min(month, 12);
    const clampedDay = Math.min(day, 28);
    const date = generateDate(2026, clampedMonth, clampedDay);

    // 過去の試合は完了/精算済み、未来はCOLLECTING/DRAFT
    let status: string;
    if (g < gameCount - 5) {
      status = g % 3 === 0 ? "SETTLED" : "COMPLETED";
    } else if (g < gameCount - 2) {
      status = "CONFIRMED";
    } else if (g < gameCount - 1) {
      status = "COLLECTING";
    } else {
      status = "DRAFT";
    }

    const gameType = g % 5 === 0 ? "PRACTICE" : "FRIENDLY";
    lines.push(
      `INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players) VALUES ('${gameId}', '${teamId}', '第${g + 1}節', '${gameType}', '${status}', '${date}', '09:00', '12:00', '${groundId}', '球場', ${gameType === "PRACTICE" ? "NULL" : `'${oppId}'`}, 9);`,
    );

    // 完了/精算済みの試合に結果を追加
    if (status === "SETTLED" || status === "COMPLETED") {
      const ourScore = randomInt(0, 12);
      const oppScore = randomInt(0, 12);
      const result =
        ourScore > oppScore
          ? "WIN"
          : ourScore < oppScore
            ? "LOSE"
            : "DRAW";
      const resultId = uuid("rrrr0000", gameIdx);
      lines.push(
        `INSERT INTO game_results (id, game_id, our_score, opponent_score, result, innings) VALUES ('${resultId}', '${gameId}', ${ourScore}, ${oppScore}, '${result}', 7);`,
      );
    }
  }
}
lines.push("");

console.log(lines.join("\n"));
console.error(
  `Generated: ${TEAM_NAMES.length} teams, ${allMembers.length} members, ${gameIdx} games`,
);
