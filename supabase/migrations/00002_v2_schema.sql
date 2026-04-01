-- ============================================================
-- 試合成立エンジン v2 スキーマ
-- data-model.md に基づく全面リビルド
-- ============================================================

-- ===== 0. v1 テーブルを削除 (依存関係順) =====
DROP TRIGGER IF EXISTS trg_ground_watch_targets_updated_at ON ground_watch_targets;
DROP TRIGGER IF EXISTS trg_negotiations_updated_at ON negotiations;
DROP TRIGGER IF EXISTS trg_opponent_teams_updated_at ON opponent_teams;
DROP TRIGGER IF EXISTS trg_match_requests_updated_at ON match_requests;
DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;

DROP TABLE IF EXISTS confirmations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS availability_responses CASCADE;
DROP TABLE IF EXISTS ground_availability_snapshots CASCADE;
DROP TABLE IF EXISTS ground_watch_targets CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS opponent_teams CASCADE;
DROP TABLE IF EXISTS match_requests CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column();

-- ===== 1. チーム管理 =====

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  home_area TEXT NOT NULL,
  activity_day TEXT,
  owner_user_id UUID,
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PRO' CHECK (tier IN ('PRO', 'LITE')),
  line_user_id TEXT,
  email TEXT,
  expo_push_token TEXT,
  positions_json JSONB NOT NULL DEFAULT '[]',
  jersey_number INTEGER,
  attendance_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  no_show_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  joined_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_team_id ON members(team_id);

CREATE TABLE helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  line_user_id TEXT,
  email TEXT,
  note TEXT,
  times_helped INTEGER NOT NULL DEFAULT 0,
  last_helped_at DATE,
  reliability_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_helpers_team_id ON helpers(team_id);

-- ===== 2. 試合管理 =====

CREATE TABLE opponent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_line TEXT,
  contact_phone TEXT,
  home_ground TEXT,
  note TEXT,
  times_played INTEGER NOT NULL DEFAULT 0,
  last_played_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_opponent_teams_team_id ON opponent_teams(team_id);

CREATE TABLE grounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  municipality TEXT NOT NULL,
  source_url TEXT,
  cost_per_slot INTEGER,
  is_hardball_ok BOOLEAN NOT NULL DEFAULT false,
  has_night_lights BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  watch_active BOOLEAN NOT NULL DEFAULT true,
  conditions_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_grounds_team_id ON grounds(team_id);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'FRIENDLY' CHECK (game_type IN ('PRACTICE', 'FRIENDLY', 'LEAGUE', 'TOURNAMENT')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COLLECTING', 'ASSESSING', 'ARRANGING', 'CONFIRMED', 'COMPLETED', 'SETTLED', 'CANCELLED')),
  game_date DATE,
  start_time TIME,
  end_time TIME,
  ground_id UUID REFERENCES grounds(id),
  ground_name TEXT,
  opponent_team_id UUID REFERENCES opponent_teams(id),
  min_players INTEGER NOT NULL DEFAULT 9,
  rsvp_deadline TIMESTAMPTZ,
  note TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  available_count INTEGER NOT NULL DEFAULT 0,
  unavailable_count INTEGER NOT NULL DEFAULT 0,
  maybe_count INTEGER NOT NULL DEFAULT 0,
  no_response_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_games_team_id ON games(team_id);
CREATE INDEX idx_games_team_status ON games(team_id, status);
CREATE INDEX idx_games_status ON games(status);

-- ===== 3. 出欠管理 =====

CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'NO_RESPONSE' CHECK (response IN ('AVAILABLE', 'UNAVAILABLE', 'MAYBE', 'NO_RESPONSE')),
  responded_at TIMESTAMPTZ,
  response_channel TEXT CHECK (response_channel IN ('APP', 'LINE', 'EMAIL', 'WEB')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, member_id)
);
CREATE INDEX idx_rsvps_game_id ON rsvps(game_id);
CREATE INDEX idx_rsvps_game_response ON rsvps(game_id, response);

CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('MEMBER', 'HELPER')),
  person_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ATTENDED', 'NO_SHOW', 'CANCELLED_SAME_DAY')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID,
  UNIQUE (game_id, person_type, person_id)
);
CREATE INDEX idx_attendances_game_id ON attendances(game_id);

-- ===== 4. 助っ人打診 =====

CREATE TABLE helper_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES helpers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  message TEXT,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_helper_requests_game_id ON helper_requests(game_id);
CREATE INDEX idx_helper_requests_game_status ON helper_requests(game_id, status);

-- ===== 5. 対戦交渉 =====

CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  opponent_team_id UUID NOT NULL REFERENCES opponent_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'REPLIED', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  proposed_dates_json JSONB NOT NULL DEFAULT '[]',
  message_sent TEXT,
  reply_received TEXT,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_negotiations_game_id ON negotiations(game_id);

CREATE TABLE available_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT CHECK (time_slot IN ('MORNING', 'AFTERNOON', 'ALL_DAY')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PROPOSED', 'BOOKED')),
  game_id UUID REFERENCES games(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, date, time_slot)
);
CREATE INDEX idx_available_dates_team_id ON available_dates(team_id);

-- ===== 6. グラウンド空き =====

CREATE TABLE ground_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id UUID NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('MORNING', 'AFTERNOON', 'EVENING')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'UNAVAILABLE')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reserved_game_id UUID REFERENCES games(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ground_id, date, time_slot)
);
CREATE INDEX idx_ground_slots_ground_id ON ground_slots(ground_id);

-- ===== 7. 精算 =====

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('GROUND', 'UMPIRE', 'BALL', 'DRINK', 'TOURNAMENT_FEE', 'OTHER')),
  amount INTEGER NOT NULL,
  paid_by UUID REFERENCES members(id),
  split_with_opponent BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_game_id ON expenses(game_id);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE UNIQUE,
  total_cost INTEGER NOT NULL,
  opponent_share INTEGER NOT NULL DEFAULT 0,
  team_cost INTEGER NOT NULL,
  member_count INTEGER NOT NULL,
  per_member INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'NOTIFIED', 'SETTLED')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 8. 通知 =====

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('MEMBER', 'HELPER', 'OPPONENT')),
  recipient_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('PUSH', 'LINE', 'EMAIL')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('RSVP_REQUEST', 'REMINDER', 'DEADLINE', 'HELPER_REQUEST', 'SETTLEMENT', 'CANCELLATION', 'GROUND_ALERT')),
  content TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered BOOLEAN
);
CREATE INDEX idx_notification_logs_game ON notification_logs(game_id, sent_at DESC);
CREATE INDEX idx_notification_logs_team ON notification_logs(team_id);

-- ===== 9. 個人成績 =====

CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE UNIQUE,
  our_score INTEGER,
  opponent_score INTEGER,
  result TEXT CHECK (result IN ('WIN', 'LOSE', 'DRAW')),
  innings INTEGER NOT NULL DEFAULT 7,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE at_bats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  inning INTEGER NOT NULL,
  batting_order INTEGER,
  result TEXT NOT NULL CHECK (result IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'HOMERUN', 'GROUND_OUT', 'FLY_OUT', 'LINE_OUT', 'STRIKEOUT', 'DOUBLE_PLAY', 'FIELDERS_CHOICE', 'ERROR', 'WALK', 'HIT_BY_PITCH', 'SAC_BUNT', 'SAC_FLY')),
  hit_direction TEXT CHECK (hit_direction IN ('LEFT', 'LEFT_CENTER', 'CENTER', 'RIGHT_CENTER', 'RIGHT')),
  hit_type TEXT CHECK (hit_type IN ('GROUND', 'FLY', 'LINE', 'BUNT')),
  rbi INTEGER NOT NULL DEFAULT 0,
  runs_scored BOOLEAN NOT NULL DEFAULT false,
  stolen_base BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_at_bats_game_id ON at_bats(game_id);
CREATE INDEX idx_at_bats_member_id ON at_bats(member_id);

CREATE TABLE pitching_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('STARTER', 'RELIEVER', 'CLOSER')),
  innings_pitched NUMERIC(3, 1) NOT NULL DEFAULT 0,
  hits_allowed INTEGER NOT NULL DEFAULT 0,
  runs_allowed INTEGER NOT NULL DEFAULT 0,
  earned_runs INTEGER NOT NULL DEFAULT 0,
  strikeouts INTEGER NOT NULL DEFAULT 0,
  walks INTEGER NOT NULL DEFAULT 0,
  hit_batters INTEGER NOT NULL DEFAULT 0,
  home_runs_allowed INTEGER NOT NULL DEFAULT 0,
  is_winning_pitcher BOOLEAN NOT NULL DEFAULT false,
  is_losing_pitcher BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pitching_stats_game_id ON pitching_stats(game_id);
CREATE INDEX idx_pitching_stats_member_id ON pitching_stats(member_id);

CREATE TABLE fielding_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF')),
  innings_from INTEGER,
  innings_to INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fielding_entries_game_id ON fielding_entries(game_id);

-- ===== 10. 監査ログ =====

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'AI')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ===== トリガー: updated_at 自動更新 =====

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_helpers_updated_at BEFORE UPDATE ON helpers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rsvps_updated_at BEFORE UPDATE ON rsvps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_opponent_teams_updated_at BEFORE UPDATE ON opponent_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_grounds_updated_at BEFORE UPDATE ON grounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ground_slots_updated_at BEFORE UPDATE ON ground_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_helper_requests_updated_at BEFORE UPDATE ON helper_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_available_dates_updated_at BEFORE UPDATE ON available_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== トリガー: 出欠集計キャッシュ自動更新 =====

CREATE OR REPLACE FUNCTION update_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE games SET
    available_count = (SELECT COUNT(*) FROM rsvps WHERE game_id = NEW.game_id AND response = 'AVAILABLE'),
    unavailable_count = (SELECT COUNT(*) FROM rsvps WHERE game_id = NEW.game_id AND response = 'UNAVAILABLE'),
    maybe_count = (SELECT COUNT(*) FROM rsvps WHERE game_id = NEW.game_id AND response = 'MAYBE'),
    no_response_count = (SELECT COUNT(*) FROM rsvps WHERE game_id = NEW.game_id AND response = 'NO_RESPONSE')
  WHERE id = NEW.game_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rsvps_count_update
  AFTER INSERT OR UPDATE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION update_rsvp_counts();
