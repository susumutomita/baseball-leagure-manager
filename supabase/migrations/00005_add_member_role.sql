-- ============================================================
-- members テーブルに role カラム追加 (RBAC)
-- ============================================================

ALTER TABLE members
  ADD COLUMN role TEXT NOT NULL DEFAULT 'MEMBER'
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MEMBER'));

-- 既存メンバーのインデックス
CREATE INDEX idx_members_role ON members(team_id, role);
