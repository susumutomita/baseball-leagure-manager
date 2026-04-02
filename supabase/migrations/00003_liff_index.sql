-- ============================================================
-- LIFF 連携用インデックス
-- members.line_user_id での検索を高速化
-- ============================================================

CREATE INDEX idx_members_line_user_id
  ON members(line_user_id)
  WHERE line_user_id IS NOT NULL;
