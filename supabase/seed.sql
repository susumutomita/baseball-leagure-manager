-- ============================================================
-- シードデータ — 横浜サンダース（ローカル開発・デモ用）
-- v2 スキーマ対応・ON CONFLICT DO NOTHING で冪等
-- ============================================================

-- ===== チーム =====
INSERT INTO teams (id, name, home_area, activity_day) VALUES
  ('11111111-1111-4111-8111-111111111111', '横浜サンダース', '神奈川県・横浜市', '日曜日')
ON CONFLICT DO NOTHING;

-- ===== メンバー (18人) =====
INSERT INTO members (id, team_id, name, tier, line_user_id, positions_json, jersey_number, attendance_rate, no_show_rate, status, joined_at) VALUES
  ('aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '田中太郎',   'PRO',  'Uf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c', '["P","SS"]',     1,  92.00, 2.00, 'ACTIVE', '2023-04-01'),
  ('aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '鈴木一郎',   'PRO',  'U2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7', '["C"]',          2,  90.00, 1.00, 'ACTIVE', '2023-04-01'),
  ('aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '佐藤次郎',   'PRO',  'U3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8', '["SS","2B"]',    6,  85.00, 3.00, 'ACTIVE', '2023-04-15'),
  ('aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '山田三郎',   'PRO',  'U4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9', '["1B"]',         3,  78.00, 5.00, 'ACTIVE', '2023-05-01'),
  ('aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '高橋四郎',   'PRO',  'U5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0', '["2B","3B"]',    4,  82.00, 2.00, 'ACTIVE', '2023-05-01'),
  ('aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '中村五郎',   'PRO',  'U6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1', '["3B"]',         5,  88.00, 1.00, 'ACTIVE', '2023-06-01'),
  ('aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '小林六郎',   'LITE', 'U7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', '["LF"]',         7,  65.00, 8.00, 'ACTIVE', '2023-06-15'),
  ('aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '加藤七郎',   'PRO',  'U8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', '["CF"]',         8,  80.00, 3.00, 'ACTIVE', '2023-07-01'),
  ('aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '吉田八郎',   'PRO',  'U9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', '["RF"]',         9,  75.00, 4.00, 'ACTIVE', '2023-07-01'),
  ('aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '渡辺九郎',   'PRO',  'Ua0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', '["P","RF"]',    10,  70.00, 5.00, 'ACTIVE', '2023-08-01'),
  ('aaaaaaaa-0011-4011-8011-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '伊藤十郎',   'PRO',  'Ub1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', '["2B","SS"]',   11,  72.00, 6.00, 'ACTIVE', '2023-09-01'),
  ('aaaaaaaa-0012-4012-8012-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '木村十一',   'LITE', 'Uc2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', '["LF","CF"]',   12,  60.00, 10.00,'ACTIVE', '2023-09-15'),
  ('aaaaaaaa-0013-4013-8013-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '林十二',     'PRO',  'Ud3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', '["C","1B"]',    13,  68.00, 7.00, 'ACTIVE', '2023-10-01'),
  ('aaaaaaaa-0014-4014-8014-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '清水十三',   'PRO',  'Ue4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9', '["P"]',         14,  76.00, 3.00, 'ACTIVE', '2024-01-01'),
  ('aaaaaaaa-0015-4015-8015-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '松本十四',   'LITE', 'Uf5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0', '["RF","LF"]',   15,  55.00, 12.00,'ACTIVE', '2024-02-01'),
  ('aaaaaaaa-0016-4016-8016-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '井上十五',   'PRO',  'U06c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1', '["3B","1B"]',   16,  83.00, 2.00, 'ACTIVE', '2024-03-01'),
  ('aaaaaaaa-0017-4017-8017-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '斉藤十六',   'PRO',  'U17d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2', '["CF","RF"]',   17,  79.00, 4.00, 'ACTIVE', '2024-04-01'),
  ('aaaaaaaa-0018-4018-8018-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '藤井十七',   'LITE', NULL,                                  '["LF"]',        18,  50.00, 15.00,'INACTIVE','2024-06-01')
ON CONFLICT DO NOTHING;

-- ===== 助っ人 (3人) =====
INSERT INTO helpers (id, team_id, name, line_user_id, note, times_helped, reliability_score) VALUES
  ('ff000000-0001-4001-8001-ff0000000001', '11111111-1111-4111-8111-111111111111', '外山助太',   'Uh1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c', '佐藤さんの大学同期', 5, 0.95),
  ('ff000000-0002-4002-8002-ff0000000002', '11111111-1111-4111-8111-111111111111', '岡田助二',   'Uh2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', '会社の野球部',       3, 0.80),
  ('ff000000-0003-4003-8003-ff0000000003', '11111111-1111-4111-8111-111111111111', '長谷川助三', NULL,                                  '田中さんの後輩',     1, 1.00)
ON CONFLICT DO NOTHING;

-- ===== 対戦相手 (5チーム) =====
INSERT INTO opponent_teams (id, team_id, name, area, contact_name, contact_line, home_ground, times_played) VALUES
  ('cccccccc-0001-4001-8001-cccccccccccc', '11111111-1111-4111-8111-111111111111', '横須賀マリンズ', '神奈川県横須賀市', '山本監督',     'yamamoto_line', '不入斗公園野球場', 4),
  ('cccccccc-0002-4002-8002-cccccccccccc', '11111111-1111-4111-8111-111111111111', '藤沢ウェーブス', '神奈川県藤沢市',   '伊藤代表',     'ito_line',      '八部球場',         3),
  ('cccccccc-0003-4003-8003-cccccccccccc', '11111111-1111-4111-8111-111111111111', '平塚スターズ',   '神奈川県平塚市',   '木村キャプテン', 'kimura_line',  'バッティングパレス相石', 2),
  ('cccccccc-0004-4004-8004-cccccccccccc', '11111111-1111-4111-8111-111111111111', '鎌倉ナイツ',     '神奈川県鎌倉市',   '小川主将',     'ogawa_line',    '笛田公園野球場',   1),
  ('cccccccc-0005-4005-8005-cccccccccccc', '11111111-1111-4111-8111-111111111111', '綾瀬ファルコンズ','神奈川県綾瀬市',  '中田監督',     'nakata_line',   '綾瀬スポーツ公園', 0)
ON CONFLICT DO NOTHING;

-- ===== グラウンド (5箇所) =====
INSERT INTO grounds (id, team_id, name, municipality, cost_per_slot, is_hardball_ok, has_night_lights, watch_active) VALUES
  ('eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '新横浜公園野球場',   '横浜市',   6000, false, true,  true),
  ('eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '俣野公園野球場',     '横浜市',   4000, false, false, true),
  ('eeeeeeee-0003-4003-8003-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '大和スタジアム',     '大和市',   5000, true,  true,  false),
  ('eeeeeeee-0004-4004-8004-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '大庭球場',           '藤沢市',   3000, false, false, true),
  ('eeeeeeee-0005-4005-8005-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '引地台公園野球場',   '大和市',   3500, false, false, true)
ON CONFLICT DO NOTHING;

-- ===== 試合 (15試合) =====
INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players, available_count, unavailable_count) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '3月第1週 vs マリンズ',   'FRIENDLY', 'COMPLETED', '2026-03-01', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '新横浜公園野球場', 'cccccccc-0001-4001-8001-cccccccccccc', 9, 11, 4),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '3月第3週 vs ウェーブス', 'FRIENDLY', 'COMPLETED', '2026-03-15', '13:00', '16:00', 'eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '俣野公園野球場',   'cccccccc-0002-4002-8002-cccccccccccc', 9, 10, 5),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '3月第5週 練習試合',     'PRACTICE', 'COMPLETED', '2026-03-29', '09:00', '12:00', 'eeeeeeee-0004-4004-8004-eeeeeeeeeeee', '大庭球場',         NULL,                                   9, 12, 3)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players, available_count) VALUES
  ('bbbbbbbb-0004-4004-8004-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '2月 vs スターズ',       'FRIENDLY', 'SETTLED',   '2026-02-22', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '新横浜公園野球場', 'cccccccc-0003-4003-8003-cccccccccccc', 9, 10)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players, rsvp_deadline, available_count) VALUES
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '4月第2週 vs ナイツ',    'FRIENDLY', 'CONFIRMED', '2026-04-12', '09:00', '12:00', 'eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '俣野公園野球場',   'cccccccc-0004-4004-8004-cccccccccccc', 9, '2026-04-09 23:59:00+09', 11),
  ('bbbbbbbb-0006-4006-8006-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '4月第4週 vs マリンズ',  'FRIENDLY', 'CONFIRMED', '2026-04-26', '13:00', '16:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '新横浜公園野球場', 'cccccccc-0001-4001-8001-cccccccccccc', 9, '2026-04-23 23:59:00+09', 10)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, min_players, rsvp_deadline, available_count, no_response_count) VALUES
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第1週 練習試合',     'FRIENDLY', 'COLLECTING', '2026-05-03', '09:00', '12:00', 'eeeeeeee-0004-4004-8004-eeeeeeeeeeee', '大庭球場',        9, '2026-04-30 23:59:00+09', 5, 8),
  ('bbbbbbbb-0008-4008-8008-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第2週 対戦希望',     'FRIENDLY', 'COLLECTING', '2026-05-10', '13:00', '16:00', NULL,                                   NULL,              9, '2026-05-07 23:59:00+09', 3, 12),
  ('bbbbbbbb-0009-4009-8009-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第3週 リーグ戦',     'LEAGUE',   'COLLECTING', '2026-05-17', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '新横浜公園野球場', 9, '2026-05-14 23:59:00+09', 7, 6)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, min_players, available_count) VALUES
  ('bbbbbbbb-0010-4010-8010-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第4週 対戦調整中', 'FRIENDLY', 'ARRANGING', '2026-05-24', '09:00', 9, 9),
  ('bbbbbbbb-0011-4011-8011-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '6月第1週 対戦調整中', 'FRIENDLY', 'ARRANGING', '2026-06-07', '13:00', 9, 10)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, min_players) VALUES
  ('bbbbbbbb-0012-4012-8012-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '6月第2週 計画中', 'FRIENDLY', 'DRAFT', '2026-06-14', 9),
  ('bbbbbbbb-0013-4013-8013-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '6月第3週 計画中', 'PRACTICE', 'DRAFT', '2026-06-21', 9)
ON CONFLICT DO NOTHING;

INSERT INTO games (id, team_id, title, game_type, status, game_date, note) VALUES
  ('bbbbbbbb-0014-4014-8014-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '2月第2週 雨天中止', 'FRIENDLY', 'CANCELLED', '2026-02-08', '雨天のため中止'),
  ('bbbbbbbb-0015-4015-8015-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '1月 人数不足中止',  'FRIENDLY', 'CANCELLED', '2026-01-25', '参加者7名で成立せず')
ON CONFLICT DO NOTHING;

-- ===== 出欠 =====
INSERT INTO rsvps (game_id, member_id, response, responded_at, response_channel) VALUES
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'AVAILABLE',   '2026-04-20 10:00:00+09', 'LINE'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 'AVAILABLE',   '2026-04-20 12:00:00+09', 'LINE'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 'AVAILABLE',   '2026-04-21 08:00:00+09', 'APP'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 'UNAVAILABLE', '2026-04-20 18:00:00+09', 'LINE'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 'AVAILABLE',   '2026-04-21 09:00:00+09', 'LINE'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', 'MAYBE',       '2026-04-21 20:00:00+09', 'LINE'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', 'AVAILABLE',   '2026-04-22 07:00:00+09', 'APP'),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', 'NO_RESPONSE', NULL, NULL),
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', 'aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', 'NO_RESPONSE', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ===== 試合結果 =====
INSERT INTO game_results (id, game_id, our_score, opponent_score, result, innings) VALUES
  ('gggggggg-0001-4001-8001-gggggggggggg', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 5, 3, 'WIN',  7),
  ('gggggggg-0002-4002-8002-gggggggggggg', 'bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 2, 6, 'LOSE', 7),
  ('gggggggg-0003-4003-8003-gggggggggggg', 'bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 4, 4, 'DRAW', 7)
ON CONFLICT DO NOTHING;

-- ===== 打席結果 =====
INSERT INTO at_bats (game_id, member_id, inning, batting_order, result, rbi, runs_scored) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 1, 1, 'SINGLE',    0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 3, 1, 'DOUBLE',    2, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 5, 1, 'FLY_OUT',   0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 1, 2, 'WALK',      0, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 3, 2, 'SINGLE',    1, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 1, 3, 'GROUND_OUT',0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 4, 3, 'HOMERUN',   2, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 2, 4, 'STRIKEOUT', 0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 5, 4, 'SINGLE',    0, true),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 1, 1, 'FLY_OUT',   0, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 4, 1, 'SINGLE',    1, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 2, 2, 'DOUBLE',    1, true),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 5, 2, 'STRIKEOUT', 0, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 1, 3, 'GROUND_OUT',0, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 3, 3, 'WALK',      0, false),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 1, 1, 'TRIPLE',    1, true),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 4, 1, 'GROUND_OUT',0, false),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 2, 2, 'SINGLE',    1, false),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 5, 2, 'SAC_FLY',   1, false),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 3, 5, 'SINGLE',    1, true)
ON CONFLICT DO NOTHING;

-- ===== 投球成績 =====
INSERT INTO pitching_stats (game_id, member_id, role, innings_pitched, hits_allowed, runs_allowed, earned_runs, strikeouts, walks, is_winning_pitcher, is_losing_pitcher) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'STARTER',  5.0, 4, 2, 2, 6, 2, true,  false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', 'RELIEVER', 2.0, 2, 1, 1, 3, 1, false, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0014-4014-8014-aaaaaaaaaaaa', 'STARTER',  4.0, 8, 5, 4, 3, 3, false, true),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'RELIEVER', 3.0, 3, 1, 1, 4, 0, false, false),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', 'STARTER',  7.0, 6, 4, 3, 5, 2, false, false)
ON CONFLICT DO NOTHING;

-- ===== 費用 =====
INSERT INTO expenses (game_id, category, amount, paid_by, split_with_opponent, note) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'GROUND', 6000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  '新横浜公園 午前枠'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'BALL',   2000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', false, '公認球 2ダース'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'DRINK',  3000, 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', false, 'スポドリ・お茶'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'GROUND', 4000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  '俣野公園 午後枠'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'UMPIRE', 3000, 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', true,  '審判1名'),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'GROUND', 3000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', false, '大庭球場 午前枠'),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'BALL',   1500, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', false, '練習球')
ON CONFLICT DO NOTHING;

-- ===== 交渉 =====
INSERT INTO negotiations (id, game_id, opponent_team_id, status, proposed_dates_json, message_sent, reply_received, sent_at, replied_at) VALUES
  ('dddddddd-0001-4001-8001-dddddddddddd', 'bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'cccccccc-0004-4004-8004-cccccccccccc', 'ACCEPTED', '["2026-04-12"]',              '4月12日に練習試合いかがでしょうか？', '了解です！午前で。',  '2026-03-25 10:00:00+09', '2026-03-26 18:00:00+09'),
  ('dddddddd-0002-4002-8002-dddddddddddd', 'bbbbbbbb-0010-4010-8010-bbbbbbbbbbbb', 'cccccccc-0002-4002-8002-cccccccccccc', 'SENT',     '["2026-05-24","2026-05-31"]', '5月後半に試合お願いできますか？',     NULL,                  '2026-04-01 09:00:00+09', NULL),
  ('dddddddd-0003-4003-8003-dddddddddddd', 'bbbbbbbb-0011-4011-8011-bbbbbbbbbbbb', 'cccccccc-0005-4005-8005-cccccccccccc', 'DRAFT',    '["2026-06-07"]',              NULL,                                  NULL,                  NULL, NULL)
ON CONFLICT DO NOTHING;

-- ===== グラウンド空き =====
INSERT INTO ground_slots (ground_id, date, time_slot, status) VALUES
  ('eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '2026-04-19', 'MORNING',   'AVAILABLE'),
  ('eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '2026-04-19', 'AFTERNOON', 'RESERVED'),
  ('eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '2026-04-26', 'AFTERNOON', 'RESERVED'),
  ('eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '2026-04-19', 'MORNING',   'AVAILABLE'),
  ('eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '2026-04-26', 'MORNING',   'AVAILABLE'),
  ('eeeeeeee-0004-4004-8004-eeeeeeeeeeee', '2026-05-03', 'MORNING',   'RESERVED'),
  ('eeeeeeee-0005-4005-8005-eeeeeeeeeeee', '2026-05-03', 'MORNING',   'AVAILABLE'),
  ('eeeeeeee-0005-4005-8005-eeeeeeeeeeee', '2026-05-10', 'AFTERNOON', 'AVAILABLE')
ON CONFLICT DO NOTHING;
