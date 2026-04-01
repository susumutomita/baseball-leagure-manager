-- ============================================================
-- シードデータ（ローカル開発用） — v2 スキーマ対応
-- ============================================================

-- チーム
INSERT INTO teams (id, name, home_area, activity_day) VALUES
  ('11111111-1111-1111-1111-111111111111', 'サンダーボルツ', '東京都・世田谷区', '日曜日');

-- メンバー
INSERT INTO members (id, team_id, name, positions_json, attendance_rate, status) VALUES
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '田中太郎',   '["ピッチャー"]',   85.00, 'ACTIVE'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '鈴木一郎',   '["キャッチャー"]', 90.00, 'ACTIVE'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '佐藤次郎',   '["ショート"]',     75.00, 'ACTIVE'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '山田三郎',   '["外野手"]',       60.00, 'ACTIVE'),
  ('aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '高橋四郎',   '["一塁手"]',       80.00, 'ACTIVE'),
  ('aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '中村五郎',   '["二塁手"]',       88.00, 'ACTIVE'),
  ('aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '小林六郎',   '["三塁手"]',       70.00, 'ACTIVE'),
  ('aaaaaaaa-0008-0008-0008-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '加藤七郎',   '["外野手"]',       82.00, 'ACTIVE'),
  ('aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '吉田八郎',   '["外野手"]',       65.00, 'ACTIVE');

-- 助っ人
INSERT INTO helpers (id, team_id, name, note, times_helped) VALUES
  ('ff000000-0001-0001-0001-ff0000000001', '11111111-1111-1111-1111-111111111111', '外山助一', '以前のチームメイト', 3);

-- 対戦相手チーム
INSERT INTO opponent_teams (id, team_id, name, area, contact_name) VALUES
  ('cccccccc-0001-0001-0001-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'レッドソックス', '東京都・目黒区',   '赤井監督'),
  ('cccccccc-0002-0002-0002-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ブルージェイズ', '東京都・渋谷区',   '青山キャプテン'),
  ('cccccccc-0003-0003-0003-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'イーグルス',     '東京都・新宿区',   '鷲田代表');

-- グラウンド
INSERT INTO grounds (id, team_id, name, municipality, is_hardball_ok) VALUES
  ('eeeeeeee-0001-0001-0001-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '世田谷区立総合運動場', '世田谷区', false),
  ('eeeeeeee-0002-0002-0002-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '砧公園野球場',         '世田谷区', false);

-- 試合 (games)
INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_name, min_players) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第2週 練習試合', 'FRIENDLY',  'COLLECTING', '2026-05-09', '09:00', '12:00', '世田谷区立総合運動場', 9),
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第3週 対戦希望', 'FRIENDLY',  'DRAFT',      '2026-05-16', '13:00', '17:00', NULL,                  9),
  ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '4月 確定済み試合',  'FRIENDLY',  'CONFIRMED',  '2026-04-12', '09:00', '12:00', '砧公園野球場',        9);

-- 出欠 (rsvps) — 5月第2週 練習試合向け
INSERT INTO rsvps (game_id, member_id, response, responded_at) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'AVAILABLE',   now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'AVAILABLE',   now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', 'MAYBE',       now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', 'UNAVAILABLE', now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', 'NO_RESPONSE', NULL),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa', 'AVAILABLE',   now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa', 'NO_RESPONSE', NULL),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0008-0008-0008-aaaaaaaaaaaa', 'AVAILABLE',   now()),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa', 'NO_RESPONSE', NULL);

-- 交渉
INSERT INTO negotiations (id, game_id, opponent_team_id, status, proposed_dates_json, message_sent, reply_received) VALUES
  ('dddddddd-0001-0001-0001-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0001-0001-0001-cccccccccccc', 'SENT',     '["2026-05-09","2026-05-10"]', '5月9日または10日に練習試合をお願いできますでしょうか。', NULL),
  ('dddddddd-0002-0002-0002-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0002-0002-0002-cccccccccccc', 'ACCEPTED', '["2026-05-10"]',              '5月10日に練習試合のお誘いです。', '承知しました！10日午前でお願いします。'),
  ('dddddddd-0003-0003-0003-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0003-0003-0003-cccccccccccc', 'DECLINED', '["2026-05-09"]',              '5月9日に練習試合いかがでしょうか。', '申し訳ありません、その日は予定があります。');
