# 婚恋匹配平台 - 可执行开发清单

> 基于 `docs/plan.md` 拆解的详细任务步骤
> 技术栈：Next.js 14 + Supabase + Tailwind + shadcn/ui + Whisper + Claude API

---

## Phase 1：MVP 核心流程

### 1. 项目初始化

- [ ] `npx create-next-app@latest marry2 --typescript --tailwind --app` 创建项目
- [ ] 安装依赖：`@supabase/supabase-js @supabase/ssr shadcn/ui lucide-react`
- [ ] 初始化 shadcn/ui：`npx shadcn@latest init`
- [ ] 安装常用组件：`button input card table badge tabs dialog form toast`
- [ ] 配置 `.env.local`：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- [ ] 创建 `lib/supabase/client.ts`（浏览器端 client）
- [ ] 创建 `lib/supabase/server.ts`（服务端 server client）
- [ ] 创建 `middleware.ts`（Supabase Auth session 刷新 + 路由保护）

---

### 2. Supabase 数据库表结构

#### 2.1 创建枚举类型

- [ ] 创建枚举 `gender_type`：`male`, `female`
- [ ] 创建枚举 `profile_status`：`active`, `inactive`, `matched`, `paused`
- [ ] 创建枚举 `education_level`：`high_school`, `associate`, `bachelor`, `master`, `phd`, `other`
- [ ] 创建枚举 `primary_intent`：`marriage`, `dating`, `fertility`
- [ ] 创建枚举 `conversation_status`：`pending`, `transcribing`, `extracting`, `done`, `failed`
- [ ] 创建枚举 `match_status`：`pending`, `reviewing`, `contacted_male`, `contacted_female`, `both_agreed`, `meeting_scheduled`, `met`, `succeeded`, `failed`, `dismissed`
- [ ] 创建枚举 `reminder_type`：`no_followup`, `no_new_info`, `meeting_reminder`
- [ ] 创建枚举 `user_role`：`admin`, `matchmaker`

#### 2.2 创建核心表

- [ ] 创建表 `user_roles`（user_id, role, display_name, created_at）
- [ ] 创建表 `profiles`（基础信息字段，含 matchmaker_id FK, gender, status, ai_summary, raw_notes 等）
- [ ] 创建表 `intentions`（profile_id 一对一，primary_intent, preferred_*, dealbreakers, tolerance_notes, implicit_intent_notes 等）
- [ ] 创建表 `conversations`（profile_id, audio_url, transcript, extracted_fields JSONB, status, reviewed_by 等）
- [ ] 创建表 `matches`（male_profile_id, female_profile_id, matchmaker_id, match_score, score_breakdown JSONB, match_reason, status, meeting_time 等）
- [ ] 创建表 `reminders`（matchmaker_id, profile_id, match_id, type, message, is_read 等）

#### 2.3 配置 RLS（行级安全策略）

- [ ] `profiles`：matchmaker 只能 SELECT/INSERT/UPDATE 自己的客户（`matchmaker_id = auth.uid()`）
- [ ] `intentions`：通过 profile_id 关联，matchmaker 只能访问自己客户的意图
- [ ] `conversations`：matchmaker 只能访问自己上传的记录（`matchmaker_id = auth.uid()`）
- [ ] `matches`：matchmaker 只能看涉及自己客户的匹配（male 或 female 属于自己）
- [ ] `reminders`：matchmaker 只能看发给自己的提醒（`matchmaker_id = auth.uid()`）
- [ ] `user_roles`：所有登录用户可读自己角色，admin 可读写全部
- [ ] 为 admin 角色创建 bypass RLS 的 Service Role 函数（或用 policy 判断角色）

#### 2.4 创建索引

- [ ] `profiles(matchmaker_id)` 索引
- [ ] `profiles(gender)` 索引
- [ ] `matches(male_profile_id)`, `matches(female_profile_id)` 索引
- [ ] `matches(status)` 索引
- [ ] `reminders(matchmaker_id, is_read)` 索引

#### 2.5 Supabase Storage

- [ ] 创建 bucket `audio-files`（私有，仅授权访问）
- [ ] 创建 bucket `profile-photos`（公开读，授权写）
- [ ] 配置 audio-files 的 RLS：matchmaker 只能上传/读取自己上传的文件

---

### 3. 认证系统

- [ ] 创建登录页 `app/(auth)/login/page.tsx`（邮箱 + 密码）
- [ ] 实现登录表单（使用 shadcn/ui Form + 调用 `supabase.auth.signInWithPassword`）
- [ ] 实现登出功能（Server Action）
- [ ] 创建 `lib/auth/get-user-role.ts`：从 `user_roles` 获取当前用户角色
- [ ] 在 `middleware.ts` 中实现角色路由守卫：
  - `/matchmaker/*` → 需要 `matchmaker` 或 `admin` 角色
  - `/admin/*` → 需要 `admin` 角色
  - 未登录自动跳转 `/login`
- [ ] 创建 Layout：`app/(matchmaker)/layout.tsx`（侧边栏导航）
- [ ] 创建 Layout：`app/(admin)/layout.tsx`（侧边栏导航）
- [ ] 侧边栏导航组件 `components/nav/sidebar.tsx`（根据角色显示不同菜单项）

---

### 4. 客户管理（红娘端核心）

#### 4.1 客户列表页 `/matchmaker/clients`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/clients/page.tsx`
- [ ] 实现客户列表数据获取（Server Component，从 `profiles` 表拉取当前红娘的客户）
- [ ] 创建客户卡片组件 `components/client/client-card.tsx`（展示：姓名、性别标签、年龄、城市、意图、状态徽章）
- [ ] 实现性别/意图/状态筛选 Tab（客户端交互）
- [ ] 添加"新增客户"按钮，跳转 `/matchmaker/clients/new`

#### 4.2 新增客户页 `/matchmaker/clients/new`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/clients/new/page.tsx`
- [ ] 创建表单组件 `components/client/new-client-form.tsx`
  - [ ] 字段：姓名、性别（radio）、手机号（红娘内部备注）、备注
  - [ ] 提交后创建 profile 记录，跳转到客户详情页
- [ ] 创建 Server Action `actions/clients.ts`：`createClient()`

#### 4.3 客户详情页 `/matchmaker/clients/[id]`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/clients/[id]/page.tsx`
- [ ] 实现 Tab 导航：基本信息 / 匹配推荐 / 录音记录 / 跟进记录
- [ ] **Tab 1 - 基本信息**
  - [ ] 展示 `profiles` + `intentions` 所有字段
  - [ ] 支持内联编辑（点击字段进入编辑态，保存调用 Server Action）
  - [ ] 信息卡预览组件 `components/client/profile-card.tsx`
- [ ] **Tab 2 - 匹配推荐**
  - [ ] 展示 `matches` 表中与此客户相关的推荐列表
  - [ ] 每条显示：对方信息卡缩略、匹配分、分项得分条形图、AI 匹配理由
  - [ ] 操作按钮：跟进（更新 status → reviewing）/ 放弃（弹窗填原因）
- [ ] **Tab 3 - 录音记录**
  - [ ] 展示 `conversations` 历史列表（时间、状态、转录摘要）
  - [ ] 点击查看详情（转录全文 + 提取字段）
  - [ ] 上传新录音入口（跳转上传流程）
- [ ] **Tab 4 - 跟进记录**
  - [ ] 以时间线形式展示所有 match 的状态变更历史
- [ ] 创建 Server Actions：`updateProfile()`, `updateIntention()`, `dismissMatch()`

---

### 5. 语音上传与 AI 处理流程

#### 5.1 上传页面 `/matchmaker/clients/[id]/upload`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/clients/[id]/upload/page.tsx`
- [ ] 创建上传组件 `components/upload/audio-uploader.tsx`
  - [ ] 支持拖拽 + 点击上传
  - [ ] 文件格式限制：mp3/m4a/wav/ogg
  - [ ] 文件大小限制：100MB
  - [ ] 上传前预览：文件名、大小、时长（HTML5 Audio API）
- [ ] 实现文件上传到 Supabase Storage（`audio-files` bucket）
- [ ] 上传完成后，在 `conversations` 表创建记录（status: `pending`）
- [ ] 触发处理 Pipeline（调用 API Route）
- [ ] 实时显示处理进度（轮询 `conversations.status`，每 3 秒一次）

#### 5.2 Whisper 转录 API

- [ ] 创建 API Route `app/api/transcribe/route.ts`
  - [ ] 接收 `conversation_id`
  - [ ] 从 Supabase Storage 下载音频文件
  - [ ] 调用 OpenAI Whisper API（`whisper-1` 模型，language: `zh`）
  - [ ] 将转录文本写回 `conversations.transcript`
  - [ ] 更新 status → `extracting`
  - [ ] 自动触发下一步（调用 Claude 提取 API）
  - [ ] 失败时更新 status → `failed`，记录 error_message

#### 5.3 Claude 结构化提取 API

- [ ] 创建 API Route `app/api/extract/route.ts`
  - [ ] 接收 `conversation_id`
  - [ ] 读取 `conversations.transcript`
  - [ ] 构建结构化提取 Prompt（见下）
  - [ ] 调用 Claude API（`claude-sonnet-4-6`）
  - [ ] 解析返回的 JSON
  - [ ] 将结果写入 `conversations.extracted_fields`（JSONB）
  - [ ] 无法结构化的内容写入 `conversations.extraction_notes`
  - [ ] 更新 status → `done`
- [ ] 编写 Claude 提取 Prompt `lib/prompts/extract-profile.ts`
  - [ ] 系统提示：角色定义为婚恋信息提取专家
  - [ ] 明确要求输出标准 JSON 格式（包含 profiles / intentions / raw_notes 三个部分）
  - [ ] 对无法归类的内容统一放入 `raw_notes` 字段，不丢弃
  - [ ] 处理模糊表达（如"收入还不错"→ 提取为区间估计并标注不确定）

#### 5.4 字段审核页 `/matchmaker/clients/[id]/conversations/[cid]/review`

- [ ] 创建审核页面
- [ ] 布局：左侧转录文本（可滚动高亮） / 右侧结构化字段编辑表单
- [ ] 底部展示 `extraction_notes`（raw_notes 区域）
- [ ] 每个字段支持编辑（AI 提取值作为默认值）
- [ ] "确认并同步"按钮：
  - [ ] 将字段写入 `profiles` / `intentions` 表（合并更新，不覆盖已有值除非红娘明确修改）
  - [ ] 标记 `conversations.reviewed_at`
  - [ ] 触发匹配引擎

---

### 6. 匹配引擎

#### 6.1 匹配评分函数

- [ ] 创建 `lib/matching/score.ts` 匹配评分模块
  - [ ] `intentCompatible(a, b)` → boolean（硬性过滤：意图必须兼容）
  - [ ] `checkDealbreakers(a, b)` → boolean（硬性过滤：dealbreakers 冲突则排除）
  - [ ] `scoreIntent(a, b)` → 0-40（意图兼容度，40% 权重）
  - [ ] `scoreCity(a, b)` → 0-20（地域匹配，20% 权重）
  - [ ] `scoreAge(a, b)` → 0-15（年龄区间交叉，15% 权重）
  - [ ] `scoreIncome(a, b)` → 0-15（收入期望匹配，15% 权重）
  - [ ] `scoreTolerance(a, b)` → 0-10（容忍边界交叉，10% 权重）
  - [ ] `calculateMatchScore(male, female)` → `{ total, breakdown, passed }`

#### 6.2 匹配引擎 API

- [ ] 创建 API Route `app/api/match/route.ts`
  - [ ] 接收 `profile_id`（新增/更新的客户）
  - [ ] 获取该客户的 gender 和完整 intentions
  - [ ] 拉取所有异性且 status 为 `active` 的客户
  - [ ] 对每个异性客户运行 `calculateMatchScore`
  - [ ] 过滤掉未通过硬性条件的配对
  - [ ] 对通过且 score > 60 的配对，写入或更新 `matches` 表
  - [ ] 低于阈值或硬性过滤的配对，不写入
  - [ ] 返回生成的匹配数量

#### 6.3 匹配理由生成

- [ ] 在 API Route 中，对评分 > 75 的高质量匹配，调用 Claude 生成 `match_reason`（自然语言描述为什么这对配对合适）
- [ ] 将 `match_reason` 写入 `matches` 表

---

### 7. 红娘匹配工作台

#### 7.1 匹配列表页 `/matchmaker/matches`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/matches/page.tsx`
- [ ] 实现匹配列表数据获取（涉及自己客户的所有 matches）
- [ ] 创建匹配卡片组件 `components/match/match-card.tsx`
  - [ ] 展示：男方缩略信息 + 女方缩略信息 + 匹配分徽章 + 当前状态
  - [ ] 分项得分可视化（小型进度条）
- [ ] 实现状态 Tab 筛选：全部 / 待处理 / 跟进中 / 已约谈 / 已完成
- [ ] 按匹配分倒序排列

#### 7.2 匹配详情页 `/matchmaker/matches/[id]`

- [ ] 创建页面 `app/(matchmaker)/matchmaker/matches/[id]/page.tsx`
- [ ] 左侧：男方完整信息卡
- [ ] 右侧：女方完整信息卡
- [ ] 中间：匹配评分详情 + AI 匹配理由
- [ ] 底部：跟进操作区
  - [ ] 状态流转按钮（根据当前状态显示下一步操作）
  - [ ] 备注输入框
  - [ ] 约谈时间选择器（DateTimePicker）
  - [ ] 约谈地点输入框
  - [ ] 见面结果记录
- [ ] 创建 Server Action `actions/matches.ts`：`updateMatchStatus()`, `addMatchNote()`

---

### 8. 提醒系统（基础版）

- [ ] 创建提醒生成函数 `lib/reminders/generate.ts`
  - [ ] `checkNoFollowup()`：查询超过 7 天未更新的 active matches，生成提醒
  - [ ] `checkNoNewInfo()`：查询超过 30 天无新对话的客户，生成提醒
  - [ ] `checkMeetingReminder()`：查询 24 小时内有 meeting_time 的 matches，生成提醒
- [ ] 创建 API Route `app/api/reminders/generate/route.ts`（供定时任务调用）
- [ ] 创建提醒中心页面 `/matchmaker/reminders`
  - [ ] 列表展示未读提醒
  - [ ] 点击标记已读
  - [ ] 点击跳转到对应客户/匹配页
- [ ] 在侧边栏导航显示未读提醒数量角标

---

## Phase 2：运营完善

### 9. 管理者端

#### 9.1 总览看板 `/admin/dashboard`

- [ ] 创建页面 `app/(admin)/admin/dashboard/page.tsx`
- [ ] 数据统计卡片组件 `components/admin/stat-card.tsx`
  - [ ] 男方客户总数 / 女方客户总数
  - [ ] 本月新增用户
  - [ ] 活跃匹配数
  - [ ] 匹配成功数
  - [ ] 红娘数量 + 平均客户数
- [ ] 新增用户趋势折线图（按周，使用 recharts 或 shadcn chart）
- [ ] 匹配漏斗图（推荐 → 跟进 → 约谈 → 成功）
- [ ] 红娘工作量排行表

#### 9.2 用户管理页 `/admin/clients`

- [ ] 创建页面 `app/(admin)/admin/clients/page.tsx`
- [ ] 跨红娘查看所有客户档案（使用 Service Role）
- [ ] 实现搜索：姓名模糊搜索
- [ ] 实现筛选：性别 / 城市 / 意图 / 状态 / 负责红娘
- [ ] 实现重新分配红娘（下拉选择 + 确认对话框）

#### 9.3 红娘管理页 `/admin/matchmakers`

- [ ] 创建页面 `app/(admin)/admin/matchmakers/page.tsx`
- [ ] 红娘列表：姓名、邮箱、客户数、活跃匹配数、本月成功数
- [ ] 新增红娘：弹窗表单（邮箱 + 姓名），调用 Supabase Admin API 创建用户，插入 `user_roles`
- [ ] 禁用/启用红娘账号

#### 9.4 匹配管理页 `/admin/matches`

- [ ] 创建页面 `app/(admin)/admin/matches/page.tsx`
- [ ] 查看全部匹配记录（含所有状态）
- [ ] 支持修改匹配状态
- [ ] 支持重新分配负责红娘

---

### 10. 信息卡完整设计

- [ ] 优化 `components/client/profile-card.tsx` 为完整设计稿
  - [ ] 照片展示区（支持无照片占位符）
  - [ ] 基础信息区（姓名/年龄/城市/学历/职业/年薪/身高/体重）
  - [ ] 意图区（主意图 + 期望对方条件 + 硬性要求）
  - [ ] AI 综合描述区（ai_summary）
  - [ ] Raw notes 折叠展示（红娘内部可见）
- [ ] 支持打印/导出信息卡（CSS print 样式）

---

### 11. 匹配引擎优化

- [ ] 基于历史跟进结果调整权重
  - [ ] 统计不同 `dismissed_reason` 的分布
  - [ ] 统计 `succeeded` 的配对特征
  - [ ] 手动在代码中调整权重参数（V1 不做自动学习）
- [ ] 支持手动触发重新匹配（admin 端：针对单个客户或全量重跑）
- [ ] 匹配阈值可配置（admin 端配置项：当前写死 60 分）

---

## Phase 3：用户端扩展

### 12. 用户端（V2）

- [ ] 用户登录页（独立入口）
- [ ] 用户查看自己的信息卡（只读）
- [ ] 用户 AI 对话筛选对象
  - [ ] 接入 Claude API，理解用户自然语言偏好
  - [ ] 基于对话动态筛选 `profiles` 推荐
  - [ ] 以信息卡格式展示推荐结果
- [ ] 用户自助筛选页（卡片流 + 条件筛选）

---

## 通用任务

### 错误处理与体验

- [ ] 全局 Toast 通知（shadcn/ui Toaster）
- [ ] API 失败统一 error boundary
- [ ] 语音处理失败时，提供重试按钮
- [ ] 表单 loading 状态（按钮 spinner）
- [ ] 空状态设计（无客户、无匹配、无提醒时的占位提示）

### 代码质量

- [ ] 配置 TypeScript 严格模式
- [ ] 创建 Supabase 类型生成脚本（`supabase gen types typescript`）
- [ ] 创建 `types/database.ts`（从 Supabase 生成的类型）
- [ ] 创建 `types/app.ts`（业务层自定义类型）

### 部署

- [ ] 配置 Vercel 项目（关联 GitHub 仓库）
- [ ] 在 Vercel 配置所有环境变量
- [ ] 配置 Supabase Edge Functions 的环境变量（OPENAI_API_KEY / ANTHROPIC_API_KEY）
- [ ] 设置提醒生成的定时任务（Vercel Cron Jobs，每天早上 9:00 触发）
- [ ] 配置生产环境 Supabase 项目（与开发环境隔离）
