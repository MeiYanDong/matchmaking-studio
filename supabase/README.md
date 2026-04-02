# Supabase Setup

## 1. 创建项目

在 [supabase.com](https://supabase.com) 创建新项目，获取以下配置填入 `.env.local`：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2. 运行迁移

在 Supabase Dashboard → SQL Editor 中，运行 `migrations/001_initial_schema.sql`

## 3. 配置 Storage Buckets

在 Supabase Dashboard → Storage 中创建：

### audio-files bucket（私有）
- Name: `audio-files`
- Public: false
- 添加 RLS Policy：
  ```sql
  -- 允许红娘上传
  CREATE POLICY "红娘可以上传音频" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');

  -- 允许红娘读取自己的文件
  CREATE POLICY "红娘可以读取音频" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-files' AND auth.role() = 'authenticated');
  ```

### profile-photos bucket（公开读）
- Name: `profile-photos`
- Public: true

## 4. 创建管理员账号

在 Supabase Dashboard → Authentication → Users 创建第一个用户，
然后在 SQL Editor 运行：
```sql
INSERT INTO user_roles (user_id, role, display_name)
VALUES ('your-user-id', 'admin', '管理员');
```
