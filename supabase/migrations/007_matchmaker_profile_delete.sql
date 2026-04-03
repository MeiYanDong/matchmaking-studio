-- ============================================================
-- Matchmaking Studio - 允许红娘删除自己上传的客户
-- ============================================================

DROP POLICY IF EXISTS "admin可以删除客户" ON profiles;

CREATE POLICY "红娘可以删除自己的客户" ON profiles
  FOR DELETE USING (matchmaker_id = auth.uid() OR is_admin());
