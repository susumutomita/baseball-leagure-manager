-- ============================================================
-- 試合成立エンジン 初期スキーマ
-- ============================================================

-- teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  home_area TEXT NOT NULL,
  level_band TEXT NOT NULL CHECK (level_band IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE')),
  payment_method TEXT,
  policy_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  positions_json JSONB NOT NULL DEFAULT '[]',
  contact_type TEXT NOT NULL CHECK (contact_type IN ('LINE', 'EMAIL', 'SLACK')),
  contact_value TEXT NOT NULL,
  attendance_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_team_id ON members(team_id);

-- match_requests
CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  desired_dates_json JSONB NOT NULL DEFAULT '[]',
  preferred_time_slots_json JSONB NOT NULL DEFAULT '[]',
  area TEXT NOT NULL,
  level_requirement TEXT CHECK (level_requirement IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE')),
  needs_ground BOOLEAN NOT NULL DEFAULT true,
  budget_limit INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'MATCH_CANDIDATE_FOUND', 'NEGOTIATING', 'GROUND_WAITING', 'READY_TO_CONFIRM', 'CONFIRMED', 'CANCELLED', 'FAILED')),
  confidence_score INTEGER NOT NULL DEFAULT 0,
  review_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_match_requests_team_id ON match_requests(team_id);
CREATE INDEX idx_match_requests_status ON match_requests(status);

-- opponent_teams
CREATE TABLE opponent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  level_band TEXT NOT NULL CHECK (level_band IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE')),
  contact_channel TEXT NOT NULL,
  policy_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- negotiations
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id UUID NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
  opponent_team_id UUID NOT NULL REFERENCES opponent_teams(id) ON DELETE CASCADE,
  proposed_dates_json JSONB NOT NULL DEFAULT '[]',
  generated_message TEXT,
  reply_message TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (status IN ('NOT_SENT', 'SENT', 'REPLIED', 'ACCEPTED', 'DECLINED', 'COUNTER_PROPOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_negotiations_match_request_id ON negotiations(match_request_id);

-- ground_watch_targets
CREATE TABLE ground_watch_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  area TEXT NOT NULL,
  conditions_json JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ground_watch_targets_team_id ON ground_watch_targets(team_id);

-- ground_availability_snapshots
CREATE TABLE ground_availability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_watch_target_id UUID NOT NULL REFERENCES ground_watch_targets(id) ON DELETE CASCADE,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  availability_json JSONB NOT NULL DEFAULT '{}',
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ground_snapshots_target_id ON ground_availability_snapshots(ground_watch_target_id);

-- availability_responses
CREATE TABLE availability_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id UUID NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (response IN ('UNKNOWN', 'AVAILABLE', 'UNAVAILABLE', 'MAYBE')),
  comment TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_request_id, member_id)
);
CREATE INDEX idx_availability_match_request_id ON availability_responses(match_request_id);

-- confirmations
CREATE TABLE confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id UUID NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('APPROVED', 'REJECTED')),
  note TEXT
);

-- audit_logs
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
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_match_requests_updated_at BEFORE UPDATE ON match_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_opponent_teams_updated_at BEFORE UPDATE ON opponent_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ground_watch_targets_updated_at BEFORE UPDATE ON ground_watch_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
