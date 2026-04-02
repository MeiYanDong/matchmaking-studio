# 部署说明

## Vercel

1. 创建 Vercel 项目并关联当前 GitHub 仓库。
2. 在 Vercel 项目中配置以下环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - AI 鉴权二选一：
     - `API_KEY`（走 `docs/API/*` 中的聚合网关，共用同一把 key）
     - 或按模型拆分：
       - `marry_whisper_YUNWU_API_KEY`
       - `marry_claude_YUNWU_API_KEY`
     - 或 `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`（直连官方 SDK）
   - 可选：`AI_API_BASE_URL`（默认 `https://yunwu.ai`）
   - 可选：`CLAUDE_DEFAULT_MODEL`（默认 `claude-sonnet-4-20250514`）
   - `CRON_SECRET`
3. `vercel.json` 已配置每日北京时间 09:00 对应的 Cron：
   - UTC 时间为 `01:00`
   - 目标接口为 `/api/reminders/generate`
4. 本轮 AI-first 重构后，生产环境需要确保最新构建产物包含：
   - `followup_tasks` 补问任务列表与提醒入口
   - `pending_confirmation` 候选展示
   - 管理端字段完整度与敏感模式统计面板
   - `npm test` 与 `npm run build` 均通过后再发版

## Supabase

1. 执行 `supabase/migrations/001_initial_schema.sql`
2. 执行 `supabase/migrations/002_product_extensions.sql`
3. 执行 `supabase/migrations/003_profile_hobbies.sql`
4. 执行 `supabase/migrations/004_profile_intention_extensions.sql`
5. 执行 `supabase/migrations/005_ai_first_matching_rebuild.sql`
6. `005_ai_first_matching_rebuild.sql` 会新增或调整：
   - 新枚举：`relationship_mode`、`tri_state`、`recommendation_type`、`followup_task_type`、`followup_task_status`、`importance_level`
   - 新表：`trait_profiles`、`followup_tasks`
   - 扩展表：`profiles`、`intentions`、`conversations`、`matches`
   - 新索引与 RLS：`trait_profiles`、`followup_tasks`、`pending_confirmation` 相关查询
7. 在生产环境 Supabase 项目中同步以下配置：
   - Auth 邮箱登录
   - Storage buckets：`audio-files`、`profile-photos`
   - AI keys：`API_KEY`，或 `marry_whisper_YUNWU_API_KEY` / `marry_claude_YUNWU_API_KEY`，或 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
   - 确认 service-role 可访问 `trait_profiles`、`followup_tasks`，用于提醒生成和全量匹配
8. 新版提醒 cron 会额外生成：
   - `pending_confirmation` 类型提醒
   - 与 `followup_tasks` 对应的待补问提醒

## 类型生成

本地安装 Supabase CLI 后，可以执行：

```bash
npm run typegen
```

生成最新的数据库类型文件。
