-- ============================================================
-- バイラル機能 — Issue #112
-- 招待リンク・チーム公開プロフィール
-- ============================================================

-- チーム招待
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  invite_type TEXT NOT NULL
    CHECK (invite_type IN ('OPPONENT', 'HELPER', 'LEAGUE', 'MEMBER')),
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- チーム公開プロフィール
CREATE TABLE IF NOT EXISTS team_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  activity_area TEXT,
  skill_level TEXT
    CHECK (skill_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE')),
  member_count INTEGER DEFAULT 0,
  founded_year INTEGER,
  looking_for_opponents BOOLEAN NOT NULL DEFAULT false,
  looking_for_helpers BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  stats_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 招待使用記録
CREATE TABLE IF NOT EXISTS invitation_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES team_invitations(id) ON DELETE CASCADE,
  used_by_user_id UUID,
  used_by_team_id UUID,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_team_invitations_code ON team_invitations(invite_code);
CREATE INDEX idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX idx_team_profiles_public ON team_profiles(is_public) WHERE is_public = true;
CREATE INDEX idx_team_profiles_area ON team_profiles(activity_area) WHERE is_public = true;
CREATE INDEX idx_invitation_uses_invitation ON invitation_uses(invitation_id);

-- updated_at 自動更新トリガー
CREATE TRIGGER set_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_team_profiles_updated_at
  BEFORE UPDATE ON team_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
