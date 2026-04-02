-- ============================================================
-- ステートマシン簡素化: ASSESSING, ARRANGING を削除
-- DRAFT → COLLECTING → CONFIRMED → COMPLETED → SETTLED
-- ============================================================

-- 既存データを移行 (ASSESSING/ARRANGING → COLLECTING に戻す)
UPDATE games SET status = 'COLLECTING' WHERE status IN ('ASSESSING', 'ARRANGING');

-- CHECK制約を更新
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('DRAFT', 'COLLECTING', 'CONFIRMED', 'COMPLETED', 'SETTLED', 'CANCELLED'));
