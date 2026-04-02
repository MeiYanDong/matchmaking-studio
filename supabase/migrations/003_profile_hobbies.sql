-- ============================================================
-- Matchmaking Studio - 档案字段补充
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hobbies TEXT[];
