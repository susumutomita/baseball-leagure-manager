-- ============================================================
-- RLS ポリシー — マルチテナント行レベルセキュリティ
-- ============================================================

-- ===== RLS 有効化 =====
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE helper_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ground_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE at_bats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitching_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fielding_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== ヘルパー関数: ユーザーのチーム ID を取得 =====
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM members WHERE line_user_id = auth.jwt()->>'sub'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===== service_role: 全テーブルフルアクセス =====
CREATE POLICY "service_role_all" ON teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON helpers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON opponent_teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON grounds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON games FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON rsvps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON attendances FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON helper_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON negotiations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON available_dates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ground_slots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON settlements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON notification_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON game_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON at_bats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON pitching_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON fielding_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== authenticated: チームメンバーは自チームのデータを読み取り可能 =====
CREATE POLICY "team_read" ON teams FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON members FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON helpers FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON opponent_teams FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON grounds FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON games FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON rsvps FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON attendances FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON helper_requests FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON negotiations FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON available_dates FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON ground_slots FOR SELECT TO authenticated
  USING (ground_id IN (SELECT id FROM grounds WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON expenses FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON settlements FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON notification_logs FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "team_read" ON game_results FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON at_bats FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON pitching_stats FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON fielding_entries FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids())));

CREATE POLICY "team_read" ON audit_logs FOR SELECT TO authenticated
  USING (true);

-- ===== authenticated: 自分の出欠を更新可能 =====
CREATE POLICY "own_rsvp_update" ON rsvps FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE line_user_id = auth.jwt()->>'sub'))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE line_user_id = auth.jwt()->>'sub'));

CREATE POLICY "own_rsvp_insert" ON rsvps FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE line_user_id = auth.jwt()->>'sub'));
