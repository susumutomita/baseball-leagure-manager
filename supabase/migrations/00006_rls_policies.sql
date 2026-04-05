-- ============================================================
-- Row Level Security (RLS) ポリシー
-- マルチテナント: ユーザーは自分が所属するチームのデータのみアクセス可能
-- ============================================================

-- ===== RLS を有効化 =====

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE helper_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ground_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE at_bats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitching_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fielding_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== ヘルパー関数: ユーザーの所属チーム取得 =====

CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM members WHERE line_user_id = auth.uid()::TEXT
  UNION
  SELECT id FROM teams WHERE owner_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ===== teams =====

CREATE POLICY "teams_select_own" ON teams
  FOR SELECT USING (
    id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "teams_insert_authenticated" ON teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "teams_update_owner" ON teams
  FOR UPDATE USING (
    owner_user_id = auth.uid()
  );

CREATE POLICY "teams_delete_owner" ON teams
  FOR DELETE USING (
    owner_user_id = auth.uid()
  );

-- ===== members =====

CREATE POLICY "members_select_team" ON members
  FOR SELECT USING (
    team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "members_insert_team" ON members
  FOR INSERT WITH CHECK (
    team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "members_update_team" ON members
  FOR UPDATE USING (
    team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "members_delete_team" ON members
  FOR DELETE USING (
    team_id IN (SELECT get_user_team_ids())
  );

-- ===== helpers =====

CREATE POLICY "helpers_select_team" ON helpers
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "helpers_insert_team" ON helpers
  FOR INSERT WITH CHECK (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "helpers_update_team" ON helpers
  FOR UPDATE USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "helpers_delete_team" ON helpers
  FOR DELETE USING (team_id IN (SELECT get_user_team_ids()));

-- ===== games =====

CREATE POLICY "games_select_team" ON games
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "games_insert_team" ON games
  FOR INSERT WITH CHECK (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "games_update_team" ON games
  FOR UPDATE USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "games_delete_team" ON games
  FOR DELETE USING (team_id IN (SELECT get_user_team_ids()));

-- ===== rsvps (試合経由でチーム判定) =====

CREATE POLICY "rsvps_select_game_team" ON rsvps
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "rsvps_insert_game_team" ON rsvps
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "rsvps_update_game_team" ON rsvps
  FOR UPDATE USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== attendances =====

CREATE POLICY "attendances_select_game_team" ON attendances
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "attendances_insert_game_team" ON attendances
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== helper_requests =====

CREATE POLICY "helper_requests_select_game_team" ON helper_requests
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "helper_requests_insert_game_team" ON helper_requests
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "helper_requests_update_game_team" ON helper_requests
  FOR UPDATE USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== negotiations =====

CREATE POLICY "negotiations_select_game_team" ON negotiations
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "negotiations_insert_game_team" ON negotiations
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "negotiations_update_game_team" ON negotiations
  FOR UPDATE USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== opponent_teams =====

CREATE POLICY "opponent_teams_select_team" ON opponent_teams
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "opponent_teams_insert_team" ON opponent_teams
  FOR INSERT WITH CHECK (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "opponent_teams_update_team" ON opponent_teams
  FOR UPDATE USING (team_id IN (SELECT get_user_team_ids()));

-- ===== grounds =====

CREATE POLICY "grounds_select_team" ON grounds
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "grounds_insert_team" ON grounds
  FOR INSERT WITH CHECK (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "grounds_update_team" ON grounds
  FOR UPDATE USING (team_id IN (SELECT get_user_team_ids()));

-- ===== ground_slots =====

CREATE POLICY "ground_slots_select_ground_team" ON ground_slots
  FOR SELECT USING (
    ground_id IN (SELECT id FROM grounds WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== expenses =====

CREATE POLICY "expenses_select_game_team" ON expenses
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "expenses_insert_game_team" ON expenses
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== settlements =====

CREATE POLICY "settlements_select_game_team" ON settlements
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "settlements_insert_game_team" ON settlements
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== notification_logs =====

CREATE POLICY "notification_logs_select_team" ON notification_logs
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids()));

CREATE POLICY "notification_logs_insert_team" ON notification_logs
  FOR INSERT WITH CHECK (team_id IN (SELECT get_user_team_ids()));

-- ===== game_results =====

CREATE POLICY "game_results_select_game_team" ON game_results
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "game_results_insert_game_team" ON game_results
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== at_bats =====

CREATE POLICY "at_bats_select_game_team" ON at_bats
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "at_bats_insert_game_team" ON at_bats
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== pitching_stats =====

CREATE POLICY "pitching_stats_select_game_team" ON pitching_stats
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "pitching_stats_insert_game_team" ON pitching_stats
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== fielding_entries =====

CREATE POLICY "fielding_entries_select_game_team" ON fielding_entries
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

CREATE POLICY "fielding_entries_insert_game_team" ON fielding_entries
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM games WHERE team_id IN (SELECT get_user_team_ids()))
  );

-- ===== audit_logs (読み取り専用: ADMINのみ) =====

CREATE POLICY "audit_logs_select_own_actions" ON audit_logs
  FOR SELECT USING (
    actor_id = auth.uid()::TEXT
    OR actor_id IN (
      SELECT id::TEXT FROM members WHERE team_id IN (SELECT get_user_team_ids())
    )
  );

-- ===== サービスロールはRLSをバイパス =====
-- Supabase のサービスロールキーを使うバックエンドAPIは
-- デフォルトでRLSをバイパスするため追加設定は不要
