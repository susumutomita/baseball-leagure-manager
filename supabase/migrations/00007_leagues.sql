-- ============================================================
-- リーグ運営機能 — Issue #111
-- ============================================================

-- リーグ
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  area TEXT,
  format TEXT NOT NULL DEFAULT 'ROUND_ROBIN'
    CHECK (format IN ('ROUND_ROBIN', 'TOURNAMENT', 'DOUBLE_ROUND_ROBIN')),
  organizer_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'RECRUITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  max_teams INTEGER DEFAULT 20,
  rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- リーグ参加チーム
CREATE TABLE IF NOT EXISTS league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'INVITED'
    CHECK (status IN ('INVITED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, team_id)
);

-- リーグ試合
CREATE TABLE IF NOT EXISTS league_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL,
  away_team_id UUID NOT NULL,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  game_id UUID,
  scheduled_date DATE,
  ground_id UUID,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'POSTPONED')),
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- リーグ順位表
CREATE TABLE IF NOT EXISTS league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  runs_for INTEGER NOT NULL DEFAULT 0,
  runs_against INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, team_id)
);

-- インデックス
CREATE INDEX idx_league_teams_league ON league_teams(league_id);
CREATE INDEX idx_league_teams_team ON league_teams(team_id);
CREATE INDEX idx_league_matches_league ON league_matches(league_id);
CREATE INDEX idx_league_matches_round ON league_matches(league_id, round);
CREATE INDEX idx_league_standings_league ON league_standings(league_id);

-- updated_at 自動更新トリガー
CREATE TRIGGER set_leagues_updated_at
  BEFORE UPDATE ON leagues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_league_teams_updated_at
  BEFORE UPDATE ON league_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_league_matches_updated_at
  BEFORE UPDATE ON league_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_league_standings_updated_at
  BEFORE UPDATE ON league_standings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
