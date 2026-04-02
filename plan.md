# Matchmaking Studio - 详细需求方案

> 版本：V1.0
> 日期：2026-04-01
> 核心定位：以红娘为操作主体的婚恋匹配管理平台

---

## 一、产品定位与核心理念

### 1.1 产品定位

一个服务于红娘（婚介从业者）和管理者的婚恋匹配后台平台。平台的核心价值是：

- **降低红娘信息管理成本**：语音对话自动结构化，红娘无需手动录入
- **提升匹配精准度**：AI 基于双边意图做匹配，而非简单条件筛选
- **让红娘专注于维护关系**：数据、提醒、匹配推荐由平台处理，红娘只需跟进

### 1.2 核心理念

- 用户（男/女方客户）**无需操作平台**，只需专注与红娘聊天
- 红娘**无需手动录入数据**，只需上传对话录音，AI 自动处理
- 平台**管好数据与推荐**，红娘**管好关系与跟进**
- 所有匹配后的沟通发生在**线下**，平台不做 IM

### 1.3 第一版边界（V1 Scope）

| 有 | 没有 |
|---|---|
| 红娘端（核心） | 用户端（V2再做）|
| 管理者端 | 平台内聊天（IM）|
| 语音上传 + AI结构化 | 实时录音 |
| AI匹配推荐 | 支付系统 |
| 红娘跟进工作台 | 用户自助筛选 |

---

## 二、角色定义

### 2.1 红娘（Matchmaker）

- 平台的**核心操作者**
- 负责与男/女方客户进行语音沟通，上传录音至平台
- 查看 AI 匹配推荐，决定是否跟进
- 记录跟进状态、约谈安排、见面结果
- 管理自己名下的所有客户档案

### 2.2 管理者（Admin）

- 平台的**全局监控者**
- 查看所有用户档案、红娘工作量、匹配漏斗数据
- 分配客户给红娘
- 查看平台整体运营状态

### 2.3 客户（User / Client）

- **V1 不登录平台**，信息全由红娘代录
- 分为男方（Male）和女方（Female）两类
- 数据来源：红娘与客户的语音对话

---

## 三、核心数据模型（Supabase 表结构）

### 3.1 用户档案表 `profiles`

存储客户的基础个人信息。

```sql
profiles
├── id                    UUID, PK
├── created_at            TIMESTAMP
├── updated_at            TIMESTAMP
├── matchmaker_id         UUID, FK → auth.users (负责红娘)
├── gender                ENUM('male', 'female')
├── status                ENUM('active', 'inactive', 'matched', 'paused')

-- 基础信息
├── name                  TEXT                  -- 姓名
├── age                   INTEGER               -- 年龄
├── height                INTEGER               -- 身高(cm)
├── weight                INTEGER               -- 体重(kg)
├── city                  TEXT                  -- 所在城市
├── hometown              TEXT                  -- 户籍/老家
├── education             ENUM(...)             -- 学历：高中/专科/本科/硕士/博士
├── occupation            TEXT                  -- 职业/行业
├── job_title             TEXT                  -- 具体职位
├── phone                 TEXT                  -- 联系方式（仅供红娘内部使用）
├── annual_income         INTEGER               -- 年薪（万元）
├── income_range          ENUM(...)             -- 收入区间（用于展示，可不精确）
├── assets                TEXT                  -- 房产/车/其他资产（自由文本）
├── appearance_score      INTEGER               -- 颜值评分 1-10（红娘主观）
├── photo_urls            TEXT[]                -- 照片 URL 数组
├── hobbies               TEXT[]                -- 兴趣爱好标签数组
├── marital_history       TEXT                  -- 婚史（未婚 / 离异 / 丧偶等）
├── has_children          BOOLEAN               -- 是否有孩子
├── children_notes        TEXT                  -- 孩子情况说明（是否同住、年龄等）
├── lifestyle_tags        TEXT[]                -- 生活方式标签（爱运动 / 宅 / 规律等）
├── personality_tags      TEXT[]                -- 性格标签（慢热 / 外向 / 稳重等）
├── smoking               BOOLEAN               -- 是否吸烟
├── drinking              BOOLEAN               -- 是否饮酒
├── family_burden_notes   TEXT                  -- 家庭责任/经济压力说明
├── parental_involvement  TEXT                  -- 父母介入程度说明
├── seriousness_score     INTEGER               -- 找对象认真程度 1-10（红娘判断）
├── followup_strategy     TEXT                  -- 红娘建议推进方式
├── hidden_expectations   TEXT                  -- 隐性期待 / 没明说但很在意的点

-- AI 摘要
├── ai_summary            TEXT                  -- AI 生成的人物综合描述
├── raw_notes             TEXT                  -- 无法结构化的原始语音内容
```

### 3.2 意图与偏好表 `intentions`

存储客户的核心意图、对对方的要求，以及容忍边界。**这是匹配引擎的核心输入。**

```sql
intentions
├── id                    UUID, PK
├── profile_id            UUID, FK → profiles (一对一)
├── updated_at            TIMESTAMP

-- 主意图（核心字段）
├── primary_intent        ENUM('marriage', 'dating', 'fertility')
│                         -- marriage: 结婚
│                         -- dating: 恋爱（用户间有付费约定，平台只记录）
│                         -- fertility: 以生育为目标（愿意为此付出更高成本）
├── intent_notes          TEXT                  -- 意图的补充说明（AI提取）

-- 对对方的期望（硬性条件）
├── preferred_age_min     INTEGER               -- 期望对方最小年龄
├── preferred_age_max     INTEGER               -- 期望对方最大年龄
├── preferred_height_min  INTEGER               -- 期望身高下限
├── preferred_cities      TEXT[]                -- 可接受的城市列表
├── preferred_education   ENUM[]                -- 可接受的学历列表
├── preferred_income_min  INTEGER               -- 期望对方最低年收入（万）
├── dealbreakers          TEXT[]                -- 绝对不接受的条件（硬性过滤）

-- 容忍边界（软性条件）
├── tolerance_notes       TEXT                  -- AI提取的容忍说明（自由文本）
├── acceptable_conditions TEXT[]                -- 可接受但不理想的条件

-- 对异地的态度
├── accepts_long_distance BOOLEAN               -- 是否接受异地
├── long_distance_notes   TEXT                  -- 异地容忍度说明

-- 推进与现实偏好
├── fertility_preference            TEXT        -- 生育意愿与时间窗口
├── settle_city_preferences         TEXT[]      -- 未来定居城市偏好
├── relocation_willingness          BOOLEAN     -- 是否愿意迁居
├── accepts_partner_marital_history TEXT[]      -- 可接受的对方婚史
├── accepts_partner_children        BOOLEAN     -- 是否接受对方有孩子
├── relationship_pace               TEXT        -- 希望推进节奏（慢热/尽快见面等）
├── communication_style             TEXT        -- 偏好的沟通方式/相处风格
├── biggest_concerns                TEXT[]      -- 当前最大顾虑

-- 隐性意图（AI从语音中提取，用户未明说）
├── implicit_intent_notes TEXT                  -- 红娘/AI判断的隐性需求
```

### 3.3 语音记录表 `conversations`

每次红娘上传一段语音，生成一条记录。

```sql
conversations
├── id                    UUID, PK
├── created_at            TIMESTAMP
├── profile_id            UUID, FK → profiles
├── matchmaker_id         UUID, FK → auth.users

-- 语音文件
├── audio_url             TEXT                  -- Supabase Storage 中的文件路径
├── audio_duration        INTEGER               -- 时长（秒）

-- 处理状态
├── status                ENUM('pending', 'transcribing', 'extracting', 'done', 'failed')
├── error_message         TEXT                  -- 失败原因

-- 处理结果
├── transcript            TEXT                  -- Whisper 转录的原文
├── extracted_fields      JSONB                 -- AI 提取的结构化字段（用于审核前预览）
├── extraction_notes      TEXT                  -- AI 无法结构化的内容（存入 raw_notes）
├── reviewed_by           UUID, FK → auth.users -- 审核确认的红娘
├── reviewed_at           TIMESTAMP
```

### 3.4 匹配记录表 `matches`

AI 系统生成的匹配推荐，红娘在此基础上跟进。

```sql
matches
├── id                    UUID, PK
├── created_at            TIMESTAMP
├── updated_at            TIMESTAMP

-- 匹配双方
├── male_profile_id       UUID, FK → profiles
├── female_profile_id     UUID, FK → profiles
├── matchmaker_id         UUID, FK → auth.users  -- 负责跟进的红娘（可能是其中一方的红娘）

-- AI 匹配结果
├── match_score           FLOAT                 -- 综合匹配分 0-100
├── score_breakdown       JSONB                 -- 各维度分项得分
│   -- {intent: 90, city: 70, age: 85, income: 60, tolerance: 75}
├── match_reason          TEXT                  -- AI 生成的匹配理由说明

-- 红娘跟进状态
├── status                ENUM(
│       'pending',        -- AI推荐，待红娘查看
│       'reviewing',      -- 红娘正在评估
│       'contacted_male', -- 已联系男方
│       'contacted_female',-- 已联系女方
│       'both_agreed',    -- 双方同意见面
│       'meeting_scheduled', -- 已安排约谈
│       'met',            -- 已见面
│       'succeeded',      -- 匹配成功（在一起/结婚）
│       'failed',         -- 匹配失败
│       'dismissed'       -- 红娘放弃此推荐
│   )
├── matchmaker_notes      TEXT                  -- 红娘跟进备注
├── meeting_time          TIMESTAMP             -- 约谈时间
├── meeting_location      TEXT                  -- 约谈地点
├── outcome_notes         TEXT                  -- 见面结果记录
├── dismissed_reason      TEXT                  -- 放弃原因
```

### 3.5 提醒记录表 `reminders`

系统自动生成的提醒，推送给红娘。

```sql
reminders
├── id                    UUID, PK
├── created_at            TIMESTAMP
├── matchmaker_id         UUID, FK → auth.users
├── profile_id            UUID, FK → profiles   -- 涉及的客户
├── match_id              UUID, FK → matches    -- 涉及的匹配（可为空）
├── type                  ENUM(
│       'no_followup',    -- 某个匹配长时间没有跟进
│       'no_new_info',    -- 某个客户长时间没有新录音
│       'meeting_reminder'-- 约谈提醒
│   )
├── message               TEXT                  -- 提醒内容
├── is_read               BOOLEAN DEFAULT false
├── read_at               TIMESTAMP
```

### 3.6 系统用户表（Supabase Auth 扩展）`user_roles`

```sql
user_roles
├── user_id               UUID, FK → auth.users
├── role                  ENUM('admin', 'matchmaker')
├── display_name          TEXT
├── created_at            TIMESTAMP
```

---

## 四、AI 处理流程（语音 → 结构化数据）

### 4.1 完整 Pipeline

```
Step 1: 红娘上传音频文件
         → Supabase Storage 存储
         → conversations 表创建记录（status: pending）

Step 2: 触发 Edge Function（whisper-transcribe）
         → 调用 OpenAI Whisper API
         → 返回转录文本
         → 更新 conversations.transcript
         → status: extracting

Step 3: 触发 Edge Function（claude-extract）
         → 将转录文本发送给 Claude API
         → 使用结构化 Prompt 提取字段
         → 返回 JSON（对应 profiles + intentions 字段）
         → 无法结构化的内容存入 extraction_notes
         → 更新 conversations.extracted_fields
         → status: done

Step 4: 红娘在平台审核提取结果
         → 确认/修正 AI 提取的字段
         → 一键同步到 profiles / intentions 表
         → 标记 conversations.reviewed_at

Step 5: 触发匹配引擎
         → 新增/更新 profile 后自动触发
         → 重新计算与所有异性用户的匹配分
         → 写入 matches 表（score > 阈值才写入）
```

### 4.2 Claude 结构化提取 Prompt 设计

Claude 接收转录文本后，按以下逻辑提取：

```
输入：红娘与客户的对话文字
输出：{
  profiles: { name, age, height, weight, city, education, occupation, annual_income, ... },
  intentions: { primary_intent, preferred_age_min/max, dealbreakers, tolerance_notes, ... },
  raw_notes: "无法归类到字段的内容，保留原文"
}
```

**无法结构化的内容处理原则：**
- 不丢弃，存入 `conversations.extraction_notes` 和 `profiles.raw_notes`
- AI 生成自由文本摘要存入 `profiles.ai_summary`
- 红娘审核时可以看到原文，手动决定如何处理

### 4.3 匹配引擎评分逻辑

匹配分 = 各维度加权求和，满分 100。

| 维度 | 权重 | 说明 |
|---|---|---|
| 意图兼容性 | 40% | 双方主意图必须兼容，否则直接过滤（不进入推荐）|
| 城市/地域 | 20% | 同城 > 同省 > 跨省，参考 accepts_long_distance |
| 年龄匹配 | 15% | 双方偏好年龄区间是否交叉 |
| 收入/资产 | 15% | 参考双方对收入的期望 |
| 容忍边界 | 10% | 软性条件的交叉度 |

**硬性过滤（dealbreakers）：** 任意一方的 dealbreakers 与对方条件冲突，直接排除，不进入推荐列表。

---

## 五、页面与功能设计

### 5.1 红娘端

#### 5.1.1 客户列表页 `/matchmaker/clients`

- 展示我管理的所有客户（男/女分标签）
- 每个客户显示：姓名、性别、年龄、城市、意图、最近跟进时间、当前匹配状态
- 支持按性别、意图、状态筛选
- 点击进入客户详情页
- 右上角按钮：新增客户（进入录音上传流程）

#### 5.1.2 新增客户 / 上传录音页 `/matchmaker/clients/new`

**流程：**
1. 填写客户基础信息（姓名、性别、联系方式——仅供红娘使用）
2. 上传音频文件（支持 mp3/m4a/wav，最大 100MB）
3. 提交后显示处理进度（转录中 → 提取中 → 完成）
4. 完成后跳转到字段审核页

#### 5.1.3 字段审核页 `/matchmaker/clients/:id/review`

- 左侧：原始转录文本（完整展示）
- 右侧：AI 提取的结构化字段（可逐项编辑）
- 底部：AI 无法归类的 raw_notes（红娘可决定忽略或手动归类）
- 确认按钮：同步到 Profile
- 支持追加上传（同一个客户后续新增录音，AI 增量更新字段）

#### 5.1.4 客户详情页 `/matchmaker/clients/:id`

Tab 1：**基本信息**
- 展示 profiles + intentions 的所有字段
- 支持手动编辑
- 显示信息卡预览

Tab 2：**匹配推荐**
- 展示 AI 为此客户推荐的异性列表
- 每条推荐显示：匹配分、分项得分、AI 匹配理由
- 操作按钮：跟进 / 放弃（填写原因）

Tab 3：**录音记录**
- 历史上传的所有录音及提取结果

Tab 4：**跟进记录**
- 所有 match 的跟进状态时间线

#### 5.1.5 匹配工作台 `/matchmaker/matches`

- 展示所有需要跟进的匹配推荐（按优先级排序）
- 状态筛选：待处理 / 跟进中 / 已约谈 / 已完成
- 每条匹配展示：男方简要信息 + 女方简要信息 + 匹配分 + 当前状态
- 点击进入匹配详情（可更新状态、填写备注、记录约谈时间）

#### 5.1.6 提醒中心 `/matchmaker/reminders`

- 列表展示所有未读提醒
- 类型：长时间未跟进的匹配 / 长时间没有新录音的客户 / 约谈时间提醒
- 点击标记已读，点击跳转到对应客户/匹配页

---

### 5.2 管理者端

#### 5.2.1 总览看板 `/admin/dashboard`

核心数据卡片：
- 用户总数（男/女分开）
- 本月新增用户数
- 活跃匹配数（status 非 failed/dismissed）
- 匹配成功数（status = succeeded）
- 红娘数量 + 平均客户数/人

图表：
- 新增用户趋势（按周）
- 匹配漏斗（推荐 → 跟进 → 约谈 → 成功）
- 红娘工作量排行

#### 5.2.2 用户管理页 `/admin/clients`

- 查看所有客户档案（跨红娘）
- 支持搜索、筛选（性别、城市、意图、状态、负责红娘）
- 支持重新分配负责红娘

#### 5.2.3 红娘管理页 `/admin/matchmakers`

- 查看所有红娘的工作数据
- 每位红娘：客户数、活跃匹配数、本月成功数
- 支持新增/禁用红娘账号

#### 5.2.4 匹配管理页 `/admin/matches`

- 查看全部匹配记录
- 可以介入修改匹配状态或重新分配负责红娘

---

## 六、信息卡设计

信息卡是客户档案的对外展示格式，V1 主要用于红娘内部查看推荐时使用。

### 信息卡包含字段

```
┌─────────────────────────────────────┐
│  [照片]   姓名（脱敏/匿名可选）        │
│           年龄 · 城市 · 学历          │
├─────────────────────────────────────┤
│  职业：XX    年薪：约 XX 万           │
│  身高：XXcm  体重：XXkg              │
├─────────────────────────────────────┤
│  意图：结婚 / 恋爱 / 生育目标         │
│  期望对方：年龄 XX-XX 岁，城市 XX     │
│  硬性要求：...                        │
├─────────────────────────────────────┤
│  AI 综合描述：                        │
│  （ai_summary 自由文本）              │
└─────────────────────────────────────┘
```

---

## 七、提醒规则

| 触发条件 | 提醒对象 | 提醒内容 |
|---|---|---|
| 某匹配超过 7 天无跟进动作 | 负责红娘 | "你与XX/XX的匹配已7天未跟进，是否需要联系？" |
| 某客户超过 30 天无新录音 | 负责红娘 | "XX的信息已30天未更新，是否需要约谈？" |
| 约谈时间前 24 小时 | 负责红娘 | "明天 XX 时，你安排了 XX 与 XX 的约谈" |

提醒以平台内通知形式展示，V1 不做短信/微信推送。

---

## 八、技术架构

### 8.1 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 16 (App Router) |
| UI 组件 | Tailwind CSS + shadcn/ui |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth（角色：admin / matchmaker）|
| 文件存储 | Supabase Storage（音频文件 + 照片）|
| 语音转文字 | OpenAI Whisper API |
| AI 结构化 + 匹配理由 | Claude API (claude-sonnet-4-6) |
| 后端逻辑 | Supabase Edge Functions |
| 匹配引擎触发 | Supabase Database Webhooks → Edge Function |

### 8.2 部署结构

```
Vercel（Next.js 前端）
  ↕
Supabase（DB + Auth + Storage + Edge Functions）
  ↕
外部 API：OpenAI Whisper + Anthropic Claude
```

### 8.3 权限控制（RLS）

- `profiles`：matchmaker 只能读写自己名下的客户
- `matches`：matchmaker 只能看涉及自己客户的匹配
- `conversations`：matchmaker 只能看自己上传的记录
- admin：所有表全读写权限

---

## 九、开发阶段规划

### Phase 1（MVP 核心流程）
1. Supabase 表结构创建 + RLS 配置
2. 认证系统（登录 + 角色区分）
3. 客户列表页 + 客户详情页（手动填写信息）
4. 语音上传 + Whisper 转录
5. Claude 结构化提取 + 字段审核页
6. 基础匹配引擎（评分计算）
7. 红娘匹配工作台（查看推荐 + 更新状态）

### Phase 2（完善运营）
1. 管理者看板
2. 提醒系统
3. 信息卡完整设计
4. 匹配引擎优化（基于跟进结果反馈调整权重）

### Phase 3（用户端扩展）
1. 用户登录查看自己的信息卡
2. 用户 AI 对话筛选对象
3. 用户自助筛选卡片流

---

## 十、关键设计决策记录

| 决策       | 结论                           | 原因                 |
| -------- | ---------------------------- | ------------------ |
| 用户端      | V1 不做                        | 以红娘为核心，减少复杂度       |
| 信息录入方式   | 全由红娘代录                       | 用户只需专注与红娘聊天        |
| 语音上传方式   | 红娘事后上传文件                     | V1 简单可靠，实时录音 V2 再做 |
| 匹配主体     | AI系统匹配，红娘跟进                  | 提升效率，但保留人工判断       |
| 付费约定     | 用户间约定，平台只记录意图                | 平台不介入金融交易          |
| 用户间沟通    | 线下                           | 平台不做 IM            |
| 无法结构化的内容 | 存 raw_notes + ai_summary，不丢弃 | 保留完整信息供红娘参考        |
| STT 服务   | OpenAI Whisper               | 中文识别质量稳定           |
| AI 提取    | Claude API                   | 理解复杂语境，意图提取能力强     |
