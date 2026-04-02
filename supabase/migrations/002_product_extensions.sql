-- ============================================================
-- Matchmaking Studio - 产品扩展
-- ============================================================

-- 客户账号绑定
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 用户端只读访问
CREATE POLICY "用户可以查看自己的档案" ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "用户可以查看自己的意图" ON intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = intentions.profile_id
        AND profiles.auth_user_id = auth.uid()
    )
  );

-- 匹配配置
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin可以查看配置" ON app_settings
  FOR SELECT USING (is_admin());

CREATE POLICY "admin可以管理配置" ON app_settings
  FOR ALL USING (is_admin());

INSERT INTO app_settings (key, value, description)
VALUES ('matching', '{"threshold": 60}', '匹配引擎相关配置')
ON CONFLICT (key) DO NOTHING;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "红娘上传自己的音频文件" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audio-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "红娘读取自己的音频文件" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'audio-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "红娘更新自己的音频文件" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'audio-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "红娘上传资料照片" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "认证用户读取资料照片" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos');

CREATE POLICY "红娘更新资料照片" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
