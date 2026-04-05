-- ============================================================
-- シードデータ（ローカル開発用） - v2 スキーマ対応
-- UUID は RFC 4122 v4 準拠 (バージョン=4, バリアント=8-b)
-- ============================================================

-- ===== チーム =====
INSERT INTO teams (id, name, home_area, activity_day) VALUES
  ('11111111-1111-4111-8111-111111111111', 'サンダーボルツ', '東京都・世田谷区', '日曜日'),
  ('22222222-2222-4222-8222-222222222222', 'ブレイブスターズ', '神奈川県・横浜市', '土曜日');

-- ===== メンバー (チーム1: サンダーボルツ 15名) =====
INSERT INTO members (id, team_id, name, tier, role, positions_json, jersey_number, attendance_rate, no_show_rate, status) VALUES
  ('aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '田中太郎',   'PRO',  'SUPER_ADMIN', '["投手","外野手"]',       1,  85.00, 3.00, 'ACTIVE'),
  ('aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '鈴木一郎',   'PRO',  'ADMIN',       '["捕手"]',               2,  90.00, 1.00, 'ACTIVE'),
  ('aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '佐藤次郎',   'LITE', 'MEMBER',      '["遊撃手","二塁手"]',     6,  75.00, 5.00, 'ACTIVE'),
  ('aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '山田三郎',   'PRO',  'MEMBER',      '["左翼手"]',              7,  60.00, 10.00, 'ACTIVE'),
  ('aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '高橋四郎',   'PRO',  'MEMBER',      '["一塁手"]',              3,  80.00, 2.00, 'ACTIVE'),
  ('aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '中村五郎',   'PRO',  'MEMBER',      '["二塁手","遊撃手"]',     4,  88.00, 1.00, 'ACTIVE'),
  ('aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '小林六郎',   'LITE', 'MEMBER',      '["三塁手"]',              5,  70.00, 8.00, 'ACTIVE'),
  ('aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '加藤七郎',   'PRO',  'MEMBER',      '["中堅手"]',              8,  82.00, 2.00, 'ACTIVE'),
  ('aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '吉田八郎',   'PRO',  'MEMBER',      '["右翼手"]',              9,  65.00, 12.00, 'ACTIVE'),
  ('aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '渡辺九郎',   'PRO',  'MEMBER',      '["投手","一塁手"]',      10,  78.00, 3.00, 'ACTIVE'),
  ('aaaaaaaa-0011-4011-8011-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '伊藤十郎',   'LITE', 'MEMBER',      '["外野手"]',             11,  55.00, 15.00, 'ACTIVE'),
  ('aaaaaaaa-0012-4012-8012-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '松本十一',   'PRO',  'MEMBER',      '["捕手","一塁手"]',      12,  72.00, 4.00, 'ACTIVE'),
  ('aaaaaaaa-0013-4013-8013-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '井上十二',   'LITE', 'MEMBER',      '["外野手"]',             13,  50.00, 5.00, 'INACTIVE'),
  ('aaaaaaaa-0014-4014-8014-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '木村十三',   'PRO',  'MEMBER',      '["内野手"]',             14,  45.00, 20.00, 'INACTIVE'),
  ('aaaaaaaa-0015-4015-8015-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '林十四',     'LITE', 'MEMBER',      '["外野手"]',             15,  0.00, 0.00, 'PENDING');

-- ===== メンバー (チーム2: ブレイブスターズ 10名) =====
INSERT INTO members (id, team_id, name, tier, role, positions_json, jersey_number, attendance_rate, no_show_rate, status) VALUES
  ('bbbb0001-0001-4001-8001-bbbb00000001', '22222222-2222-4222-8222-222222222222', '石井一',   'PRO',  'SUPER_ADMIN', '["投手"]',        1,  92.00, 0.00, 'ACTIVE'),
  ('bbbb0001-0002-4002-8002-bbbb00000002', '22222222-2222-4222-8222-222222222222', '斎藤二',   'PRO',  'ADMIN',       '["捕手"]',        2,  88.00, 2.00, 'ACTIVE'),
  ('bbbb0001-0003-4003-8003-bbbb00000003', '22222222-2222-4222-8222-222222222222', '前田三',   'PRO',  'MEMBER',      '["一塁手"]',      3,  85.00, 1.00, 'ACTIVE'),
  ('bbbb0001-0004-4004-8004-bbbb00000004', '22222222-2222-4222-8222-222222222222', '藤田四',   'PRO',  'MEMBER',      '["二塁手"]',      4,  80.00, 3.00, 'ACTIVE'),
  ('bbbb0001-0005-4005-8005-bbbb00000005', '22222222-2222-4222-8222-222222222222', '岡田五',   'LITE', 'MEMBER',      '["三塁手"]',      5,  75.00, 5.00, 'ACTIVE'),
  ('bbbb0001-0006-4006-8006-bbbb00000006', '22222222-2222-4222-8222-222222222222', '原六',     'PRO',  'MEMBER',      '["遊撃手"]',      6,  70.00, 8.00, 'ACTIVE'),
  ('bbbb0001-0007-4007-8007-bbbb00000007', '22222222-2222-4222-8222-222222222222', '三浦七',   'PRO',  'MEMBER',      '["左翼手"]',      7,  65.00, 10.00, 'ACTIVE'),
  ('bbbb0001-0008-4008-8008-bbbb00000008', '22222222-2222-4222-8222-222222222222', '上田八',   'LITE', 'MEMBER',      '["中堅手"]',      8,  60.00, 5.00, 'ACTIVE'),
  ('bbbb0001-0009-4009-8009-bbbb00000009', '22222222-2222-4222-8222-222222222222', '村田九',   'PRO',  'MEMBER',      '["右翼手"]',      9,  82.00, 2.00, 'ACTIVE'),
  ('bbbb0001-0010-4010-8010-bbbb00000010', '22222222-2222-4222-8222-222222222222', '森田十',   'PRO',  'MEMBER',      '["投手","外野手"]', 10, 77.00, 4.00, 'ACTIVE');

-- ===== 助っ人 =====
INSERT INTO helpers (id, team_id, name, note, times_helped, reliability_score) VALUES
  ('ff000000-0001-4001-8001-ff0000000001', '11111111-1111-4111-8111-111111111111', '外山助太',   '佐藤さんの友人',     3, 0.90),
  ('ff000000-0002-4002-8002-ff0000000002', '11111111-1111-4111-8111-111111111111', '内田助二',   '元メンバー',         5, 0.95),
  ('ff000000-0003-4003-8003-ff0000000003', '11111111-1111-4111-8111-111111111111', '大野助三',   '田中さんの会社の同僚', 1, 0.80),
  ('ff000000-0004-4004-8004-ff0000000004', '22222222-2222-4222-8222-222222222222', '西田助一',   '石井さんの紹介',     2, 0.85);

-- ===== 対戦相手チーム =====
INSERT INTO opponent_teams (id, team_id, name, area, contact_name, contact_email, times_played, last_played_at) VALUES
  ('cccccccc-0001-4001-8001-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'レッドソックス', '東京都・目黒区', '山本監督',     'yamamoto@example.com', 5, '2026-03-15'),
  ('cccccccc-0002-4002-8002-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'ブルージェイズ', '東京都・渋谷区', '伊藤キャプテン', 'ito@example.com',      3, '2026-02-20'),
  ('cccccccc-0003-4003-8003-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'イーグルス',     '東京都・新宿区', '木村代表',     'kimura@example.com',   0, NULL),
  ('cccccccc-0004-4004-8004-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'ファルコンズ',   '神奈川県・川崎市', '田口コーチ',   'taguchi@example.com',  4, '2026-03-01');

-- ===== グラウンド =====
INSERT INTO grounds (id, team_id, name, municipality, source_url, cost_per_slot, is_hardball_ok) VALUES
  ('eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '世田谷区立総合運動場', '東京都世田谷区', 'https://example.com/setagaya', 5000, false),
  ('eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', '砧公園野球場',         '東京都世田谷区', 'https://example.com/kinuta',   3000, false),
  ('eeeeeeee-0003-4003-8003-eeeeeeeeeeee', '22222222-2222-4222-8222-222222222222', '横浜公園野球場',       '神奈川県横浜市', 'https://example.com/yokohama', 4000, true);

-- ===== 試合 (シーズン: 2026年4月〜) =====

-- 完了済み試合 (COMPLETED → 精算済み)
INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players, rsvp_deadline) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '開幕戦 vs レッドソックス', 'FRIENDLY', 'SETTLED',    '2026-03-15', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '世田谷区立総合運動場', 'cccccccc-0001-4001-8001-cccccccccccc', 9, '2026-03-12 23:59:00+09'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '第2節 vs ブルージェイズ',  'FRIENDLY', 'SETTLED',    '2026-03-22', '13:00', '16:00', 'eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '砧公園野球場',         'cccccccc-0002-4002-8002-cccccccccccc', 9, '2026-03-19 23:59:00+09'),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '第3節 vs レッドソックス',  'FRIENDLY', 'COMPLETED',  '2026-03-29', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '世田谷区立総合運動場', 'cccccccc-0001-4001-8001-cccccccccccc', 9, '2026-03-26 23:59:00+09'),

-- 確定済み試合
  ('bbbbbbbb-0004-4004-8004-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '4月第2週 確定済み試合',    'FRIENDLY', 'CONFIRMED',  '2026-04-12', '09:00', '12:00', 'eeeeeeee-0002-4002-8002-eeeeeeeeeeee', '砧公園野球場',         'cccccccc-0001-4001-8001-cccccccccccc', 9, '2026-04-09 23:59:00+09'),

-- 出欠収集中の試合
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第2週 練習試合',        'FRIENDLY', 'COLLECTING', '2026-05-10', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '世田谷区立総合運動場', 'cccccccc-0002-4002-8002-cccccccccccc', 9, '2026-05-07 23:59:00+09'),

-- DRAFT
  ('bbbbbbbb-0006-4006-8006-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '5月第3週 対戦希望',        'FRIENDLY', 'DRAFT',      '2026-05-17', '13:00', '17:00', NULL, NULL, NULL, 9, NULL),

-- キャンセル済み
  ('bbbbbbbb-0007-4007-8007-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '雨天中止 3月8日',          'FRIENDLY', 'CANCELLED',  '2026-03-08', '09:00', '12:00', 'eeeeeeee-0001-4001-8001-eeeeeeeeeeee', '世田谷区立総合運動場', 'cccccccc-0002-4002-8002-cccccccccccc', 9, '2026-03-05 23:59:00+09'),

-- チーム2の試合
  ('bbbbbbbb-0008-4008-8008-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', '横浜リーグ 第1節',         'LEAGUE',   'SETTLED',    '2026-03-20', '10:00', '13:00', 'eeeeeeee-0003-4003-8003-eeeeeeeeeeee', '横浜公園野球場',       'cccccccc-0004-4004-8004-cccccccccccc', 9, '2026-03-17 23:59:00+09'),
  ('bbbbbbbb-0009-4009-8009-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', '横浜リーグ 第2節',         'LEAGUE',   'COLLECTING', '2026-04-19', '10:00', '13:00', 'eeeeeeee-0003-4003-8003-eeeeeeeeeeee', '横浜公園野球場',       'cccccccc-0004-4004-8004-cccccccccccc', 9, '2026-04-16 23:59:00+09');

-- ===== 出欠 (5月第2週 練習試合向け) =====
INSERT INTO rsvps (game_id, member_id, response, responded_at, response_channel) VALUES
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'APP'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'LINE'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 'MAYBE',       now(), 'APP'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 'UNAVAILABLE', now(), 'APP'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 'NO_RESPONSE', NULL, NULL),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'LINE'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', 'NO_RESPONSE', NULL, NULL),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'APP'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', 'NO_RESPONSE', NULL, NULL),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'APP'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0011-4011-8011-aaaaaaaaaaaa', 'UNAVAILABLE', now(), 'EMAIL'),
  ('bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'aaaaaaaa-0012-4012-8012-aaaaaaaaaaaa', 'AVAILABLE',   now(), 'APP');

-- ===== 交渉 =====
INSERT INTO negotiations (id, game_id, opponent_team_id, status, proposed_dates_json, message_sent, reply_received) VALUES
  ('dddddddd-0001-4001-8001-dddddddddddd', 'bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'cccccccc-0002-4002-8002-cccccccccccc', 'ACCEPTED', '["2026-05-10"]', '5月10日に練習試合のお誘いです。', '承知しました！10日午前でお願いします。'),
  ('dddddddd-0002-4002-8002-dddddddddddd', 'bbbbbbbb-0006-4006-8006-bbbbbbbbbbbb', 'cccccccc-0003-4003-8003-cccccccccccc', 'SENT', '["2026-05-17","2026-05-24"]', '5月後半に試合いかがでしょうか。', NULL);

-- ===== 助っ人リクエスト =====
INSERT INTO helper_requests (id, game_id, helper_id, status, message, sent_at, responded_at) VALUES
  ('hhhhhhhh-0001-4001-8001-hhhhhhhhhhhh', 'bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'ff000000-0001-4001-8001-ff0000000001', 'ACCEPTED', '5/10の試合、助っ人お願いできますか？', now(), now()),
  ('hhhhhhhh-0002-4002-8002-hhhhhhhhhhhh', 'bbbbbbbb-0005-4005-8005-bbbbbbbbbbbb', 'ff000000-0002-4002-8002-ff0000000002', 'PENDING',  '5/10の試合、助っ人お願いできますか？', now(), NULL);

-- ===== 試合結果 =====
INSERT INTO game_results (id, game_id, our_score, opponent_score, result, innings, note) VALUES
  ('rrrrrrrr-0001-4001-8001-rrrrrrrrrrrr', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 8,  3, 'WIN',  7, '田中が完投。打線も好調'),
  ('rrrrrrrr-0002-4002-8002-rrrrrrrrrrrr', 'bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 4,  6, 'LOSE', 7, '中盤に逆転を許した'),
  ('rrrrrrrr-0003-4003-8003-rrrrrrrrrrrr', 'bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 5,  5, 'DRAW', 7, '延長なしの規定により引き分け'),
  ('rrrrrrrr-0004-4004-8004-rrrrrrrrrrrr', 'bbbbbbbb-0008-4008-8008-bbbbbbbbbbbb', 7,  2, 'WIN',  7, 'リーグ戦初勝利');

-- ===== 出席記録 =====
INSERT INTO attendances (game_id, person_type, person_id, status, recorded_by) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 'NO_SHOW',  'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'MEMBER', 'aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'HELPER', 'ff000000-0001-4001-8001-ff0000000001', 'ATTENDED', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa');

-- ===== 経費 =====
INSERT INTO expenses (game_id, category, amount, paid_by, split_with_opponent, note) VALUES
  -- 開幕戦
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'GROUND',    5000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  'グラウンド使用料'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'UMPIRE',    3000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  '審判代'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'BALL',      1500, 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', false, '公認球 3ダース'),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'DRINK',      800, 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', false, 'スポーツドリンク'),
  -- 第2節
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'GROUND',    3000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  'グラウンド使用料'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'UMPIRE',    3000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  '審判代'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'DRINK',     1000, 'aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', false, '飲み物代'),
  -- 第3節
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'GROUND',    5000, 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', true,  'グラウンド使用料'),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'UMPIRE',    3000, 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', true,  '審判代'),
  ('bbbbbbbb-0003-4003-8003-bbbbbbbbbbbb', 'BALL',      1000, 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', false, '練習球 2ダース');

-- ===== 精算 =====
INSERT INTO settlements (game_id, total_cost, opponent_share, team_cost, member_count, per_member, status, settled_at) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 10300, 4000, 6300, 9, 700, 'SETTLED', '2026-03-20 12:00:00+09'),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb',  7000, 3000, 4000, 10, 400, 'SETTLED', '2026-03-25 12:00:00+09');

-- ===== 打撃成績 (開幕戦サンプル) =====
INSERT INTO at_bats (game_id, member_id, inning, batting_order, result, rbi, runs_scored) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 1, 1, 'SINGLE',     0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 3, 1, 'DOUBLE',     2, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 5, 1, 'FLY_OUT',    0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 1, 2, 'WALK',       0, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 3, 2, 'SINGLE',     1, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 5, 2, 'GROUND_OUT', 0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 1, 3, 'SINGLE',     1, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 3, 3, 'STRIKEOUT',  0, false),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 1, 4, 'HOMERUN',    3, true),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', 4, 4, 'SINGLE',     1, false);

-- ===== 投球成績 =====
INSERT INTO pitching_stats (game_id, member_id, role, innings_pitched, hits_allowed, runs_allowed, earned_runs, strikeouts, walks, is_winning_pitcher) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'STARTER', 7.0, 5, 3, 2, 8, 2, true),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'STARTER', 5.0, 8, 5, 4, 3, 4, false),
  ('bbbbbbbb-0002-4002-8002-bbbbbbbbbbbb', 'aaaaaaaa-0010-4010-8010-aaaaaaaaaaaa', 'RELIEVER', 2.0, 2, 1, 1, 2, 0, false);

-- ===== 守備記録 =====
INSERT INTO fielding_entries (game_id, member_id, position, innings_from, innings_to) VALUES
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'P',  1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0002-4002-8002-aaaaaaaaaaaa', 'C',  1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0005-4005-8005-aaaaaaaaaaaa', '1B', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0006-4006-8006-aaaaaaaaaaaa', '2B', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0003-4003-8003-aaaaaaaaaaaa', 'SS', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0007-4007-8007-aaaaaaaaaaaa', '3B', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0004-4004-8004-aaaaaaaaaaaa', 'LF', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0008-4008-8008-aaaaaaaaaaaa', 'CF', 1, 7),
  ('bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', 'aaaaaaaa-0009-4009-8009-aaaaaaaaaaaa', 'RF', 1, 7);

-- ===== 監査ログ (サンプル) =====
INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, before_json, after_json) VALUES
  ('USER',   'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'GAME_CREATED',    'game', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', NULL, '{"status":"DRAFT"}'),
  ('USER',   'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'GAME_TRANSITION', 'game', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '{"status":"DRAFT"}', '{"status":"COLLECTING"}'),
  ('USER',   'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'GAME_TRANSITION', 'game', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '{"status":"COLLECTING"}', '{"status":"CONFIRMED"}'),
  ('SYSTEM', 'SYSTEM',                                'GAME_TRANSITION', 'game', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '{"status":"CONFIRMED"}', '{"status":"COMPLETED"}'),
  ('USER',   'aaaaaaaa-0001-4001-8001-aaaaaaaaaaaa', 'SETTLEMENT_COMPLETED', 'game', 'bbbbbbbb-0001-4001-8001-bbbbbbbbbbbb', '{"status":"COMPLETED"}', '{"status":"SETTLED"}');
