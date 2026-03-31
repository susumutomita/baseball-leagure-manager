-- ============================================================
-- シードデータ（ローカル開発用）
-- ============================================================

-- チーム
INSERT INTO teams (id, name, home_area, level_band) VALUES
  ('11111111-1111-1111-1111-111111111111', 'サンダーボルツ', '東京都・世田谷区', 'INTERMEDIATE');

-- メンバー
INSERT INTO members (id, team_id, name, positions_json, contact_type, contact_value, attendance_rate, status) VALUES
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '田中太郎',   '["ピッチャー"]',  'LINE',  'tanaka-line',  85.00, 'ACTIVE'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '鈴木一郎',   '["キャッチャー"]','LINE',  'suzuki-line',  90.00, 'ACTIVE'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '佐藤次郎',   '["ショート"]',    'EMAIL', 'sato@example.com', 75.00, 'ACTIVE'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '山田三郎',   '["外野手"]',      'LINE',  'yamada-line',  60.00, 'ACTIVE'),
  ('aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '高橋四郎',   '["一塁手"]',      'LINE',  'takahashi-line', 80.00, 'ACTIVE'),
  ('aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '中村五郎',   '["二塁手"]',      'EMAIL', 'nakamura@example.com', 88.00, 'ACTIVE'),
  ('aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '小林六郎',   '["三塁手"]',      'LINE',  'kobayashi-line', 70.00, 'ACTIVE'),
  ('aaaaaaaa-0008-0008-0008-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '加藤七郎',   '["外野手"]',      'LINE',  'kato-line',    82.00, 'ACTIVE'),
  ('aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '吉田八郎',   '["外野手"]',      'LINE',  'yoshida-line', 65.00, 'ACTIVE');

-- 試合リクエスト
INSERT INTO match_requests (id, team_id, title, desired_dates_json, preferred_time_slots_json, area, level_requirement, needs_ground, budget_limit, status, confidence_score) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第2週 練習試合', '["2026-05-09","2026-05-10"]', '["9:00-12:00"]', '東京都・世田谷区', 'INTERMEDIATE', true,  5000, 'NEGOTIATING', 55),
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '5月第3週 対戦希望', '["2026-05-16","2026-05-17"]', '["13:00-17:00"]','東京都・杉並区',   NULL,           true,  NULL, 'OPEN',        10),
  ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '4月 確定済み試合',  '["2026-04-12"]',              '["9:00-12:00"]', '東京都・大田区',   'INTERMEDIATE', false, 3000, 'CONFIRMED',  100);

-- 対戦相手チーム
INSERT INTO opponent_teams (id, name, area, level_band, contact_channel) VALUES
  ('cccccccc-0001-0001-0001-cccccccccccc', 'レッドソックス', '東京都・目黒区',   'INTERMEDIATE', 'LINE'),
  ('cccccccc-0002-0002-0002-cccccccccccc', 'ブルージェイズ', '東京都・渋谷区',   'ADVANCED',     'EMAIL'),
  ('cccccccc-0003-0003-0003-cccccccccccc', 'イーグルス',     '東京都・新宿区',   'INTERMEDIATE', 'LINE');

-- 交渉
INSERT INTO negotiations (id, match_request_id, opponent_team_id, proposed_dates_json, generated_message, reply_message, status) VALUES
  ('dddddddd-0001-0001-0001-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0001-0001-0001-cccccccccccc', '["2026-05-09","2026-05-10"]', 'お世話になります。5月9日または10日に練習試合をお願いできますでしょうか。', NULL, 'SENT'),
  ('dddddddd-0002-0002-0002-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0002-0002-0002-cccccccccccc', '["2026-05-10"]', '5月10日に練習試合のお誘いです。', '承知しました！10日午前でお願いします。', 'ACCEPTED'),
  ('dddddddd-0003-0003-0003-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'cccccccc-0003-0003-0003-cccccccccccc', '["2026-05-09"]', '5月9日に練習試合いかがでしょうか。', '申し訳ありません、その日は予定があります。', 'DECLINED');

-- グラウンド監視対象
INSERT INTO ground_watch_targets (id, team_id, name, source_url, area, active) VALUES
  ('eeeeeeee-0001-0001-0001-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '世田谷区立総合運動場', 'https://example.com/setagaya', '東京都・世田谷区', true),
  ('eeeeeeee-0002-0002-0002-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '砧公園野球場',         'https://example.com/kinuta',   '東京都・世田谷区', true);

-- グラウンド空き情報スナップショット
INSERT INTO ground_availability_snapshots (ground_watch_target_id, snapshot_time, availability_json, hash) VALUES
  ('eeeeeeee-0001-0001-0001-eeeeeeeeeeee', '2026-03-29 10:00:00+09', '{"slots": [{"date": "2026-05-09", "time": "9:00-12:00"}, {"date": "2026-05-10", "time": "13:00-17:00"}]}', 'hash-setagaya-1'),
  ('eeeeeeee-0002-0002-0002-eeeeeeeeeeee', '2026-03-29 10:00:00+09', '{"slots": []}', 'hash-kinuta-1');

-- 出欠回答（5月第2週 練習試合向け）
INSERT INTO availability_responses (match_request_id, member_id, response) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'AVAILABLE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'AVAILABLE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', 'MAYBE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', 'UNAVAILABLE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', 'UNKNOWN'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa', 'AVAILABLE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa', 'UNKNOWN'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0008-0008-0008-aaaaaaaaaaaa', 'AVAILABLE'),
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa', 'UNKNOWN');
