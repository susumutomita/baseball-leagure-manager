-- ============================================================
-- シードデータ（ローカル開発用） - v2 スキーマ対応
-- ============================================================

-- チーム
INSERT INTO teams (id, name, home_area, activity_day) VALUES
  ('11111111-1111-1111-1111-111111111111', 'サンダーボルツ', '東京都・世田谷区', '日曜日');

-- メンバー
INSERT INTO members (id, team_id, name, tier, positions_json, attendance_rate, status) VALUES
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '田中太郎',   'PRO',  '["ピッチャー"]',  85.00, 'ACTIVE'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '鈴木一郎',   'PRO',  '["キャッチャー"]',90.00, 'ACTIVE'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '佐藤次郎',   'LITE', '["ショート"]',    75.00, 'ACTIVE'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '山田三郎',   'PRO',  '["外野手"]',      60.00, 'ACTIVE'),
  ('aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '高橋四郎',   'PRO',  '["一塁手"]',      80.00, 'ACTIVE'),
  ('aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '中村五郎',   'PRO',  '["二塁手"]',      88.00, 'ACTIVE'),
  ('aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '小林六郎',   'LITE', '["三塁手"]',      70.00, 'ACTIVE'),
  ('aaaaaaaa-0008-0008-0008-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '加藤七郎',   'PRO',  '["外野手"]',      82.00, 'ACTIVE'),
  ('aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '吉田八郎',   'PRO',  '["外野手"]',      65.00, 'ACTIVE');

-- 助っ人
INSERT INTO helpers (id, team_id, name, note, times_helped) VALUES
  ('hhhhhhhh-0001-0001-0001-hhhhhhhhhhhh', '11111111-1111-1111-1111-111111111111', '外山助太', '佐藤さんの友人', 3);

-- 対戦相手チーム
INSERT INTO opponent_teams (id, team_id, name, area, contact_name) VALUES
  ('cccccccc-0001-0001-0001-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'レッドソックス', '東京都・目黒区', '山本監督'),
  ('cccccccc-0002-0002-0002-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ブルージェイズ', '東京都・渋谷区', '伊藤キャプテン'),
  ('cccccccc-0003-0003-0003-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'イーグルス',     '東京都・新宿区', '木村代表');

-- グラウンド
INSERT INTO grounds (id, team_id, name, municipality, source_url, cost_per_slot, is_hardball_ok) VALUES
  ('eeeeeeee-0001-0001-0001-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '世田谷区立総合運動場', '東京都世田谷区', 'https://example.com/setagaya', 5000, false),
  ('eeeeeeee-0002-0002-0002-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '砧公園野球場',         '東京都世田谷区', 'https://example.com/kinuta',   3000, false);

-- 試合
INSERT INTO games (id, team_id, title, game_type, status, game_date, start_time, end_time, ground_id, ground_name, opponent_team_id, min_players, rsvp_deadline) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第2週 練習試合', 'FRIENDLY', 'COLLECTING', '2026-05-10', '09:00', '12:00', 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee', '世田谷区立総合運動場', 'cccccccc-0002-0002-0002-cccccccccccc', 9, '2026-05-07 23:59:00+09'),
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第3週 対戦希望', 'FRIENDLY', 'DRAFT',      '2026-05-17', '13:00', '17:00', NULL,                                   NULL,                   NULL,                                   9, NULL),
  ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '4月 確定済み試合',  'FRIENDLY', 'CONFIRMED',  '2026-04-12', '09:00', '12:00', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', '砧公園野球場',         'cccccccc-0001-0001-0001-cccccccccccc', 9, '2026-04-09 23:59:00+09');

-- 出欠（5月第2週 練習試合向け）
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
  ('dddddddd-0001-0001-0001-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0002-0002-0002-cccccccccccc', 'ACCEPTED', '["2026-05-10"]', '5月10日に練習試合のお誘いです。', '承知しました！10日午前でお願いします。');
