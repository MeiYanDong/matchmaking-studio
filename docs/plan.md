# Matchmaking Studio - 详细需求方案（重构版）

> 版本：V2.0  
> 版本状态：V2.1（补充 UI / 布局 / 体验重构方案）  
> 日期：2026-04-03  
> 核心定位：以红娘为操作主体、以字段体系为核心资产、以 AI 降低人工成本的高质量婚恋撮合工作台

---

## 一、产品定位与总原则

### 1.1 产品定位

这是一个服务于红娘和管理者的高质量婚恋匹配后台平台。平台不追求让客户自己操作系统，也不追求做开放式社交产品，而是围绕红娘的真实工作流进行设计：

- 红娘负责线下沟通、关系判断、客户推进
- AI 负责转录、结构化、找缺口、补问题、候选排序、匹配解释
- 系统负责存储、筛选、提醒、回溯和运营分析

平台面向的不是泛大众婚恋，而是更偏高质量、精英、高流动性、高净值客户群体，因此字段设计必须足够细，且要区分：

- 硬条件
- 软偏好
- 生活方式
- 情绪与人格
- 敏感关系模式
- 待确认信息
- 已核验事实

### 1.2 核心产品原则

#### 原则 A：字段是平台最重要的资产

匹配准确度首先取决于字段质量，而不是模型名字。  
系统必须围绕“字段采集、字段治理、字段回填、字段核验、字段重用”来设计。

#### 原则 B：所有核心字段都要入库

只要是平台定义过的字段，就必须在系统中有明确的存储位置。  
即使某次音频没有提到，也要以 `null`、`unknown` 或空数组等方式表达“当前未知”，而不是根本没有这个字段。

#### 原则 C：敏感字段不允许 AI 自作主张

涉及关系模式、金钱安排、生育安排、婚史、孩子、资产承诺、是否接受特殊关系模式等敏感字段时：

- 只有对话中明确提到，才允许 AI 提取为已知值
- 没有提到，则记录为 `unknown` 或 `null`
- 不允许 AI 因语气、身份、表达风格而擅自推断

#### 原则 D：`unknown` 不等于 `no`

对于敏感匹配字段，未知值不能直接当作拒绝处理。  
如果某位女方没有明确表达是否接受某类关系模式，系统不应直接排除她，而应：

- 先基于其他已知字段进行基础匹配
- 把该候选标记为“待确认”
- 由 AI 自动生成下一步补问任务和线下沟通建议
- 由红娘在线下补问后，再回填系统并重跑匹配

#### 原则 E：AI 的目标是减少人工，不是替代红娘

系统不让 AI 直接与客户沟通，也不让 AI 替红娘做最终关系判断。  
AI 的职责是：

- 自动转录
- 自动提取结构化字段
- 自动发现字段缺口
- 自动生成下一步要问的问题
- 自动给出候选排序与解释
- 自动提醒红娘需要继续确认什么

#### 原则 F：默认自动入库，红娘只处理异常

平台默认采用 AI-first 的处理方式：

- 能由系统上下文自动拿到的字段，绝不让红娘手填
- 能由 AI 从转录稿稳定提取的字段，绝不让红娘手填
- AI 默认直接把低风险字段写入当前档案
- 红娘只处理以下情况：
  - 明显冲突
  - 敏感字段确认
  - 身份归属错误
  - AI 低置信度异常

也就是说，V1 的默认工作流不是“红娘审核整份表单”，而是“AI 自动入库 + 红娘处理差异和高风险项”。

#### 原则 G：V1 不做说话人分离前提

根据当前接入的第三方网关文档，音频转写接口明确可用的是 `whisper-1`，支持 `json / text / srt / verbose_json / vtt`，但没有文档化的说话人分离参数。[voice_api.md.md](./API/voice_api.md.md)  
因此 V1 采用以下策略：

- 默认一段音频只对应“红娘 + 单一客户”
- 红娘使用标准化访谈话术
- Claude 提取时只提取“客户明确表达的信息”
- 红娘的提问句不计入客户事实字段

#### 原则 H：前端不得直接暴露数据库语义

数据库中的 `yes / no / unknown / null / compensated_dating` 等值属于存储语义，不属于前端展示语义。  
前端面对红娘时，必须永远显示“人话”，不能把内部枚举值直接露给用户。

具体原则：

- 数据库存储层可以继续保留 `yes / no / unknown / null`
- 前端展示层必须统一翻译为业务语言，如：
  - `yes` -> `接受` / `愿意`
  - `no` -> `不接受` / `不愿意`
  - `unknown` -> `待确认`
  - `null` -> `未填写`
- 编辑态默认不能把 `unknown` 当成已选择答案直接显示给红娘
- 编辑态若当前值未确认，应优先显示 `请选择` 或空占位，而不是显示数据库原值
- 特殊模式字段、内部协议字段、技术状态字段都不允许直接出现在常规红娘表单主视图中

也就是说：

- `unknown` 是数据库协议值
- `待确认` 才是前端展示值
- `未填写` 是空白状态的前端语义
- `请选择` 是编辑态交互语义

### 1.3 第一版边界（V1 Scope）

| 有 | 没有 |
|---|---|
| 红娘端（核心） | 客户自助端 |
| 管理端 | 平台内聊天 |
| 音频上传 + 转录 + 结构化 | 实时通话录音 |
| AI 匹配 + AI 补问建议 | AI 直接联系客户 |
| 高价值字段系统 | 面向大众的开放社交产品 |
| 待确认候选机制 | 完全自动撮合闭环 |

---

## 二、关键业务定义

### 2.1 基础意图 `primary_intent`

`primary_intent` 是广义婚恋意图，用于区分客户总体目的：

- `marriage`：以结婚为主要目标
- `dating`：以恋爱/陪伴关系为主要目标
- `fertility`：以生育为核心目标

这是宏观标签，不足以表达敏感关系模式。

### 2.2 敏感关系模式 `relationship_mode`

在高质量、高净值人群中，广义婚恋意图还不够。  
男方还需要一个更敏感、更硬约束的关系模式字段，用于区分具体业务类型。

#### 男方三类关系模式

1. `marriage_standard`
   - 奔着双方结婚去的标准婚恋模式
   - 属于传统婚恋匹配

2. `compensated_dating`
   - 只谈恋爱，可以给女方经济支持
   - 不等同于普通婚恋
   - 属于带经济安排的关系模式

3. `fertility_asset_arrangement`
   - 男方希望寻找多位女方生育后代
   - 愿意给女方及孩子提供大额资产与抚养安排
   - 属于高度敏感的关系模式

#### 女方接受状态

女方不能只记录“是否接受”，而必须记录三态状态：

- `yes`：明确接受
- `no`：明确拒绝
- `unknown`：未提及 / 未询问 / 说不清 / 信息不足

女方需要分别记录对三类关系模式的接受状态，而不是只有一个总开关。

#### 敏感模式的核心业务规则

1. 男方三类关系模式必须入库
2. 女方对三类关系模式的接受状态也必须入库
3. 若女方状态为 `no`，则该模式下直接排除
4. 若女方状态为 `yes`，则作为“已确认候选”
5. 若女方状态为 `unknown`，不直接排除，而进入“待确认候选”
6. 对于“待确认候选”，系统必须自动为红娘生成补问任务
7. 红娘在线下沟通后，再次上传音频，AI 自动更新字段并重跑匹配

### 2.3 为什么不用男库 / 女库物理分离

平台坚持使用单一 `profiles` 主表，通过 `gender` 区分男方与女方，不做物理分库或分表。

原因：

- 男女双方绝大多数字段结构相同
- 一套异常确认流程即可覆盖
- 一套匹配引擎即可运行
- 一套筛选和管理后台即可维护
- 避免后续字段扩展、索引、统计、RLS、联表逻辑翻倍复杂

---

## 三、角色定义

### 3.1 红娘（Matchmaker）

- 平台的核心操作主体
- 与客户线下聊天、电话、语音沟通
- 上传音频
- 处理 AI 标记的异常、冲突与敏感确认
- 查看已确认候选 / 待确认候选
- 按 AI 建议进行下一轮补问
- 记录客户推进状态和匹配结果

### 3.2 管理者（Admin）

- 查看全局客户结构、匹配漏斗、红娘工作量
- 管理红娘账号与客户归属
- 监督敏感关系模式的业务流程
- 查看平台整体匹配效率和字段完整度

### 3.3 客户（Client）

- V1 不登录平台
- 分为男方和女方
- 所有信息由红娘采集、上传、确认
- 所有后续沟通发生在线下

---

## 四、红娘工作流（业务视角）

### 4.1 新客户建立

V1 采用 AI-first 的建档方式，默认路径不是“先填表、后上传”，而是“先有音频，再自动补字段”。

推荐流程：

1. 红娘从已有客户中选择目标客户并上传音频  
   或在没有客户档案时，直接以“最少上下文”创建一个草稿客户后上传第一段音频
2. 系统自动拿到：
   - 负责人红娘
   - 客户
   - 上传时间
   - 音频文件
   - 音频时长
3. AI 从第一段音频中自动提取：
   - 姓名（若明确提到）
   - 年龄 / 城市 / 婚史 / 孩子 / 关系目标等基础字段
   - 匹配相关的敏感字段
4. 红娘只在以下场景处理：
   - 客户身份归属错了
   - 同名客户需要人工判断
   - AI 对关键字段低置信度

### 4.2 音频处理

1. 浏览器先把原始音频上传到 `Supabase Storage`
2. 服务端不再默认把整段音频下载后重新上传给转录供应商，而是：
   - 生成 `audio-files` 对象的短时效签名 URL
   - 把签名 URL 发送给转录供应商（V1 主链路为 Groq）
3. 转录服务根据 URL 直接拉取音频并返回 transcript
4. 系统调用 Claude 将文字提取成结构化字段
5. 系统额外生成：
   - 字段缺口分析
   - 待确认敏感项
   - 下一轮推荐提问
   - 客户摘要

#### 4.2.1 为什么 V1 核心先走 URL

平台的原始录音本来就必须先入库存档，原因包括：

- 需要保留原始证据供复核、回放、纠纷排查
- 后续可能需要重跑转录、重跑提取、对比不同模型效果
- 同一段音频可能要被多次处理，不能依赖浏览器端重新上传

因此 V1 的最优主链路不是“浏览器直接把文件发给转录供应商”，而是：

1. 浏览器上传到平台自己的存储
2. 平台生成短时效签名 URL
3. 转录供应商通过 URL 拉取音频

这种方式的优势是：

- 上传只发生一次
- 服务端不需要搬运整段大文件
- 同一段录音重试时无需再次上传
- 更适合后续异步队列化和稳定性治理

#### 4.2.2 V1 暂不做自动分段

V1 当前优先级不是“长音频智能分段”，而是先把整段 URL 转录跑稳。

结论：

- 默认整段音频直接转录
- 先不引入 chunking、重叠切段、合并去重等复杂逻辑
- 只有在真实运行中稳定出现以下情况时，才进入 V1.5 分段方案：
  - 文件大小频繁超过供应商限制
  - 长音频经常超时
  - 整段转录成功率明显下降

V1 的处理原则：

- 优先 URL 模式
- 优先整段转录
- 超过明确大小上限时才拦截上传或提示压缩
- 分段属于后续优化，不阻塞当前主线

#### 4.2.3 音频上传、音频转录、文本提取三阶段解耦状态机

当前客户录音处理主链路，面向红娘的业务动作其实包含三件不同的事：

1. 将录音音频文件上传到平台自己的对象存储
2. 将已经入库的音频文件转录成文字稿 transcript
3. 根据文字稿提取结构化字段并写入数据库

这三件事目前虽然在产品文案上已经被区分为“上传到资料库中”“发送到转录服务中”“AI 提取信息中”，但在实现上仍然被串成一条由前端动作连续推进的长链。  
这会造成以下问题：

- 红娘很难准确判断失败到底发生在音频上传、音频转录还是文本提取
- 前端页面承担了过多工作流调度职责，而不只是展示职责
- 当转录失败时，系统容易让人误以为要重新上传整段音频
- 当提取失败时，系统也容易和转录失败混在一起
- 后续若接入队列、worker、Agent 异步执行与更细的成功率监控，维护成本会持续升高

因此，主线应收敛为一套明确的三阶段异步状态机：

- `idle`：当前未开始处理
- `uploading`：浏览器正在把录音音频上传到对象存储
- `uploaded`：音频已经安全入库，但还没有开始转录
- `transcribing`：后端正在把音频转录为 transcript
- `transcribed`：transcript 已生成，但还没有开始结构化提取
- `extracting`：后端正在根据 transcript 提取字段并写入数据库
- `done`：整条链路处理完成
- `failed`：当前阶段失败，并额外记录 `failed_stage`

其中：

- `failed_stage = upload`
  表示失败发生在“上传录音音频到对象存储”阶段
- `failed_stage = transcribe`
  表示失败发生在“将音频转录成文字稿”阶段
- `failed_stage = extract`
  表示失败发生在“根据文字稿提取结构化字段并写入数据库”阶段

这套状态机的职责边界应固定为：

1. 音频上传阶段只负责：
   - 上传音频文件到对象存储
   - 创建 `conversation`
   - 记录音频元信息
   - 将状态推进到 `uploaded`
2. 音频转录阶段只负责：
   - 读取 `uploaded` 会话
   - 调用转录服务
   - 写回 transcript
   - 将状态推进到 `transcribed`
3. 文本提取阶段只负责：
   - 读取 `transcribed` 会话
   - 调用提取逻辑
   - 写入结构化字段、摘要、缺口与补问
   - 将状态推进到 `done`

前端页面在这套方案中的职责也必须收敛：

- 前端负责发起音频上传
- 前端负责读取并展示当前会话阶段
- 前端负责根据 `failed_stage` 提供“重新上传音频 / 重试转录 / 重试提取”的明确入口
- 前端不再默认承担整条工作流的连续推进职责

这套方案的直接收益是：

1. 红娘更容易理解系统到底卡在哪一步
2. 音频转录失败时无需重新上传音频
3. 文本提取失败时无需重新上传音频，也无需重新转录
4. 系统更容易统计：
   - 音频上传成功率
   - 音频转录成功率
   - 文本提取失败率
   - 各阶段平均耗时
5. 后续更容易接入队列、worker、Agent 与异步恢复机制

### 4.3 红娘审核

红娘默认不需要审核整份档案。  
审核页的定位是“异常处理页”，而不是“完整手填页”。

红娘在异常页中看到：

- 全文转录
- 本次音频新增字段
- 与旧值冲突的字段
- AI 无法归类内容
- AI 标记的“低置信度字段”
- AI 标记的“待确认敏感字段”
- AI 生成的补问建议

红娘可：

- 接受 AI 自动更新
- 只修改冲突或明显错误字段
- 对敏感字段做确认或保留 `unknown`
- 把某些字段标为“线下继续确认”

### 4.4 自动匹配

AI 完成自动入库后，系统自动：

1. 使用基础字段进行异性全库匹配
2. 使用敏感关系模式状态进行二次筛选
3. 输出两类候选：
   - `confirmed`：敏感模式已确认可接受
   - `pending_confirmation`：基础匹配高，但敏感模式仍未知
4. 前台主显 Top1，后台保留 Top3

### 4.5 线下补问闭环

对于 `pending_confirmation` 候选：

1. 系统为红娘生成下一步补问任务
2. 红娘带着 AI 生成的问题线下继续沟通
3. 线下沟通后上传新音频
4. AI 更新字段状态
5. 系统重跑匹配

---

## 五、字段设计总原则

### 5.1 字段必须分层

平台所有字段必须归类到以下类型之一：

1. `硬筛选字段`
   - 明确不兼容就直接排除
2. `软偏好字段`
   - 影响分数，但不直接排除
3. `待确认字段`
   - 未知时不排除，但要生成补问任务
4. `运营参考字段`
   - 不直接参与匹配，但帮助红娘推进

### 5.2 每个关键字段都要有治理元数据

对于所有重要字段，系统最终需要支持以下元信息：

- `value`：字段值
- `source_type`：来源
  - `self_reported`
  - `matchmaker_summary`
  - `ai_extracted`
  - `verified_document`
- `confidence`：AI 或红娘对该值的置信度
- `verification_status`：是否已核验
- `evidence_text`：来自哪段原文
- `conversation_id`：来源于哪次录音
- `updated_at`

### 5.3 敏感字段必须遵循“显式优先”

以下字段默认为敏感字段：

- 关系模式
- 女方是否接受特殊关系模式
- 婚史
- 是否有孩子
- 生育意愿
- 资产承诺
- 经济安排预期
- 婚前协议
- 子女抚养和资产安排

这些字段：

- 没提到时不允许 AI 猜
- 未确认时不允许伪装成“已知”
- 必须能回溯到原始证据

---

## 六、数据模型设计（详细版）

> 说明：  
> V1 为了开发效率，可以继续使用 `profiles + intentions` 作为主干表；  
> 但从详细需求设计上，建议增加专门的扩展表与元数据表，避免 `profiles` 无限制膨胀。  
> 平台采用“核心 typed columns + 元数据补充表”的混合模式。

### 6.1 用户档案主表 `profiles`

存储客户的稳定基础信息与全球流动/高净值基础事实。

```sql
profiles
├── id                              UUID, PK
├── created_at                      TIMESTAMPTZ
├── updated_at                      TIMESTAMPTZ
├── matchmaker_id                   UUID, FK -> auth.users
├── gender                          ENUM('male', 'female')
├── status                          ENUM('active', 'inactive', 'matched', 'paused')

-- 基础身份
├── name                            TEXT
├── phone                           TEXT
├── nationality                     TEXT
├── citizenship_list                TEXT[]
├── languages                       TEXT[]

-- 基础人口属性
├── age                             INTEGER
├── height                          INTEGER
├── weight                          INTEGER
├── hometown                        TEXT
├── city                            TEXT
├── current_base_cities             TEXT[]      -- 常驻/频繁往返城市
├── residency_status                TEXT        -- 户籍/居留/签证/长期居住情况
├── visa_flexibility                TEXT        -- 是否容易跨境迁移
├── travel_frequency                TEXT        -- 出差/国际流动频率
├── time_zone_pattern               TEXT        -- 常驻时区/跨时区工作节奏

-- 教育与职业
├── education                       ENUM(...)
├── school_notes                    TEXT
├── occupation                      TEXT
├── job_title                       TEXT
├── industry                        TEXT
├── work_intensity                  TEXT        -- 工作强度
├── work_schedule                   TEXT        -- 作息/节奏

-- 财富与资源
├── annual_income                   INTEGER      -- 万元
├── income_range                    TEXT
├── net_worth_range                 TEXT
├── liquid_assets_range             TEXT
├── assets                          TEXT
├── property_locations              TEXT[]
├── support_budget_range            TEXT        -- 若涉及经济安排，可承担的支持区间
├── income_verified                 BOOLEAN
├── assets_verified                 BOOLEAN

-- 婚育事实
├── marital_history                 TEXT
├── marital_history_verified        BOOLEAN
├── has_children                    BOOLEAN
├── children_notes                  TEXT

-- 外在与展示
├── appearance_score                INTEGER
├── avatar_url                      TEXT        -- 客户主头像，仅用于识别与缩略图
├── lifestyle_photo_urls            TEXT[]      -- 生活照 / 资料照，多张补充资料

-- 兴趣与生活标签
├── hobbies                         TEXT[]
├── interest_tags                   TEXT[]
├── cultural_preferences            TEXT[]
├── travel_style_tags               TEXT[]
├── social_scene_tags               TEXT[]

-- 高层概述
├── ai_summary                      TEXT
├── raw_notes                       TEXT
```

### 6.2 意图与关系模式表 `intentions`

这是平台最关键的匹配输入表之一。

```sql
intentions
├── id                                        UUID, PK
├── profile_id                                UUID, FK -> profiles (一对一)
├── updated_at                                TIMESTAMPTZ

-- 宏观意图
├── primary_intent                            ENUM('marriage', 'dating', 'fertility')
├── intent_notes                              TEXT

-- 自身关系模式（重点）
├── relationship_mode                         ENUM(
│                                               'marriage_standard',
│                                               'compensated_dating',
│                                               'fertility_asset_arrangement'
│                                             )
├── relationship_mode_notes                   TEXT

-- 女方对各模式的接受状态（三态）
├── accepts_mode_marriage_standard            ENUM('yes', 'no', 'unknown')
├── accepts_mode_compensated_dating           ENUM('yes', 'no', 'unknown')
├── accepts_mode_fertility_asset_arrangement  ENUM('yes', 'no', 'unknown')
├── mode_boundary_notes                       TEXT

-- 经济安排相关
├── financial_arrangement_expectation         TEXT
├── financial_arrangement_boundary            TEXT
├── exclusive_relationship_requirement        TEXT

-- 生育安排相关
├── fertility_preference                      TEXT
├── fertility_timeline                        TEXT
├── desired_children_count                    INTEGER
├── biological_child_requirement              BOOLEAN
├── co_parenting_expectation                  TEXT
├── child_support_expectation                 TEXT
├── inheritance_expectation                   TEXT
├── prenup_acceptance                         ENUM('yes', 'no', 'unknown')

-- 对对方的硬性偏好
├── preferred_age_min                         INTEGER
├── preferred_age_max                         INTEGER
├── preferred_height_min                      INTEGER
├── preferred_cities                          TEXT[]
├── settle_city_preferences                   TEXT[]
├── relocation_willingness                    BOOLEAN
├── preferred_education                       TEXT[]
├── preferred_income_min                      INTEGER
├── preferred_net_worth_min                   TEXT
├── preferred_industry_tags                   TEXT[]
├── dealbreakers                              TEXT[]

-- 对婚育事实的接受边界
├── accepts_partner_marital_history           TEXT[]
├── accepts_partner_children                  ENUM('yes', 'no', 'unknown')
├── accepts_long_distance                     BOOLEAN
├── long_distance_notes                       TEXT

-- 软性条件与隐性需求
├── tolerance_notes                           TEXT
├── acceptable_conditions                     TEXT[]
├── biggest_concerns                          TEXT[]
├── implicit_intent_notes                     TEXT
```

### 6.3 生活方式与性格画像表 `trait_profiles`

这是高质量匹配的核心增量资产。  
平台必须把兴趣爱好、生活习惯、情绪稳定、人格结构系统化，而不是只留一两个标签字段。

```sql
trait_profiles
├── id                              UUID, PK
├── profile_id                      UUID, FK -> profiles (一对一)
├── updated_at                      TIMESTAMPTZ

-- 兴趣与日常生活
├── hobby_ranked_tags               TEXT[]
├── weekend_style                   TEXT
├── exercise_habits                 TEXT
├── diet_habits                     TEXT
├── sleep_schedule                  TEXT
├── smoking                         BOOLEAN
├── drinking                        BOOLEAN
├── cleanliness_orderliness         TEXT
├── routine_preference              TEXT
├── alone_time_need                 TEXT
├── social_energy_preference        TEXT
├── party_tolerance                 TEXT
├── spending_style                  TEXT
├── luxury_lifestyle_preference     TEXT
├── privacy_level                   TEXT
├── public_exposure_tolerance       TEXT

-- 情绪稳定与压力反应
├── emotional_regulation            TEXT
├── stress_reactivity               TEXT
├── anger_threshold                 TEXT
├── recovery_speed_after_conflict   TEXT
├── rumination_tendency             TEXT
├── reassurance_need                TEXT
├── jealousy_tolerance              TEXT
├── empathy_level                   TEXT
├── emotional_expression_style      TEXT

-- 关系经营方式
├── communication_style             TEXT
├── communication_cadence           TEXT
├── relationship_pace               TEXT
├── conflict_style                  TEXT
├── repair_style                    TEXT
├── partner_role_expectation        TEXT
├── seriousness_score               INTEGER
├── followup_strategy               TEXT
├── hidden_expectations             TEXT

-- MBTI（展示友好，但默认不作为硬筛选）
├── mbti_self_reported_type         TEXT
├── mbti_ai_hypothesis_type         TEXT
├── mbti_confidence                 INTEGER
├── mbti_ei_score                   INTEGER
├── mbti_sn_score                   INTEGER
├── mbti_tf_score                   INTEGER
├── mbti_jp_score                   INTEGER
├── mbti_facet_notes                TEXT

-- Big Five（更适合作为底层匹配）
├── big_five_openness               INTEGER
├── big_five_conscientiousness      INTEGER
├── big_five_extraversion           INTEGER
├── big_five_agreeableness          INTEGER
├── big_five_emotional_stability    INTEGER

-- 依恋风格（关系匹配高价值）
├── attachment_anxiety              INTEGER
├── attachment_avoidance            INTEGER

-- HEXACO（高净值场景的重要补充）
├── hexaco_honesty_humility         INTEGER
├── hexaco_emotionality             INTEGER
├── hexaco_conscientiousness        INTEGER
```

### 6.4 字段证据表 `field_observations`

为了让平台长期可维护，建议增加字段级证据表，专门存“这个字段是从哪里来的”。

```sql
field_observations
├── id                              UUID, PK
├── profile_id                      UUID, FK -> profiles
├── conversation_id                 UUID, FK -> conversations
├── field_key                       TEXT        -- 如 hobbies / accepts_mode_compensated_dating
├── field_value_json                JSONB
├── source_type                     ENUM('self_reported', 'matchmaker_summary', 'ai_extracted', 'verified_document')
├── confidence                      INTEGER     -- 0-100
├── verification_status             ENUM('unverified', 'pending', 'verified', 'rejected')
├── evidence_text                   TEXT        -- 原文证据
├── start_time_seconds              INTEGER
├── end_time_seconds                INTEGER
├── created_at                      TIMESTAMPTZ
```

### 6.5 语音记录表 `conversations`

```sql
conversations
├── id                              UUID, PK
├── created_at                      TIMESTAMPTZ
├── profile_id                      UUID, FK -> profiles
├── matchmaker_id                   UUID, FK -> auth.users
├── audio_url                       TEXT
├── audio_duration                  INTEGER
├── status                          ENUM('pending', 'transcribing', 'extracting', 'done', 'failed')
├── error_message                   TEXT
├── transcript                      TEXT
├── transcript_verbose_json         JSONB       -- 若转录接口稳定支持 verbose_json，则一并保留
├── extracted_fields                JSONB
├── extraction_notes                TEXT
├── missing_fields                  TEXT[]      -- AI 检测的缺口
├── suggested_questions             TEXT[]      -- AI 生成的下一轮推荐补问
├── reviewed_by                     UUID
├── reviewed_at                     TIMESTAMPTZ
```

### 6.6 匹配记录表 `matches`

```sql
matches
├── id                              UUID, PK
├── created_at                      TIMESTAMPTZ
├── updated_at                      TIMESTAMPTZ
├── male_profile_id                 UUID, FK -> profiles
├── female_profile_id               UUID, FK -> profiles
├── matchmaker_id                   UUID, FK -> auth.users

-- 匹配结果
├── match_score                     FLOAT
├── score_breakdown                 JSONB
├── match_reason                    TEXT

-- 匹配状态分层
├── recommendation_type             ENUM('confirmed', 'pending_confirmation', 'rejected')
├── pending_reasons                 TEXT[]      -- 为什么是待确认
├── required_followup_fields        TEXT[]      -- 例如 accepts_mode_compensated_dating
├── suggested_followup_questions    TEXT[]      -- 给红娘的补问建议

-- 红娘跟进状态
├── status                          ENUM(
│                                       'pending',
│                                       'reviewing',
│                                       'contacted_male',
│                                       'contacted_female',
│                                       'both_agreed',
│                                       'meeting_scheduled',
│                                       'met',
│                                       'succeeded',
│                                       'failed',
│                                       'dismissed'
│                                   )
├── matchmaker_notes                TEXT
├── meeting_time                    TIMESTAMPTZ
├── meeting_location                TEXT
├── outcome_notes                   TEXT
├── dismissed_reason                TEXT
```

### 6.7 补问任务表 `followup_tasks`

这是“AI 减少人工”的关键承载表。

```sql
followup_tasks
├── id                              UUID, PK
├── created_at                      TIMESTAMPTZ
├── updated_at                      TIMESTAMPTZ
├── profile_id                      UUID, FK -> profiles
├── match_id                        UUID, FK -> matches
├── matchmaker_id                   UUID, FK -> auth.users
├── task_type                       ENUM('missing_field', 'sensitive_confirmation', 'verification', 'relationship_followup')
├── priority                        ENUM('high', 'medium', 'low')
├── field_keys                      TEXT[]
├── question_list                   TEXT[]
├── rationale                       TEXT
├── status                          ENUM('open', 'in_progress', 'done', 'dismissed')
├── completed_at                    TIMESTAMPTZ
```

### 6.8 提醒表 `reminders`

保留现有提醒能力，同时增加“待补问长期未处理”的提醒场景。

```sql
reminders
├── id                              UUID, PK
├── created_at                      TIMESTAMPTZ
├── matchmaker_id                   UUID, FK -> auth.users
├── profile_id                      UUID, FK -> profiles
├── match_id                        UUID, FK -> matches
├── followup_task_id                UUID, FK -> followup_tasks
├── type                            ENUM('no_followup', 'no_new_info', 'meeting_reminder', 'pending_confirmation')
├── message                         TEXT
├── is_read                         BOOLEAN
├── read_at                         TIMESTAMPTZ
```

### 6.9 角色表 `user_roles`

```sql
user_roles
├── user_id                         UUID, FK -> auth.users
├── role                            ENUM('admin', 'matchmaker')
├── display_name                    TEXT
├── created_at                      TIMESTAMPTZ
```

---

## 七、字段体系（按业务层次拆解）

### 7.1 硬筛选字段

这些字段一旦明确冲突，直接排除：

- 性别方向（当前平台为异性匹配）
- `relationship_mode` 与女方对应接受状态
- `dealbreakers`
- 明确不可接受的婚史
- 明确不可接受的孩子情况
- 明确不可接受的生育安排
- 双方都明确不能接受异地且城市无法交集
- 关键年龄区间完全冲突

### 7.2 软偏好字段

这些字段影响得分但不直接排除：

- 城市/全球流动方式
- 学历
- 收入区间
- 净资产区间
- 行业背景
- 兴趣爱好
- 生活习惯
- 消费方式
- 节奏与社交风格
- 性格维度

### 7.3 待确认字段

这些字段是平台必须特别处理的一类：

- 女方是否接受 `compensated_dating`
- 女方是否接受 `fertility_asset_arrangement`
- 婚前协议接受度
- 子女抚养安排
- 财务安排边界
- 是否接受对方有孩子
- 是否接受长期异地或迁居

这些字段若是 `unknown`：

- 不直接淘汰
- 自动生成补问任务
- 候选展示为 `pending_confirmation`

### 7.4 运营参考字段

这些字段默认不作为硬过滤，但帮助红娘判断推进策略：

- `followup_strategy`
- `hidden_expectations`
- `seriousness_score`
- `public_exposure_tolerance`
- `privacy_level`
- `matchmaker_notes`

### 7.5 V1 最小必要字段定义表

> 本节是 V1 的正式字段收敛标准。  
> 只有同时满足以下 4 条的字段，才允许进入 V1 的核心匹配字段集：
>
> 1. 有必要  
> 2. 无歧义  
> 3. 分类清楚  
> 4. AI 可从转录稿中稳定提取
>
> 若任一条件不满足，则该字段要么删除，要么降级为备注字段、总结字段、待确认字段或 V2 字段。

#### 7.5.1 设计标准

##### 标准 A：有必要

字段必须直接服务于以下至少一项：

- 建立客户当前画像
- 支撑异性匹配
- 判断是否需要继续补问
- 帮助红娘推进关系

##### 标准 B：无歧义

字段定义必须满足：

- AI 能理解“这个字段到底表示什么”
- AI 能判断“什么时候该填，什么时候不能填”
- 人工也能在审核时快速判断 AI 是否填对

##### 标准 C：良好分类

V1 字段分类必须满足：

- 各子类互不重合
- 各子类加总后覆盖匹配主流程所需信息

##### 标准 D：AI 可提取

字段必须适合由 AI 从“音频转文字后的文本稿”中提取。  
如果某字段更适合问卷、测评、心理量表或长期观察，则不能放入 V1 核心字段。

#### 7.5.2 V1 字段分类（MECE）

V1 核心字段统一分为 5 类：

1. `客户基础事实`
2. `关系目标与敏感模式`
3. `对异性的核心要求`
4. `生活方式`
5. `相处与推进`

这 5 类共同覆盖 V1 匹配所需的主要信息。

#### 7.5.3 音频记录必备元字段（非匹配字段，但必须存在）

这些字段不是“匹配字段”，但属于整个 AI 工作流的必要元数据。

| 字段中文名 | 定义 | 产生方式 | 是否由 AI 填写 |
|---|---|---|---|
| 负责人红娘 | 本次谈话对应的负责红娘 | 由登录用户与上传上下文确定 | 否 |
| 客户 | 本次音频对应的客户档案 | 由上传页上下文确定 | 否 |
| 谈话时间 | 实际发生这次沟通的时间 | 默认取上传时间；若音频元信息、文件名或转录稿里有明确时间，系统 / AI 自动修正；只有明显错误时才人工修正 | 是（优先系统，其次 AI） |
| 上传时间 | 音频上传进系统的时间 | 系统自动生成 | 否 |
| 音频文件 | 原始音频本体 | 系统上传存储 | 否 |
| 转录稿 | 音频转文字后的文本 | 由转录模型生成 | 是 |
| AI 提取结果 | 本次音频的结构化增量结果 | 由提取模型生成 | 是 |

#### 7.5.4 客户基础事实

这些字段用于描述“这个人是谁”，要求优先提取事实、避免推断。

| 字段中文名 | 定义 | 为什么必要 | 允许值 / 格式 | AI 提取规则 | 更新规则 | 匹配作用 |
|---|---|---|---|---|---|---|
| 姓名 | 当前红娘用于称呼客户的姓名或固定称呼 | 档案识别与人工推进必需 | 文本 | 只有明确提到时才更新 | 新音频明确提到新称呼时覆盖旧值 | 不参与评分 |
| 性别 | 客户性别，用于异性匹配方向 | 匹配方向基础前提 | 男 / 女 | 建议由创建客户时人工指定；音频仅作为补充确认 | 仅在明确错误时人工修正 | 硬前提 |
| 年龄 | 客户当前年龄，以周岁计 | 年龄偏好是高频硬条件 | 整数 | 只有明确说出年龄时填写 | 新的明确年龄覆盖旧年龄；模糊说法不覆盖 | 核心评分 |
| 所在城市 | 客户当前主要生活 / 工作城市 | 同城 / 异地 / 定居判断基础 | 标准城市名 | 只提取明确主城市 | 新音频明确改变常住地时覆盖 | 核心评分 |
| 常驻城市 | 客户长期频繁停留的城市列表 | 精英人群高流动场景必需 | 城市数组 | 仅在明确说“常在/经常往返”时填写 | 新增城市可合并；明确不再常驻时移除 | 核心评分 |
| 学历 | 已完成的最高正式学历 | 高频筛选项 | 高中 / 专科 / 本科 / 硕士 / 博士 / 其他 / 未知 | 只接受明确学历表达 | 更高且明确的新学历覆盖旧值 | 软偏好 / 可硬化 |
| 职业 | 当前职业 / 行业身份 | 帮助判断生活方式和资源背景 | 短文本 | 明确提到时填写 | 新明确职业覆盖旧职业 | 软偏好 |
| 年收入 | 年收入，统一换算为“万元 / 年” | 高质量匹配高频字段 | 数字或空 | 只接受明确数字或明确范围推算中值 | 新明确数值覆盖旧明确数值；“收入还行”不覆盖 | 核心评分 |
| 资产情况 | 主要资产事实，如房、车、股权、信托等 | 高净值场景必要 | 短文本 | 只记录明确提到的资产事实 | 新增事实可补充；明确冲突时最新覆盖 | 软偏好 / 特殊模式关键 |
| 婚史 | 当前正式婚姻历史状态 | 高频硬边界 | 未婚 / 离异 / 丧偶 / 其他 / 未知 | 只接受明确表述 | 新明确婚史覆盖旧值 | 核心硬筛选 |
| 是否有孩子 | 客户当前是否已有孩子 | 高频硬边界 | yes / no / unknown | 只有明确说有或没有时填写 | yes/no 只允许被新的明确 yes/no 覆盖；unknown 不覆盖已知 | 核心硬筛选 |
| 孩子情况 | 已有孩子的补充说明 | 影响接受边界 | 短文本 | 只有在“有孩子”明确后才补充 | 新明确说明覆盖旧说明 | 补充判断 |

#### 7.5.5 关系目标与敏感模式

这是 V1 最关键的一组字段，必须遵守“显式优先、未知不乱拦截”。

| 字段中文名 | 定义 | 为什么必要 | 允许值 / 格式 | AI 提取规则 | 更新规则 | 匹配作用 |
|---|---|---|---|---|---|---|
| 宏观意图 | 客户整体目标更偏结婚、恋爱还是生育 | 决定匹配赛道 | marriage / dating / fertility / unknown | 只在客户明确表达目标时填写 | 新的明确表达覆盖旧值 | 核心硬筛选 |
| 男方关系模式 | 男方的具体关系模式 | 本产品差异化核心 | 奔着结婚去的标准婚恋 / 恋爱且带经济安排 / 生育资产安排型 / unknown | 仅对男方提取；必须有明确表达 | 新明确模式覆盖旧模式 | 核心硬筛选 |
| 女方是否接受标准婚恋 | 女方是否接受普通结婚导向关系 | 决定男方标准婚恋候选是否已确认 | yes / no / unknown | 仅在女方明确表态时填写 | yes/no 只允许被新的明确 yes/no 覆盖 | 敏感确认 |
| 女方是否接受恋爱且带经济安排 | 女方是否接受带经济安排的恋爱关系 | 决定 `compensated_dating` 是否 confirmed | yes / no / unknown | 只在明确表达时填写 | yes/no 只允许被新的明确 yes/no 覆盖；unknown 不清空旧值 | 敏感确认 |
| 女方是否接受生育资产安排型 | 女方是否接受以生育与资产安排为核心的关系模式 | 决定第三类模式候选是否 confirmed | yes / no / unknown | 只在明确表达时填写 | yes/no 只允许被新的明确 yes/no 覆盖；unknown 不清空旧值 | 敏感确认 |

#### 7.5.6 对异性的核心要求

这些字段表示“客户对对方有什么要求”，必须尽量转成可比较字段。

| 字段中文名 | 定义 | 为什么必要 | 允许值 / 格式 | AI 提取规则 | 更新规则 | 匹配作用 |
|---|---|---|---|---|---|---|
| 期望最小年龄 | 希望对方的最低年龄 | 年龄筛选基础 | 整数或空 | 只接受明确区间或下限 | 新明确值覆盖旧值 | 核心评分 |
| 期望最大年龄 | 希望对方的最大年龄 | 年龄筛选基础 | 整数或空 | 只接受明确区间或上限 | 新明确值覆盖旧值 | 核心评分 |
| 可接受城市 | 客户明确能接受的对方所在城市列表 | 城市匹配核心 | 城市数组 | 只提取明确提到的可接受城市 | 新增城市合并；明确排除时移除 | 核心评分 |
| 是否接受异地 | 是否接受两地关系 | 高频匹配边界 | yes / no / unknown | 仅当客户明确表态时填写 | yes/no 只允许被新的明确 yes/no 覆盖 | 硬筛选 / 软评分 |
| 是否愿意迁居 | 是否愿意为了关系改变常驻地 | 全球流动人群必要 | yes / no / unknown | 仅明确表达时填写 | yes/no 只允许被新的明确 yes/no 覆盖 | 核心评分 |
| 可接受学历 | 对对方学历的下限或允许范围 | 高频筛选项 | 学历数组或空 | 只接受明确要求 | 新明确要求覆盖旧要求 | 软偏好 / 可硬化 |
| 最低收入要求 | 对对方最低收入的要求 | 高质量人群高频字段 | 数字或空 | 只接受明确数字或区间 | 新明确值覆盖旧值 | 核心评分 |
| 是否接受对方婚史 | 对方婚史是否在可接受范围内 | 高频硬边界 | 婚史数组 / unknown | 只接受明确表态 | 新明确边界覆盖旧边界 | 核心硬筛选 |
| 是否接受对方有孩子 | 是否接受对方已有孩子 | 高频硬边界 | yes / no / unknown | 仅当客户明确表态时填写 | yes/no 只允许被新的明确 yes/no 覆盖 | 核心硬筛选 |
| 生育意愿 | 是否希望与对方共同生育孩子 | 影响人生阶段相容性 | 想要 / 可以讨论 / 不想要 / unknown | 只接受明确表达 | 新明确表达覆盖旧值 | 核心评分 |
| 绝对不能接受的条件 | 客户明确说“绝对不能接受”的条件 | 直接决定排除规则 | 标签数组 | 只提取绝对化表达，如“一定不行”“绝对不接受” | 新明确排斥条件增量合并；若明确取消则移除 | 核心硬筛选 |

#### 7.5.7 生活方式

V1 的生活方式字段只保留最必要、最常见、最容易从对话中提取的部分。

| 字段中文名 | 定义 | 为什么必要 | 允许值 / 格式 | AI 提取规则 | 更新规则 | 匹配作用 |
|---|---|---|---|---|---|---|
| 兴趣爱好 | 客户经常投入时间的兴趣活动 | 高频软匹配项 | 标签数组 | 只提取客户明确说喜欢、常做、长期做的活动 | 新明确兴趣增量合并；明确不再做可移除 | 核心软评分 |
| 吸烟习惯 | 当前吸烟情况 | 高频生活边界 | 不吸烟 / 偶尔吸烟 / 经常吸烟 / unknown | 只有明确描述时填写 | 新明确习惯覆盖旧习惯 | 核心软评分 / 可硬化 |
| 饮酒习惯 | 当前饮酒情况 | 高频生活边界 | 不饮酒 / 偶尔饮酒 / 经常饮酒 / unknown | 只有明确描述时填写 | 新明确习惯覆盖旧习惯 | 核心软评分 / 可硬化 |
| 作息习惯 | 客户长期稳定的作息特点 | 共同生活相容性重要 | 早睡早起 / 常规作息 / 夜间活跃 / 作息不固定 / unknown | 只接受客户明确的长期描述 | 新明确习惯覆盖旧习惯 | 核心软评分 |
| 运动习惯 | 客户平时运动频率与态度 | 高频生活方式字段 | 规律运动 / 偶尔运动 / 基本不运动 / unknown | 只在明确表达时填写 | 新明确习惯覆盖旧习惯 | 软评分 |
| 饮食习惯 | 对饮食是否有长期稳定的偏好或限制 | 长期相处有价值 | 无特殊偏好 / 有明确偏好或限制 / unknown | 只在明确描述长期偏好时填写 | 新明确习惯覆盖旧习惯 | 软评分 |
| 社交偏好 | 更偏宅、平衡、爱社交还是高频应酬 | 生活节奏相容性重要 | 偏宅 / 平衡 / 爱社交 / 高频应酬 / unknown | 允许 AI 基于连续明确描述总结；证据不足则 unknown | 更明确的新表达覆盖旧值 | 核心软评分 |
| 消费方式 | 消费观与生活方式的总体倾向 | 高质量关系里常见矛盾点 | 节制 / 平衡 / 品质导向 / 高消费 / unknown | 只在有明确消费观表述时填写 | 更明确的新表达覆盖旧值 | 软评分 |

#### 7.5.8 相处与推进

这些字段不一定都是硬筛选，但对高质量匹配和红娘推进非常重要。

| 字段中文名 | 定义 | 为什么必要 | 允许值 / 格式 | AI 提取规则 | 更新规则 | 匹配作用 |
|---|---|---|---|---|---|---|
| 沟通风格 | 客户偏好的说话与交流方式 | 帮助判断相处舒适度 | 标签数组（如直接、温和、理性、慢热、健谈） | 允许 AI 基于客户对自己表达方式的自述做保守总结；证据不足则空 | 新更明确的标签覆盖或增量更新 | 核心软评分 |
| 推进节奏 | 客户希望关系发展的快慢 | 高价值推进字段 | 慢热 / 正常推进 / 希望尽快确定 / unknown | 只在明确表达推进偏好时填写 | 新明确偏好覆盖旧值 | 核心软评分 |
| 情绪稳定 | 客户在关系中情绪是否稳定的简化工作性判断 | 用户已明确要求 V1 保留简化字段 | 稳定 / 一般 / 敏感 / unknown | 只允许根据客户对自己脾气、情绪反应、冲突表现的明确表述填；不允许仅凭语气猜 | 新明确描述覆盖旧值；unknown 不清空旧值 | 软评分 / 风险提示 |
| 当前最大顾虑 | 客户当前最在意或最担心的匹配障碍 | 有助于理解 why not now | 标签数组（最多 3 项） | 只提取当前明确顾虑 | 新顾虑覆盖旧顾虑或增量更新 | 软评分 / 补问依据 |
| 隐性期待 | 客户没有完全直说、但从对话中能较保守总结出的期待 | 帮助红娘推进 | 短文本或空 | 仅允许 AI 在证据较充分时总结；否则为空 | 最新总结可替换旧总结 | 仅参考 |
| 红娘跟进建议 | AI 针对该客户给红娘的推进建议 | 直接节省人工思考 | 短文本 | 由 AI 生成，不属于客户事实 | 每次新音频可重算 | 不参与匹配 |

#### 7.5.9 暂不进入 V1 核心字段的内容

以下内容当前不进入 V1 核心匹配字段，原因通常是“歧义过大”或“更适合问卷/测评而非自然对话提取”：

- AI 自动判定 MBTI 类型
- AI 自动判定 INTP / ENFP 等人格标签
- Big Five 数值化评分
- 依恋风格数值化评分
- HEXACO 数值化评分
- 颜值评分

若后续确实要引入，建议仅作为：

- 客户自报字段
- 低置信度假设字段
- 问卷结果字段

而不是 V1 核心匹配字段。

### 7.6 AI 增量提取与字段更新规则

V1 不是“每段音频重建一次完整档案”，而是“每段音频产生一次增量更新”。

#### 7.6.1 AI 输出必须是 patch，而不是 full replace

AI 在处理新音频时，必须基于：

- 当前客户已有字段
- 新音频转录稿
- 字段定义说明书

输出：

- `field_updates`：本次音频新增或改变的字段
- `conflict_fields`：与旧值冲突的字段
- `missing_critical_fields`：仍然缺失的重要字段
- `suggested_followup_questions`：下一步建议红娘问的问题

#### 7.6.2 更新总规则

1. 新音频中没有提到的字段，不修改旧值  
2. 新音频中明确提到的新值，可以更新当前档案  
3. 新音频中的模糊描述，不能覆盖旧的明确值  
4. `unknown` 不能覆盖已有的 `yes/no` 或明确事实值  
5. 发生冲突时，当前档案采用“最新且明确”的值  
6. 旧值不删除，进入字段历史或音频历史以便回溯

#### 7.6.3 典型示例

##### 示例 A：可覆盖

- 旧值：年收入 = 300 万
- 新音频：客户明确说“今年税前差不多 500 万”
- 结果：更新为 500 万

##### 示例 B：不可覆盖

- 旧值：年收入 = 300 万
- 新音频：客户说“收入还行”
- 结果：不覆盖旧值

##### 示例 C：敏感字段从 unknown 变为 yes

- 旧值：女方是否接受恋爱且带经济安排 = unknown
- 新音频：客户明确说“可以接受，只要边界清楚”
- 结果：更新为 yes

##### 示例 D：敏感字段从 yes 变为 no

- 旧值：女方是否接受恋爱且带经济安排 = yes
- 新音频：客户明确说“现在不考虑这种模式了”
- 结果：更新为 no，并保留历史

### 7.7 匹配比较时的字段重要性权重

用户在匹配时，不只是“有没有这个偏好”，还包含“这个偏好有多重要”。  
因此 V1 建议为核心偏好字段增加一个重要性等级，用于方向性打分。

#### 7.7.1 重要性等级

对以下字段，AI 应尝试提取“重要性”：

- 年龄
- 城市 / 异地
- 学历
- 收入
- 婚史
- 孩子
- 生育
- 生活方式
- 关系模式

重要性统一分为四档：

- `硬性`
- `重要`
- `一般`
- `无所谓`

#### 7.7.2 AI 提取重要性的语言线索

| 语言线索 | 重要性 |
|---|---|
| “必须”“一定要”“绝对不能”“完全不接受” | 硬性 |
| “比较看重”“最好是”“优先考虑” | 重要 |
| “有更好，没有也可以” | 一般 |
| “都行”“没特别要求”“无所谓” | 无所谓 |

#### 7.7.3 匹配时的比较逻辑

以 A 对 B 的匹配为例，按字段逐项计算：

1. 先判断 A 对该字段是否有要求
2. 再判断 B 在该字段上是否满足
3. 按 A 的重要性等级乘以该字段匹配程度得分
4. 若为硬性字段且明确冲突，则直接排除
5. 若为 `unknown`，则不直接排除，但标记为待确认并给中性或折扣分

#### 7.7.4 匹配结果至少要包含

- `总分`
- `分字段得分`
- `硬冲突字段`
- `待确认字段`
- `为什么排前面`

### 7.8 AI 字段提取协议 v1

> 本节是 V1 的核心协议。  
> 它回答的是：  
> “AI 在拿到一段新的转录稿后，到底应该如何更新客户字段？”  
>
> 目标不是让 AI 写一篇总结，而是让 AI 稳定地产出一个可自动入库的增量更新包。

#### 7.8.1 协议目标

AI 字段提取协议 v1 的目标有 5 个：

1. 从一段新的转录稿中提取本次出现的关键信息
2. 只更新本次音频中明确提到的字段
3. 不清空未提及的旧字段
4. 对冲突、敏感和低置信度字段进行标注
5. 自动生成下一步补问问题，减少红娘思考成本

#### 7.8.2 协议不做什么

协议明确不允许 AI 做以下事情：

1. 为了“看起来完整”而编造字段
2. 因客户气质、说话方式、身份印象而猜测敏感字段
3. 用模糊新信息覆盖明确旧信息
4. 把红娘提问误当成客户事实
5. 把 MBTI、INTP、Big Five 等测评型人格结果当成 V1 核心字段自动写入

#### 7.8.3 AI 的输入包

每次处理新音频时，AI 必须同时拿到以下输入：

##### 输入 A：系统上下文（非 AI 推断）

- `matchmaker_id`
- `matchmaker_name`
- `profile_id`
- `profile_gender`
- `conversation_id`
- `uploaded_at`
- `audio_duration`

这些字段由系统上下文直接提供，不需要 AI 从文本中猜。

##### 输入 B：当前客户快照

系统应把该客户当前已经生效的字段快照传给 AI，例如：

- 当前基础事实字段
- 当前关系模式字段
- 当前偏好字段
- 当前生活方式字段
- 当前相处与推进字段

AI 必须把这些旧值视为“当前档案”，而不是忽略它们。

##### 输入 C：本次转录稿

- `transcript`
- 若有，则传 `transcript_verbose_json`

##### 输入 D：字段说明书

系统必须把第 7.5 节中的 V1 最小必要字段定义以机器可读方式提供给 AI，包括：

- 字段名
- 中文含义
- 允许值
- 提取规则
- 更新规则
- 是否敏感
- 是否参与匹配

#### 7.8.4 AI 的总工作顺序

AI 处理一段新转录稿时，必须按如下顺序工作：

1. 识别这次音频中出现了哪些“明确新信息”
2. 与当前客户快照比较，判断哪些字段：
   - 有新值
   - 无变化
   - 与旧值冲突
   - 仍然缺失
3. 将可自动更新的字段写入 `field_updates`
4. 将有冲突或低置信度的字段写入 `review_required`
5. 将关键缺失字段写入 `missing_critical_fields`
6. 为这些缺失字段生成 `suggested_followup_questions`

#### 7.8.5 字段处理分级

V1 中，AI 对字段的处理必须按以下 4 级执行。

##### A 级：系统字段

这些字段由系统直接提供，不依赖 AI：

- 负责人红娘
- 客户
- 上传时间
- 音频文件
- 音频时长

AI 不能修改这些字段，只能在发现明显上下文问题时提出异常。

##### B 级：直接事实字段

这些字段在客户明确说出时，可以直接自动更新：

- 姓名
- 年龄
- 所在城市
- 常驻城市
- 学历
- 职业
- 年收入
- 资产情况
- 婚史
- 是否有孩子
- 孩子情况

##### C 级：三态敏感字段

这些字段必须遵循 `yes / no / unknown` 规则：

- 女方是否接受标准婚恋
- 女方是否接受恋爱且带经济安排
- 女方是否接受生育资产安排型
- 是否接受异地
- 是否愿意迁居
- 是否接受对方有孩子
- 是否接受婚前协议

AI 只有在客户明确表态时，才能写 `yes` 或 `no`；否则只能保留 `unknown`。

##### D 级：总结字段

这些字段允许 AI 基于本次对话做保守总结，但默认不作为硬筛选：

- 沟通风格
- 推进节奏
- 情绪稳定
- 当前最大顾虑
- 隐性期待
- 红娘跟进建议

#### 7.8.6 输出合同（JSON Contract）

AI 的输出必须是结构化 JSON，且默认采用以下顶层结构：

```json
{
  "field_updates": [],
  "review_required": [],
  "missing_critical_fields": [],
  "suggested_followup_questions": [],
  "summary_updates": {},
  "processing_notes": []
}
```

##### `field_updates`

表示本次可以自动写入当前档案的字段变更。

每一项格式建议为：

```json
{
  "field_key": "annual_income",
  "field_label": "年收入",
  "action": "set",
  "new_value": 500,
  "old_value": 300,
  "confidence": "high",
  "evidence_excerpt": "今年税前差不多五百万吧",
  "reason": "客户明确给出当前收入信息",
  "auto_apply": true
}
```

##### `review_required`

表示本次不建议直接自动写入、需要进入异常确认页的字段。

每一项格式建议为：

```json
{
  "field_key": "name",
  "field_label": "姓名",
  "issue_type": "identity_conflict",
  "old_value": "王先生",
  "candidate_value": "李先生",
  "confidence": "medium",
  "evidence_excerpt": "你叫李某某对吧",
  "reason": "可能出现客户身份归属或称呼混淆"
}
```

##### `missing_critical_fields`

表示当前仍缺失、且会显著影响匹配或推进的重要字段。

例如：

```json
[
  "男方关系模式",
  "女方是否接受恋爱且带经济安排",
  "是否接受对方有孩子"
]
```

##### `suggested_followup_questions`

表示 AI 推荐红娘下一轮线下补问的问题，要求：

- 一问一事
- 口语化
- 可直接拿去问
- 优先覆盖缺失关键字段

例如：

```json
[
  "如果对方是带明确经济支持安排的恋爱关系，你能接受吗？",
  "你对异地关系是完全不能接受，还是看人可以商量？"
]
```

##### `summary_updates`

用于承载本次允许 AI 总结但不属于硬事实的内容，例如：

- `emotion_stability`
- `communication_style`
- `hidden_expectations`
- `followup_strategy`

##### `processing_notes`

用于记录 AI 在本次处理中遇到的问题，例如：

- 转录中有明显歧义
- 说话人身份可能混淆
- 时间信息不确定
- 某字段证据不足，只能保持 unknown

#### 7.8.7 字段级动作规范

V1 中，AI 更新字段时只允许使用以下动作：

- `set`
  - 用于单值字段
- `append_unique`
  - 用于兴趣、城市等可增量合并的数组字段
- `replace`
  - 仅用于“新明确值覆盖旧明确值”的场景
- `no_change`
  - 本次未提及或证据不足
- `review`
  - 不建议自动写入，需要异常确认

禁止出现“整对象整体覆盖”的动作。

#### 7.8.8 置信度规范

V1 建议统一使用 3 档置信度：

- `high`
- `medium`
- `low`

##### `high`

满足以下任意一种：

- 客户直接给出明确事实值
- 客户直接表态 yes/no
- 旧值与新值一致且本次再次确认

##### `medium`

满足以下场景：

- 客户表达较清楚，但有一点口语模糊
- 可以合理归一化，但仍有轻微解释空间

##### `low`

满足以下场景：

- 没有直接表述，只能保守总结
- 可能混有红娘提问语境
- 说话对象不完全清晰

`low` 置信度字段默认不直接自动写入硬事实字段。

#### 7.8.9 证据片段要求

对于以下字段，AI 输出时必须尽量附带 `evidence_excerpt`：

- 年龄
- 年收入
- 婚史
- 是否有孩子
- 男方关系模式
- 女方是否接受特殊关系模式
- 是否接受异地
- 是否接受对方有孩子
- 生育意愿

原因：

- 这些字段风险高
- 容易影响匹配结果
- 后续冲突时必须可回溯

#### 7.8.10 自动入库规则

AI 不是所有字段都自动写入，必须按以下策略决定。

##### 自动写入

满足以下条件时可自动写入：

1. 字段属于 B 级直接事实字段或明确三态字段  
2. 证据充分  
3. 置信度为 `high`  
4. 不存在身份归属疑问  
5. 不存在明显上下文冲突

##### 进入异常确认页

满足以下任一条件时进入 `review_required`：

1. 与旧值明显冲突
2. 字段涉及客户身份识别
3. 置信度为 `low`
4. 说话对象可能不是客户本人
5. 同一句里存在反复否定或自我修正

#### 7.8.11 `unknown` 的协议规则

`unknown` 是正式值，不是报错，也不是漏填。

AI 必须遵守以下规则：

1. 没提到，不要乱填 `no`
2. 没有明确表达，不要从语气推 yes/no
3. `unknown` 不覆盖已有 `yes/no`
4. 若某字段是关键缺失项，除了保持 `unknown`，还要生成补问

#### 7.8.12 冲突处理规则

AI 遇到新旧冲突时，必须按以下顺序判断：

1. 新值是否明确？
2. 旧值是否明确？
3. 谁更新得更晚？
4. 是否有直接证据片段？

执行规则：

- 新明确值 > 旧明确值：允许覆盖
- 新模糊值 < 旧明确值：不得覆盖
- 新旧都明确但冲突大：写入 `review_required`
- 新旧一致：可作为再次确认，但不必强制更新

#### 7.8.13 敏感模式专门协议

关于以下字段，AI 必须更保守：

- 男方关系模式
- 女方是否接受恋爱且带经济安排
- 女方是否接受生育资产安排型

协议要求：

1. 必须有客户明确表达
2. 表达不清时只能 `unknown`
3. 若女方未明确说过，不得默认 `no`
4. 若为 `unknown`，候选仍可进入基础匹配，但必须打上 `pending_confirmation`
5. AI 必须自动生成下一步补问问题

#### 7.8.14 情绪稳定协议（V1 简化版）

用户已明确要求第一版不拆分情绪稳定。  
因此 V1 只允许以下取值：

- `稳定`
- `一般`
- `敏感`
- `unknown`

AI 填写规则：

- 只有客户明确描述自己的脾气、情绪反应、冲突反应时，才允许写入
- 不允许仅凭说话语气、声音平静或表达风格直接判断
- 证据不足时统一写 `unknown`

#### 7.8.15 字段缺失优先级

AI 生成补问时，必须优先覆盖以下字段：

##### 一级优先

- 男方关系模式
- 女方对特殊关系模式的接受状态
- 婚史
- 是否有孩子
- 是否接受对方有孩子
- 生育意愿

##### 二级优先

- 年龄范围
- 城市 / 异地 / 迁居
- 收入要求
- 兴趣爱好
- 作息习惯
- 沟通风格

##### 三级优先

- 当前最大顾虑
- 隐性期待
- 跟进建议细节

#### 7.8.16 建议的系统提示词结构

最终落地时，系统提示词建议按 6 段组织：

1. 角色定义  
   - 你是婚恋字段提取与增量更新引擎
2. 总原则  
   - 只提明确、不乱猜、保留 unknown、输出 patch
3. 字段字典  
   - 引用第 7.5 节字段说明
4. 更新协议  
   - 引用第 7.6 节规则
5. 输出合同  
   - 按本节 JSON Contract 输出
6. 质量要求  
   - 敏感字段必须附证据、缺失字段必须补问

#### 7.8.17 一个最小示例

输入：

- 当前档案：
  - 年收入 = 300
  - 女方是否接受恋爱且带经济安排 = unknown
- 新转录稿：
  - “我今年税前大概五百万。”
  - “如果边界清晰的话，这种带经济安排的恋爱我能接受。”

理想输出：

```json
{
  "field_updates": [
    {
      "field_key": "annual_income",
      "field_label": "年收入",
      "action": "replace",
      "new_value": 500,
      "old_value": 300,
      "confidence": "high",
      "evidence_excerpt": "我今年税前大概五百万",
      "reason": "客户明确给出新的收入信息",
      "auto_apply": true
    },
    {
      "field_key": "accepts_mode_compensated_dating",
      "field_label": "女方是否接受恋爱且带经济安排",
      "action": "set",
      "new_value": "yes",
      "old_value": "unknown",
      "confidence": "high",
      "evidence_excerpt": "这种带经济安排的恋爱我能接受",
      "reason": "客户明确表达接受",
      "auto_apply": true
    }
  ],
  "review_required": [],
  "missing_critical_fields": [],
  "suggested_followup_questions": [],
  "summary_updates": {},
  "processing_notes": []
}
```

---

## 八、V2 候选扩展字段：兴趣、生活习惯、情绪稳定与人格框架

> 本章用于记录未来扩展方向。  
> 其中只有已经被第 7.5 节纳入的最小必要字段，才属于 V1 AI 自动提取与匹配的核心字段。  
> MBTI、Big Five、Attachment、HEXACO 等内容当前不进入 V1 核心自动匹配，只作为后续扩展储备。

### 8.1 兴趣爱好

兴趣不是只有一个 `hobbies` 数组就够了。  
建议至少分成以下几类：

- `hobbies`：通用兴趣标签
- `interest_tags`：更宽泛的兴趣方向
- `cultural_preferences`：艺术、展览、阅读、音乐会、戏剧、收藏等
- `travel_style_tags`：旅行方式
- `social_scene_tags`：偏好的社交场景
- `hobby_ranked_tags`：高频兴趣排序

### 8.2 生活习惯

建议至少采集：

- 是否抽烟
- 是否喝酒
- 健身/运动习惯
- 饮食习惯
- 睡眠规律
- 作息偏好
- 是否整洁有序
- 是否依赖固定日程
- 周末习惯
- 是否需要大量独处时间
- 社交耗能/充能方式
- 是否接受高频应酬/聚会

### 8.3 情绪稳定

“情绪是否稳定”不能只做一个笼统字段。  
必须拆成可观察维度：

- `emotional_regulation`
- `stress_reactivity`
- `anger_threshold`
- `recovery_speed_after_conflict`
- `rumination_tendency`
- `reassurance_need`
- `jealousy_tolerance`
- `empathy_level`
- `emotional_expression_style`

原因：

- 这些维度更适合从对话中提取
- 更适合红娘线下观察补充
- 更适合进入匹配模型

### 8.4 MBTI / INTP 等类型字段

MBTI 可作为展示友好的性格标签，但默认不作为唯一底层模型。

#### 平台对 MBTI 的处理原则

1. 允许存客户自报的 MBTI 类型
2. 允许 AI 给出低置信度假设
3. 不允许把 AI 假设直接当成硬事实
4. 匹配时优先使用底层维度，而不是只用四个字母

#### INTP 的字段表达方式

不能只存“是否 INTP”，建议同时存：

- `mbti_self_reported_type`
- `mbti_ai_hypothesis_type`
- `mbti_confidence`
- `mbti_ei_score`
- `mbti_sn_score`
- `mbti_tf_score`
- `mbti_jp_score`
- `mbti_facet_notes`

#### INTP 的判断基础

AI 只能根据对话中的可观察行为线索做低置信度假设，判断线索包括但不限于：

- 是否偏爱独处恢复精力
- 是否偏好抽象与概念讨论
- 是否偏好逻辑分析而非情绪驱动
- 是否喜欢保留选择、不爱过早收口
- 是否偏理论化、系统化理解问题

### 8.5 其他更适合做底层匹配的人格框架

除了 MBTI，平台建议同时支持以下体系：

#### Big Five

适合作为底层匹配分的稳定人格维度：

- `openness`
- `conscientiousness`
- `extraversion`
- `agreeableness`
- `emotional_stability`

其中 `emotional_stability` 对长期相处尤其重要。

#### Attachment（依恋）

适合婚恋关系匹配：

- `attachment_anxiety`
- `attachment_avoidance`

#### HEXACO

对于高净值场景尤其重要：

- `honesty_humility`
- `emotionality`
- `conscientiousness`

其中 `honesty_humility` 对涉及资产、边界、操控风险的关系判断有参考价值。

---

## 九、AI 处理流程（详细版）

### 9.1 模型与接口选型

基于当前供应商能力与项目目标，V1 采用：

- 音频转录主链路：`Groq Speech-to-Text`
  - 默认模型：`whisper-large-v3-turbo`
  - 调用策略：优先使用 `url` 字段，让 Groq 直接拉取签名 URL
  - 备选兜底：云雾聚合网关的 OpenAI 兼容音频转写接口（当前文档为 `whisper-1`）
- 结构化提取与补问生成主链路：`OpenRouter -> Claude Sonnet 4.6`
  - 默认模型：`anthropic/claude-sonnet-4.6`
  - 调用接口：`/chat/completions`
  - 备选兜底：云雾聚合网关 Claude 兼容接口
  - 最终可选兜底：Anthropic 官方直连（仅在已配置时启用）

#### 9.1.1 为什么转录优先使用 URL

对本项目来说，Groq 转录支持两种输入方式：

- 直接上传 `file`
- 传入远程 `url`

V1 明确优先使用 `url`，理由如下：

1. 原始录音必须先进入平台自己的存储
2. 一旦音频已入库，就不应该再让服务端下载整段文件再转手上传给转录服务
3. URL 方案减少了一次大文件搬运，更适合中长音频
4. 转录失败时可直接重试同一个对象 URL，无需重新上传文件
5. 更利于未来接入后台队列、异步任务和批量重跑

#### 9.1.2 上传与转录必须解耦

平台必须明确区分以下两个阶段：

1. `上传到资料库`
   - 浏览器 -> Supabase Storage
   - 目标是把原始音频安全持久化
2. `发送到转录服务`
   - 服务端生成签名 URL
   - Groq 使用 URL 拉取音频并完成转录

这两个阶段不能在产品文案、状态机、错误提示里混为一谈。  
否则红娘会误以为“Groq 正在上传文件”，从而错误判断问题位置。

### 9.2 完整 Pipeline

```text
Step 1. 红娘上传音频
        -> 音频进入 Supabase Storage
        -> conversations 创建记录

Step 2. 服务端生成短时效签名 URL
        -> 指向 Storage 中的原始音频对象

Step 3. 调用转录模型
        -> 优先把 signed URL 发给 Groq
        -> 获取 transcript
        -> 若接口稳定支持 verbose_json，则保留时间段信息

Step 4. 调用 Claude 做结构化提取
        -> 输出 profiles / intentions / trait_profiles / raw_notes
        -> 输出缺失字段 missing_fields
        -> 输出补问建议 suggested_questions
        -> 输出客户摘要 ai_summary

Step 5. 自动入库
        -> 低风险字段默认直接同步到当前档案
        -> 对不确定字段保留 unknown
        -> 对冲突/敏感/低置信度字段生成异常项

Step 6. 触发匹配
        -> 基础字段匹配
        -> 敏感模式叠加判断
        -> 输出 confirmed / pending_confirmation / rejected

Step 7. 自动生成后续任务
        -> 对 pending_confirmation 的候选生成 followup_tasks
        -> 给红娘明确下一步问什么

Step 8. 红娘线下补问
        -> 上传新音频
        -> AI 更新字段
        -> 重跑匹配
```

### 9.3 V1 对长音频的处理策略

V1 暂不以“自动分段”作为前提能力。  
先把“整段音频 + URL 转录”跑稳，再决定是否进入分段架构。

当前策略：

1. 默认整段转录
2. 优先走 URL 而不是服务端二次转传文件
3. 超过明确大小限制时才拦截或提示压缩
4. 对于长音频的性能问题，优先通过：
   - URL 模式
   - 后台异步处理
   - 更清晰的前端状态机
   来改善

不在 V1 先做：

- 自动静音切段
- overlap 分段
- 多段 transcript 合并去重
- 段首上下文补偿

这些属于 V1.5 / V2 优化项，不阻塞当前主链路稳定性。

### 9.4 V1 不做说话人分离时的提取策略

当前音频处理阶段采用如下策略：

1. 默认一段音频对应“红娘 + 单一客户”
2. Prompt 中明确要求：
   - 只提取客户明确表达的信息
   - 红娘提问句不写入客户事实字段
3. 若出现明显多方混杂，允许 AI 把不确定内容写入 `extraction_notes`
4. 对低风险字段默认自动入库；只有明显异常时才进入红娘异常确认页

### 9.5 AI 的输出不止结构化字段

AI 每次处理后，必须至少输出 5 类结果：

1. `structured_fields`
2. `ai_summary`
3. `raw_notes`
4. `missing_fields`
5. `suggested_questions`

这样 AI 才真正是在减少红娘的人工整理成本。

---

## 十、匹配引擎设计

### 10.1 匹配不是“一套分数”，而是“两层判断”

第一层：基础匹配  
第二层：敏感模式与待确认逻辑

### 10.2 第一层：基础匹配

基于以下字段进行基础相容度计算：

- 年龄
- 城市 / 常驻地 / 定居意愿 / 迁居意愿
- 婚史
- 孩子情况
- 生育意愿与时间窗口
- 学历 / 行业 / 工作方式
- 收入 / 资产 / 资源层级
- 兴趣爱好
- 生活习惯
- 性格结构
- 情绪稳定度
- 沟通风格 / 推进节奏

### 10.3 第二层：敏感模式覆盖

若男方 `relationship_mode` 为某一类，则检查女方对应状态：

- 女方 `yes`
  - 进入 `confirmed`
- 女方 `no`
  - 进入 `rejected`
- 女方 `unknown`
  - 进入 `pending_confirmation`

### 10.4 `unknown` 的处理逻辑

这是整个系统最重要的业务规则之一：

- `unknown` 不直接拦截基础匹配
- `unknown` 会降低最终可推进等级
- `unknown` 会触发补问任务
- `unknown` 的候选不能伪装成已确认

### 10.5 候选类型定义

#### confirmed

- 基础条件匹配良好
- 敏感模式已明确可接受
- 可作为红娘的正式推荐候选

#### pending_confirmation

- 基础条件匹配良好
- 但存在一个或多个待确认敏感字段
- 系统给出推荐，但必须附带“待补问”标记和问题清单

#### rejected

- 存在明确冲突
- 不进入推荐列表

### 10.6 匹配评分建议（V1）

总分仍按 100 分建模，但不再只有 5 个粗维度，建议扩展为：

| 维度 | 权重 | 说明 |
|---|---:|---|
| 基础意图与人生阶段 | 15 | marriage / dating / fertility 以及婚育阶段相容性 |
| 城市与流动方式 | 10 | 常驻地、定居地、迁居意愿、异地容忍度 |
| 婚育事实与边界 | 15 | 婚史、孩子、生育安排 |
| 经济与资源层级 | 10 | 收入、净资产、支持能力、现实条件 |
| 兴趣与生活方式 | 15 | 爱好、作息、社交方式、消费方式 |
| 情绪与人格结构 | 15 | Big Five、依恋、情绪调节、冲突风格 |
| 关系经营方式 | 10 | 推进节奏、沟通频率、亲密边界 |
| 敏感模式确认度 | 10 | yes / unknown / no 对最终推进等级的影响 |

> 备注：  
> “敏感模式确认度”会影响候选类别与排序，但 `no` 不是扣分，而是直接排除。

### 10.7 推荐展示规则

- 前台主显 Top1
- 后台保留 Top3
- 若存在 `confirmed`，优先展示 Top1 confirmed
- 若没有 `confirmed`，则展示 Top1 pending_confirmation
- `pending_confirmation` 必须显示：
  - 待确认字段
  - AI 推荐补问
  - 为什么先进入候选

---

## 十一、AI 生成补问任务的规则

### 11.1 AI 必须知道自己要补什么

对每个候选，AI 必须能回答这三个问题：

1. 这对为什么基础上值得继续看？
2. 当前卡在哪些未知字段上？
3. 红娘下一步具体该问什么？

### 11.2 典型补问场景

#### 场景 A：女方是否接受 `compensated_dating` 未知

AI 输出：

- `required_followup_fields = ['accepts_mode_compensated_dating']`
- `suggested_questions = [...]`

#### 场景 B：女方是否接受 `fertility_asset_arrangement` 未知

AI 输出：

- `required_followup_fields = ['accepts_mode_fertility_asset_arrangement']`
- `suggested_questions = [...]`

#### 场景 C：情绪稳定度与冲突风格信息太少

AI 输出：

- `missing_fields = ['stress_reactivity', 'conflict_style', 'repair_style']`
- 生成更柔和的生活化补问

### 11.3 补问任务的目标

补问不是为了让红娘机械问卷化，而是为了：

- 缩小未知范围
- 验证高价值候选
- 让下一次上传的音频更高质量

---

## 十二、UI / 布局 / 交互重构方案

> 本节是对现有页面体验问题的正式重构方案。  
> 当前系统的业务闭环已基本成立，但界面层仍存在以下明显问题：
>
> 1. 页面更像“功能堆叠型后台”，而不是“高净值人群的私人撮合工作台”
> 2. 信息层级太平，摘要、证据、操作、异常抢占同一视觉权重
> 3. 录音详情弹窗过窄、过长、过像数据容器，缺少工作台质感
> 4. 转录全文与 AI 结论没有被清晰地拆为“证据区”和“结论区”
> 5. 多处页面直接暴露英文枚举值 / 原始字段名 / 原始结构化数据，对红娘不友好
> 6. 当前配色、阴影、卡片节奏不够克制，不符合高质量、高净值客户场景

### 12.1 体验重构目标

本轮 UI 重构不只是“把页面做漂亮”，而是要把整个产品的交互心智，从：

- 老派婚介后台
- 会所式深色工作台
- 功能堆叠型 Dashboard

升级为：

**Apple 式轻工作台（Apple-style Light Productivity Workspace）**

即：

- 更年轻，而不是更老派
- 更顺滑，而不是更厚重
- 更明亮，而不是更压暗
- 更像现代生产力工具，而不是像礼宾接待空间
- 更适合 20~30 岁红娘高频使用，而不是只在第一眼显得“高端”

这轮重构必须明确服务于以下真实使用场景：

1. 红娘需要每天长时间停留在系统中处理客户、录音、匹配与补问
2. 页面需要支持高频查看、切换、筛读和判断，而不是只适合展示
3. 红娘进入页面后，首先需要看到“人是谁、现在处在哪个阶段、下一步做什么”
4. 系统必须通过更轻的视觉层次来提升效率，而不是通过更重的装饰来营造高级感

重构后的 UI 必须同时满足：

1. 年轻专业的信任感，而不是传统婚介机构感
2. 红娘高频操作下的顺滑度与耐看度
3. 证据、结论、动作之间的清晰分层
4. 低认知负担
5. 易迁移、易维护、可渐进替换
6. 与核心主链路高度协同，不为审美牺牲主工作流可用性

### 12.1.1 目标用户与审美基准

本轮重构的默认主用户不是“机构老板”或“传统婚介从业者”，而是：

- 20~30 岁的红娘
- 高频使用工作台的顾问型操作人员
- 需要在一天内多次往返客户详情、录音处理、匹配推进与提醒中心的实际操作者

因此本轮审美基准必须是：

- 现代
- 清爽
- 轻盈
- 精密
- 有秩序
- 有科技产品感，但不过度炫技

而不是：

- 深色奢华
- 暖金厚重
- 会所礼宾
- 老派顾问室
- 传统婚介“高端接待空间”气质

### 12.2 目标气质与审美方向

本项目不应再沿用当前“暖金、深棕、私享顾问室”路线。  
该路线已经被证明不适合当前产品，原因如下：

1. 太像会所或接待空间，而不像年轻红娘日常高频使用的工具
2. 深色与暖棕体系会压暗页面，降低长时间使用的舒适度
3. 一旦叠加渐变、圆角、阴影和状态色，就很容易显得油、厚、旧
4. 它能制造“第一眼高端”，但不能制造“长期顺手”

新的目标风格应统一为：

- 年轻
- 轻
- 净
- 准
- 顺
- 克制
- 现代
- 有生产力工具的秩序感

建议的整体风格锚点：

- 不是“粉色婚恋 App”
- 不是“标准 SaaS 卡片拼盘”
- 不是“深棕顾问会所后台”
- 不是“苹果官网式营销页”
- 而是“Apple 式生产力工作台 + 人物档案工作台”

### 12.2.1 一句话风格定义

重构后的 Matchmaking Studio 应该看起来像：

**一套年轻红娘会愿意每天打开、长时间停留、并自然信任的现代客户工作台。**

### 12.2.2 视觉反目标（Anti-goals）

以下方向明确禁止继续投入：

1. 大面积暖金、深棕、酒红棕主视觉
2. 会所感、礼宾感、奢侈接待空间感
3. 大量重阴影、厚描边、重圆角堆叠
4. 每个状态都用高饱和 badge 争抢注意力
5. 过于像模板 Dashboard 的“卡片墙”
6. 过于像 landing page 的大 Hero / 强装饰科技感
7. 用“高级”作为理由保留难读、压暗、厚重的视觉体系

### 12.3 视觉语言要求

#### 12.3.1 配色原则

配色必须围绕“Apple 式轻工作台”重做，核心不是“好看”，而是：

- 明亮但不刺眼
- 清爽但不苍白
- 年轻但不幼稚
- 克制但不冷漠

推荐主题方向：

- 背景：雾白 / 冷白 / 极淡灰白
- 主文字：石墨黑 / 深灰黑
- 次级文字：中性冷灰
- 面板：纯净浅色 surface，而不是奶油厚卡
- 强调色：只保留 1 个主强调色，建议先试偏系统化的蓝灰、冷灰蓝、冷紫灰其一
- 状态色：整体降饱和，优先灰阶，只有关键动作与关键异常需要发声

配色设计必须遵守以下要求：

1. 页面底色不能继续偏棕
2. 侧边栏不能继续用深色作为主视觉存在感来源
3. 边框必须更轻、更薄、更稳定
4. 阴影必须更浅、更软，而不是厚重下沉
5. 状态色数量必须减少，避免彩虹式 badge

不建议：

- 大面积纯白 + 亮粉主按钮
- 继续保留深棕品牌墙式侧边栏
- 到处使用同一种浅彩色胶囊标签
- 每个业务状态都用高饱和色争抢注意力
- 用“高级”作为理由保留压暗页面的综合色系

#### 12.3.1.1 颜色系统分层

颜色系统后续必须按以下层级组织：

1. **Canvas 层**
   - 页面背景
   - 大区域背景
   - 结构性分区底色

2. **Surface 层**
   - 卡片
   - 面板
   - 弹窗
   - 输入区

3. **Content 层**
   - 主标题
   - 正文
   - 注释
   - 次级说明

4. **Semantic 层**
   - 主要动作
   - 待处理
   - 已完成
   - 风险/异常

后续任何页面都不允许绕过这四层直接随意写色。

#### 12.3.2 字体与排版

字体策略不强依赖新字体接入，但必须通过字号、字重、行高和留白形成层级。

要求：

- 标题、数字、时间、状态要有明显等级差
- 长摘要必须可读，不能像日志
- 原始转录要采用更舒展的行高与段距
- 标签类文本必须短、准、可扫描

禁止：

- 把大段说明文本塞在狭窄卡片里
- 所有层级都用同一套 14px / 16px 文本

#### 12.3.2.1 排版风格要求

排版应更接近现代系统工具，而不是厚重品牌展示页：

1. 标题必须更干净，不要再依赖装饰性背景托住标题
2. 数字与状态必须一眼可扫
3. 长摘要与说明必须有舒展行高
4. 二级说明必须安静，不抢主结论
5. 页面中的“对象信息”“当前状态”“下一步动作”要有清晰字体等级差

#### 12.3.2.2 留白要求

当前页面不顺滑的根因之一是“局部精致，但呼吸感不足”。  
重构后必须通过留白解决以下问题：

- 卡片之间不要都挤在一起
- section 之间必须有明确的间隔层级
- 顶部标题区和内容区之间要有更清晰的节奏
- 重要信息不能被太多边框和背景包裹

留白不是浪费空间，而是这轮重构建立高级感与顺滑度的核心方式。

#### 12.3.3 图标系统

全站统一使用 `lucide-react`。  
不使用 emoji，不混用多套 icon 风格。

#### 12.3.4 材质与层次原则

当前界面不够顺滑，除了颜色，另一个原因是材质层次太重。  
后续必须统一改成更轻的系统化材质：

1. 卡片以轻边框、轻阴影和浅背景分层
2. 不再依赖“彩色描边 + 厚阴影 + 渐变背景”来制造存在感
3. 选中态优先通过位置、尺寸、轻描边、轻底色来强调
4. 导航和工作区之间的层次要通过结构区分，而不是重色区分
5. 页面主角应该永远是内容，而不是装饰

#### 12.3.5 状态与 badge 规则

当前页面吵闹感很大程度来自状态系统失控。  
后续必须按以下规则统一：

1. 默认状态尽量灰阶
2. 同屏显著强调色控制在 1~2 个
3. badge 数量减少
4. badge 不再承担主要信息表达任务，只做辅助提示
5. `confirmed / pending / done / risk` 这类状态要有稳定语义，不允许页面自创视觉表达

一句话：

**让状态系统服务判断，而不是制造噪音。**

### 12.4 前端资源与方法论使用方式

本项目的 UI 重构必须明确区分以下工具的角色，而不是混着用。

#### 12.4.1 `frontend-design` skill 的作用

本 skill 用于：

- 明确页面的审美立场
- 先做页面层级与视觉 thesis
- 避免落回通用 AI 卡片风格

本项目采用的 `frontend-design` 执行原则为：

- 先定风格，再写页面
- 每个页面只允许一个主视觉任务
- 避免平均用力
- 用“证据区 / 结论区 / 行动区”三分法组织复杂信息
- 页面必须先回答“谁是主角”，再决定装饰怎么做
- 不把“高端感”误解为深色、暖棕、厚重和会所感
- 以 Apple 式轻工作台为默认新基准，而不是继续围绕旧方案微调

#### 12.4.2 [tweakcn](https://tweakcn.com/editor/theme?p=dashboard) 的作用

仅用于主题 token 试色与变量沙盒，不用于决定产品结构。

允许借助它快速试验：

- `background`
- `card`
- `sidebar`
- `primary`
- `accent`
- `border`
- `ring`

最终结果必须回落到项目自己的 CSS Variables，而不是依赖临时在线主题配置。

本项目中，TweakCN 的任务必须收敛为：

1. 为 Apple 式轻工作台方向试出新的全局 token
2. 先完成 sidebar / surface / page background 的气质切换
3. 先验证“轻、净、亮”的整体关系是否成立
4. 不在 TweakCN 中决定页面布局、信息架构和卡片数量

禁止把 TweakCN 当作：

- 完整页面设计工具
- 一键生成最终 UI 的替代品
- 结构设计来源

它只是主题层试验台。

#### 12.4.3 [shadcn/ui](https://ui.shadcn.com/) 的作用

仅作为底层原件库：

- `Dialog`
- `Tabs`
- `Button`
- `Badge`
- `Card`
- `Select`
- `Popover`

禁止把 shadcn 默认样式直接当最终产品样式。  
项目应在其上继续封装业务层组件。

在本项目中，shadcn/ui 只负责：

1. 可访问性
2. 基础交互一致性
3. 组件结构稳定性
4. 作为后续业务组件的骨架层

它不负责：

1. 定义品牌气质
2. 决定最终页面层级
3. 决定是否像 Apple 风格
4. 决定这是不是一套年轻红娘愿意长期使用的工作台

也就是说：

**shadcn/ui 是基础设施，不是最终视觉答案。**

#### 12.4.4 [Tailwind CSS](https://tailwindcss.com/) 的作用

Tailwind 是本项目真正的布局与实现层，用来完成：

- Grid / Flex 结构
- 页面骨架
- 响应式
- 滚动容器
- 间距层级
- 状态切换
- 视觉细节

UI 重构必须优先通过：

- CSS Variables
- 统一 spacing 系统
- `min-h-0 / overflow-y-auto / sticky / grid`

来解决问题，而不是在局部堆补丁。

#### 12.4.5 三者的关系

为了防止后续继续混用，必须统一记住：

- `frontend-design`：先确定新工作台到底长什么气质
- `TweakCN`：把这套气质翻成 token
- `shadcn/ui`：提供稳定原件
- `Tailwind`：真正实现页面结构、节奏、层级和细节

若未来页面继续出现“局部很好看，但整体还像旧后台”，优先检查是否又跳过了这四层顺序。

### 12.5 全局信息架构

当前系统信息架构过于“页面平铺”，缺少稳定的工作台节奏。  
重构后必须统一为：

1. 左侧主导航
2. 顶部上下文条
3. 中央主工作区
4. 右侧辅助工作区（按页面出现）

#### 12.5.1 全局骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ Left Rail                                                         │
│ 品牌 / 当前身份 / 主导航 / 次导航 / 退出                           │
├────────────────────────────────────────────────────────────────────┤
│ Top Context Bar                                                   │
│ 页面标题 / 当前对象 / 最近状态 / 快捷动作                           │
├───────────────────────────────────────────────┬────────────────────┤
│ Main Worksurface                              │ Assist Rail         │
│ 当前主任务内容                                 │ 待补问 / 提醒 / 异常 │
└───────────────────────────────────────────────┴────────────────────┘
```

要求：

- 左侧栏稳定、简洁，不滚动塞太多信息
- 顶部条只承载当前页面上下文
- 右侧辅助区只放“和当前任务强相关”的内容
- 不允许把所有信息都装进同样的圆角白卡片

#### 12.5.2 壳层重构要求

全局壳层是这轮重构的第一优先级，因为它决定整套产品的“空气”。

##### Sidebar

后续必须从“深棕主视觉墙”改成“安静导航层”：

- 降低色彩存在感
- 降低厚重感
- 降低品牌装饰感
- 提升导航项的系统性和秩序感
- 当前项强调应更像系统选中态，而不是营销卡块

##### Top Context Bar

后续必须从“礼宾式标题条”改成“上下文工具条”：

- 更轻
- 更薄
- 更像系统上下文层
- 不承担品牌展示职责
- 重点是告诉红娘当前对象、当前阶段、当前动作

##### Main Worksurface

主工作区后续必须：

- 优先保证主任务内容一眼可读
- 减少无意义的嵌套壳层
- 用 section 层级而不是彩色卡片分区
- 避免每个区域都像主角

##### Assist Rail

辅助栏必须真正辅助，而不是第二个主页面：

- 只展示与当前任务强相关的缺口、提醒、异常和下一步动作
- 不能再变成杂项容器
- 在移动端或窄屏下应自然下沉，而不是强行并列

#### 12.5.3 壳层验收判断

当全局壳层重构完成后，应满足：

1. 用户第一眼不会再把产品认成“深色婚介后台”
2. 侧边栏不再成为视觉主角
3. 顶部条不再像品牌展示区
4. 中央内容自然成为第一焦点
5. 页面整体显著变轻、变亮、变顺滑

### 12.6 页面骨架总原则

所有高复杂度页面必须按以下三层组织：

1. **Context**：当前对象是谁、当前处在哪个阶段
2. **Evidence**：系统依据什么得出当前结论
3. **Action**：红娘下一步要做什么

这三层必须清晰可见，且顺序稳定。  
如果页面无法回答这三件事，则说明布局不合格。

### 12.6.1 前端展示语义层规则

客户详情页、审核页、录音详情页、补问页等所有面向红娘的界面，必须增加“展示语义层”，不能直接把数据库值当作 UI 值使用。

#### 12.6.1.1 存储语义与展示语义必须分离

系统内部可继续使用：

- `yes`
- `no`
- `unknown`
- `null`
- 枚举型内部值（如 `marriage_standard`、`compensated_dating`）

但前端显示时必须转换为红娘能立即理解的语言：

- 只读态：
  - `yes` -> `接受` / `愿意`
  - `no` -> `不接受` / `不愿意`
  - `unknown` -> `待确认`
  - `null` -> `未填写`
- 编辑态：
  - 未确认值默认显示 `请选择`
  - 不允许直接把 `unknown` 显示成下拉框当前值
  - 不允许在 placeholder 中出现数据库枚举原词

#### 12.6.1.2 前端禁止出现的内容

以下内容不得直接暴露在红娘界面中：

- `unknown`
- `yes`
- `no`
- `null`
- `compensated_dating`
- `fertility_asset_arrangement`
- 任何仅供数据库或协议层使用的原始枚举值

#### 12.6.1.3 V1 常规主视图中的字段收敛

以下字段在 V1 中不应继续作为常规客户详情编辑区的高频字段主显：

- 男方关系模式
- 女方是否接受恋爱且带经济安排
- 女方是否接受生育资产安排型

这些字段若仍需保留：

- 只能进入折叠区、管理员区或后续版本的特殊模式模块
- 不能和年龄、城市、学历、婚史、孩子、生育意愿等通用信息放在同一优先级

V1 的前端主视图优先展示与补全：

- 基础身份信息
- 城市与迁移意愿
- 学历与职业
- 婚史与是否有孩子
- 是否接受对方婚史 / 是否接受对方有孩子
- 生育意愿
- 是否接受异地

### 12.6.2 头像与生活照分离规则

在红娘工作流中，头像和生活照不是同一种资料，必须分开建模与分开展示。

#### 12.6.2.1 头像的定义

头像是“识别图”，服务于：

- 客户列表缩略图
- 客户详情页头部 Hero
- 任何需要红娘一眼识别客户是谁的场景

头像规则：

- 每位客户只有 1 张当前生效头像
- 头像优先用于识别，不承担生活展示职责
- 头像应优先选择清晰、稳定、便于识别的正脸或半身图

#### 12.6.2.2 生活照的定义

生活照是“资料图”，服务于：

- 补充了解客户气质、状态与生活方式
- 在详情页内部作为资料查看

生活照规则：

- 允许多张
- 只能作为详情页资料补充
- 不承担客户列表或缩略图识别职责

#### 12.6.2.3 前端使用规则

前端必须遵守以下显示优先级：

- 客户列表卡片：只显示头像
- 客户详情页头部：只显示头像
- 侧边缩略识别位：只显示头像
- 生活照仅出现在客户详情页的资料图片区

若没有头像：

- 一律显示默认占位图
- 不允许自动拿生活照顶替头像

#### 12.6.2.4 上传交互规则

红娘端必须提供两个分开的上传入口：

- `上传头像`
- `上传生活照`

不允许让红娘继续通过填写 URL 来区分头像与生活照，也不允许继续把两类图片混在同一个字段里处理。

### 12.7 红娘端客户详情页

客户详情页不应该只是“字段 tab 容器”，而应该是一张“客户推进工作台”。

#### 12.7.1 页面骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ Client Hero                                                       │
│ 姓名 / 性别 / 年龄 / 城市 / 当前状态 / 最近更新                    │
│ 主意图 / 关系模式 / 当前匹配阶段 / 快捷动作                        │
├────────────────────────────────────────────────────────────────────┤
│ Section Nav                                                       │
│ 基本信息 | 录音记录 | 匹配推荐 | 跟进记录 | 风险与缺口             │
├───────────────────────────────────────────────┬────────────────────┤
│ Main Content                                  │ Assist Rail         │
│ 当前 tab 主内容                                │ 待补问 / 提醒 / 异常 │
└───────────────────────────────────────────────┴────────────────────┘
```

#### 12.7.2 体验要求

- 页面头部必须让红娘 3 秒内看到客户当前状态
- 头部不应堆满字段，应只显示最影响推进判断的 6-8 项
- 辅助栏应固定出现：
  - 最近一次 AI 更新
  - 当前缺口
  - 敏感待确认
  - 下一步建议

### 12.8 录音记录页 / 会话时间线

当前录音记录的主要问题是：

- 文字稿与 AI 备注混在一起
- 摘要被截断且层级不清
- 每条录音“不知道值不值得点开”

重构后必须改为“时间线摘要卡”。

#### 12.8.1 页面骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ Recent AI Impact Strip                                            │
│ 本次新增 / 异常 / 缺口 / 最近状态                                  │
├────────────────────────────────────────────────────────────────────┤
│ Conversation Timeline                                             │
│ [会话卡 1] 时间 / 时长 / 状态 / 转录速记 / AI 摘要 / 动作          │
│ [会话卡 2]                                                        │
│ [会话卡 3]                                                        │
└────────────────────────────────────────────────────────────────────┘
```

#### 12.8.2 单条会话卡骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ 时间 / 时长 / 状态 / 处理来源                                      │
├───────────────────────────────┬────────────────────────────────────┤
│ 录音速记                       │ AI 摘要                           │
│ 转录摘要 3-6 行                │ 自动写入 / 缺口 / 关键结论         │
├────────────────────────────────────────────────────────────────────┤
│ 自动写入数量 | 异常数量 | 缺口数量 | 查看详情 | 处理异常           │
└────────────────────────────────────────────────────────────────────┘
```

要求：

- 默认列表只给“值不值得点开”的信息
- 原始全文不直接挤进列表
- 状态必须一眼可扫，不靠长文字解释

### 12.9 录音详情页 / 详情弹窗

当前“查看详细”最大问题有两类：

1. 弹窗太窄、太长、太像表格
2. 转录全文滚动链不稳定，内容可能被截断或无法下滑

重构后必须把它定义成“工作台式详情弹窗”。

#### 12.9.1 页面骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ 顶部 Meta                                                         │
│ 时间 / 时长 / 状态 / 自动写入数 / 异常数 / 缺口数 / 操作按钮       │
├───────────────────────────────────────────────┬────────────────────┤
│ 左：转录全文                                   │ 右：AI 工作摘要     │
│ 可独立滚动                                     │ 可独立滚动          │
│ 证据内容                                       │ AI 结论             │
│                                                │ 自动写入            │
│                                                │ 待确认异常          │
│                                                │ 关键缺口            │
│                                                │ 下一步补问          │
│                                                │ 原始结构化结果      │
└───────────────────────────────────────────────┴────────────────────┘
```

#### 12.9.2 滚动行为要求

这是强制要求：

- 弹窗容器必须有稳定的最大高度
- 左右两列都必须独立滚动
- 父层必须闭合 `height` 链
- 涉及弹窗、grid、flex 的所有上层都必须允许子级滚动
- 不能把滚动压给整个浏览器页面

技术要求：

- 必须使用稳定的 `max-h` 和 `min-h-0`
- Transcript 列和 Summary 列都要显式 `overflow-y-auto`
- 不能只在最内层加 `overflow-y-auto`，而父容器没有 `min-h-0`

#### 12.9.3 信息分区要求

左侧永远只做“证据区”，右侧永远只做“结论区”。

禁止：

- 把原始转录和 AI 结论上下堆在同一列
- 把 10 个信息块全部串成一条长滚动页面

### 12.10 审核页（异常处理页）

审核页的核心不是“录入”，而是“处理异常”。

#### 12.10.1 页面骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ 顶部摘要：本次录音影响了什么                                       │
├───────────────────────────────────────────────┬────────────────────┤
│ 左：证据区                                     │ 右：处理区          │
│ 转录片段 / 高亮证据                             │ 当前值 vs AI 候选   │
│                                                │ 确认控件            │
│                                                │ 跳过                │
│                                                │ 补问建议            │
└───────────────────────────────────────────────┴────────────────────┘
```

#### 12.10.2 展示原则

- 红娘只看“变化”与“风险”
- 不再看完整大表单
- 英文枚举值必须翻成中文业务表达
- 原始字段 key 不能直接暴露给红娘
- 敏感项必须显示证据片段

### 12.11 匹配页

匹配页必须从“分数榜单”升级为“可推进候选工作台”。

#### 12.11.1 页面骨架

```text
┌────────────────────────────────────────────────────────────────────┐
│ 顶部筛选：关系模式 / 状态 / 优先级 / 最近更新                       │
├────────────────────────────────────────────────────────────────────┤
│ 已确认候选                                                        │
│ [Top 1 主卡] 为什么匹配 / 可立即推进 / 关键风险                    │
│ [Top 2-3 次卡]                                                    │
├────────────────────────────────────────────────────────────────────┤
│ 待确认候选                                                        │
│ [候选卡] 缺什么字段 / 应问什么 / 为什么值得继续                    │
└────────────────────────────────────────────────────────────────────┘
```

#### 12.11.2 体验要求

- `confirmed` 与 `pending_confirmation` 必须视觉分区
- `pending_confirmation` 不得伪装成已可推进
- 每张卡片都必须回答：
  - 为什么值得看
  - 缺什么
  - 下一步怎么问

### 12.12 管理端

管理端不应只是普通看板，而应体现“治理能力”。

必须能看：

- 字段完整度
- 录音处理成功率
- 敏感模式候选数量
- 待确认候选积压量
- 红娘补问完成率
- 匹配推进漏斗

### 12.13 业务组件系统

项目不应长期停留在“页面直接拼 Button / Card / Badge”的阶段，必须抽出业务层组件。

建议新增或统一以下组件范式：

- `AppShell`
- `TopContextBar`
- `SectionFrame`
- `SignalBadge`
- `MetricPill`
- `InsightPanel`
- `ConversationSummaryCard`
- `WorksurfaceDialog`
- `EvidencePanel`
- `DecisionPanel`
- `AssistRail`
- `ReviewDeltaCard`

这些组件的目标是：

- 统一页面语言
- 降低页面间的样式漂移
- 让“证据 / 结论 / 动作”在全站重复使用

#### 12.13.1 新组件系统的气质要求

后续业务组件不应继续继承“暖金厚卡”的旧语言，而必须统一转向：

- 更轻的 surface
- 更弱的装饰
- 更明显的层级
- 更像工作台部件，而不是营销卡片

每个业务组件都必须回答：

1. 它是上下文组件、证据组件，还是动作组件？
2. 它是否在当前页面承担主视觉任务？
3. 它是否用了不必要的强调色、描边、阴影或圆角？
4. 它是否可以进一步减轻，而不损失可读性？

### 12.14 主题变量与实现要求

主题必须统一收束到全局 CSS Variables，不允许页面级随意写死颜色体系。

建议在 `app/globals.css` 中完成：

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--primary`
- `--accent`
- `--sidebar`
- `--border`
- `--ring`
- 一组项目级状态色变量

为了支撑 Apple 式轻工作台，变量层还应进一步补足：

- `--surface-1`
- `--surface-2`
- `--surface-3`
- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--status-neutral`
- `--status-attention`
- `--status-success`
- `--status-risk`

要求：

1. `globals.css` 必须成为全局视觉总控层
2. 页面和组件优先引用 token，而不是临时手写颜色
3. sidebar / top bar / card / badge / dialog 必须共同使用同一套 token
4. 任何新页面若继续写死大段颜色，应视为重构未完成

同时对以下基础组件统一二次包装或覆写：

- `Button`
- `Badge`
- `Card`
- `Dialog`
- `Tabs`
- `Input`
- `Textarea`
- `Select`

#### 12.14.1 基础组件覆写要求

##### Button

- 默认按钮必须更像系统动作按钮，而不是品牌展示块
- 主按钮数量应减少
- 次按钮与幽灵按钮需要更安静
- 不允许继续保留明显“暖棕品牌按钮”惯性

##### Badge

- badge 必须缩减视觉存在感
- 不再承担主要层级任务
- 统一高度、圆角、字体和语义颜色

##### Card

- 默认 card 必须变轻
- 边框和阴影统一
- 不再允许页面自己创造“特殊 card 语言”

##### Dialog / Sheet

- 必须更像工作台内的 detail panel
- 不允许继续像厚重弹窗或数据容器
- 滚动与高度链必须由组件范式统一解决

##### Input / Select / Textarea

- 必须体现现代系统控件感
- 更轻、更干净、更一致
- 不允许继续暴露数据库 raw value
- placeholder 与默认值必须遵守前端展示语义层规则

### 12.15 易迁移重构策略

UI 重构必须采用“渐进替换”，不能推倒重来。

迁移顺序固定为：

#### Phase UI-0：主题基础层

- 统一 `globals.css` token
- 用新的 Apple 式轻工作台方向重做：
  - `background`
  - `surface`
  - `text`
  - `sidebar`
  - `border`
  - `ring`
  - `semantic states`
- 统一 sidebar / top bar / 按钮 / badge / dialog / tabs 的视觉语言
- 明确移除深棕暖金路线的残留变量与页面级色彩写法

这一阶段的主要目标不是“改页面”，而是：

**先把整个系统的空气换掉。**

优先文件：

- `app/globals.css`
- `components/ui/*`
- `components/nav/sidebar.tsx`
- `components/nav/top-context-bar.tsx`
- `components/nav/workspace-shell.tsx`

#### Phase UI-1：红娘核心工作流页

- 客户列表页
- 客户详情页头部
- 录音记录页
- 录音详情弹窗
- 审核页

这一阶段的目标是：

- 让客户工作流页面看起来像同一个产品
- 让红娘进入任何一个核心页面都能先看到：
  - 谁
  - 什么状态
  - 下一步做什么
- 把“证据 / 结论 / 动作”真正拆开
- 去掉当前大量“卡片同权”的问题

重点页面：

- `/matchmaker/clients`
- `/matchmaker/clients/[id]`
- `/matchmaker/clients/[id]/conversations/[cid]/review`

#### Phase UI-2：匹配与跟进页

- 匹配列表页
- 匹配详情页
- 跟进记录页
- 提醒中心

这一阶段的目标是：

- 让匹配页不再像分数榜单
- 让提醒中心更像任务面板，而不是提醒堆栈
- 明确 `confirmed / pending_confirmation / followup` 的视觉语义差异
- 让“为什么值得推进、缺什么、该问什么”在卡片上有稳定位置

#### Phase UI-3：管理端

- 管理员 dashboard
- 匹配管理
- 客户治理页

这一阶段的目标是：

- 把治理页做成“运营与质量工作台”
- 统一图表、指标卡、漏斗、筛选器的轻工作台语言
- 避免管理端重新滑回传统深色后台或默认 SaaS 审美

#### 12.15.1 页面优先级固定规则

无论之后如何拆任务，页面优先级固定为：

1. 壳层（shell）
2. 客户列表
3. 客户详情
4. 录音处理页
5. 匹配工作台
6. 提醒中心
7. 管理端

原因：

- 壳层不重做，后续页面都会继续带着旧气质
- 客户和录音页是主工作流最常见入口
- 匹配页的重要性高，但仍晚于主建档链路
- 管理端最后做，避免再次打断主流程

### 12.16 验收标准

UI / 布局重构验收至少满足：

1. 红娘在 3 秒内能判断当前客户处于哪个推进阶段
2. 录音列表不再出现摘要被挤压遮挡的问题
3. “查看详细”中的转录全文可以稳定独立滚动
4. 红娘前台不再直接看到原始英文枚举值和原始字段 key
5. 页面主色、状态色、按钮和 badge 有统一语义，不再漂移
6. `confirmed` 与 `pending_confirmation` 在匹配页上有明确视觉边界
7. 审核页默认只处理差异和异常，不再像大表单
8. 全站只使用 `lucide-react` 图标，不使用 emoji

除此之外，还必须满足以下“新方向验收”：

9. 用户第一眼不再把产品认成深棕婚介后台
10. 侧边栏不再成为页面的视觉主角
11. 顶部条更像上下文工具条，而不是礼宾前台
12. card 体系明显变轻，不再出现厚重奶油卡感
13. 页面能连续浏览 30 分钟以上而不显压暗、压闷
14. 20~30 岁红娘的默认感受应是“现代、清爽、专业”，而不是“老派、隆重、传统”
15. 任意核心页面都能说清：
    - 当前对象是谁
    - 当前处在哪个阶段
    - 系统建议下一步做什么

### 12.17 需求边界说明

本轮 UI / 布局重构属于：

- 产品方向修正
- 视觉系统重建
- 工作台壳层与核心页面结构升级

它不是：

- 单纯美化
- 单页修补
- 换个配色继续沿用旧后台
- 只做一批漂亮截图

后续任何实现若没有改善以下三项中的至少一项，原则上不应算作本轮重构成果：

1. 主工作流顺滑度
2. 信息层级清晰度
3. 年轻化、现代化、轻工作台气质

---

## 十三、提醒与运营规则

### 13.1 提醒类型

1. `no_followup`
   - 某匹配超过 7 天未更新
2. `no_new_info`
   - 某客户超过 30 天无新录音
3. `meeting_reminder`
   - 约谈前 24 小时提醒
4. `pending_confirmation`
   - 某高分候选因为敏感字段未知而长期未补问

### 13.2 新增一个重要运营指标：字段完整度

对于每个客户，系统应计算：

- 基础字段完整度
- 生活方式字段完整度
- 人格字段完整度
- 敏感字段完整度
- 已核验字段占比

这样红娘和管理者都能知道“为什么匹配不够准”，而不是只盯着算法。

---

## 十四、权限与风险控制

### 14.1 基础权限

- `profiles`：红娘只能读写自己客户
- `intentions` / `trait_profiles`：通过 profile_id 关联授权
- `conversations`：红娘只能看自己上传的记录
- `matches`：红娘只能看涉及自己客户的匹配
- `followup_tasks`：红娘只能看分配给自己的任务
- `admin`：拥有全局可见与管理权限

### 14.2 敏感字段的展示要求

以下字段默认仅红娘与管理员可见：

- 联系方式
- 资产区间
- 婚史
- 孩子情况
- 特殊关系模式
- 生育安排
- 经济安排边界

### 14.3 风险控制原则

- 敏感字段必须可回溯来源
- 未确认字段不可伪装为确定事实
- AI 推断型人格标签不得当作唯一决策依据
- “已核验”与“客户自述”必须严格区分

---

## 十五、技术架构

### 15.1 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 16 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| 数据库 | Supabase PostgreSQL |
| 认证 | Supabase Auth |
| 文件存储 | Supabase Storage |
| 转录 | Groq Speech-to-Text（主链路，优先 URL），云雾音频转写接口（兜底） |
| 结构化提取 | OpenRouter Claude Sonnet 4.6（主链路），云雾 Claude 兼容接口（兜底） |
| 任务调度 | Next.js API / 定时任务 / 后续可接 Supabase Webhook |

### 15.2 第三方 API 选型说明

当前采用“主链路 + 兜底链路”的策略：

- Whisper / 转录：
  - 主链路：Groq
  - 优先模式：`signed URL -> Groq`
  - 兜底：云雾 `whisper-1`
- Claude / 结构化提取：
  - 主链路：OpenRouter `anthropic/claude-sonnet-4.6`
  - 兜底：云雾 Claude 兼容接口
  - 最终可选兜底：Anthropic 官方

技术原则：

1. 上传和转录解耦
2. 原始录音必须先入库
3. 转录优先使用 URL，不优先使用服务端二次转传文件
4. V1 先把整段 URL 转录跑稳，不以自动分段为前提
5. 若后续确实出现大文件和长音频瓶颈，再进入 V1.5 的分段架构

### 15.3 UI 设计系统迁移专项方案（参考 `virtuals-whale-radar`）

> 说明：  
> 本节不是“继续微调当前界面”，而是定义一轮新的 UI 架构迁移。  
> 本轮迁移的目标，是将当前项目的界面层从“局部调色 + 手工拼页面”升级为“设计系统驱动的工作台界面”，并参考 `https://github.com/MeiYanDong/virtuals-whale-radar` 中 `frontend/admin` 的 UI 基础设施。  
> **本轮只迁 UI 设计系统，不迁业务逻辑。**

#### 15.3.1 为什么需要这轮迁移

当前项目虽然已经做过一轮“放弃暖金深棕、转向更轻工作台”的调整，但从结果来看仍存在结构性问题：

1. **配色仍不够统一**
   - 登录页仍停留在 `rose / amber` 的临时审美
   - 壳层、内容区、状态色和表单控件之间缺少统一的 token 驱动关系
   - 页面整体不够“年轻、顺滑、干净”，仍带有补丁式改造痕迹

2. **登录页游离于系统之外**
   - 当前登录页更像一个单独的居中卡片 demo
   - 没有与工作台使用相同的 surface、panel、边框、阴影、排版与材质语义
   - 导致用户第一眼进入产品时，就先看到最不统一、最不成熟的一页

3. **全局壳层仍然偏页面拼装式**
   - 当前 `sidebar / top bar / assist rail / main worksurface` 已做过轻量调整，但还没有真正形成“设计系统级的 Visual Shell”
   - 页面之间仍缺乏统一的 header、section、empty state、metric、quick action 组织方式

4. **页面模板复用不足**
   - 当前很多页面仍是“每页各写一套壳层”
   - 相同的页面结构（列表页、详情页、工作台页、审核页）尚未抽象为稳定模板
   - 这会导致后续视觉调整需要逐页回修，成本高、风险大

因此，本轮不是再“修一个登录页”或者“再换一套颜色”，而是要把 UI 层整体升级成：

- token 驱动
- theme 驱动
- shell 驱动
- primitives 驱动
- props 驱动页面模板

#### 15.3.2 参考来源与可迁移范围

本轮迁移明确参考以下路径：

- `virtuals-whale-radar/frontend/admin/src/design-system`
- `virtuals-whale-radar/frontend/admin/src/styles/globals.css`
- `virtuals-whale-radar/frontend/admin/src/components/app-primitives.tsx`
- `virtuals-whale-radar/frontend/admin/src/components/ui`
- `virtuals-whale-radar/frontend/admin/public/brand`

这些参考代码的价值在于：

1. 已经形成一套完整的 UI 分层结构
2. 已经把 theme、surface、shell、primitives、layouts 拆开
3. 已经具备 light / dark 切换基础设施
4. 页面模板天然支持 props 驱动

但迁移必须严格遵守以下边界。

#### 15.3.3 本轮“明确迁移”的内容

本轮允许迁移或参考实现的内容包括：

1. **主题 token 体系**
   - 背景色
   - surface 分层
   - 边框色
   - ring
   - 阴影
   - radius
   - chart / status semantic colors
   - 登录页和工作台专用材质 token

2. **深浅色机制**
   - `data-theme` 驱动方式
   - theme provider / theme context
   - 主题状态持久化方式

3. **全局壳层结构**
   - sidebar
   - top context bar
   - notification / assist rail 的组织方式
   - main worksurface 的容器与留白逻辑

4. **公共组件与 app primitives**
   - `PageHeader`
   - `SectionCard`
   - `EmptyState`
   - `MetricCard`
   - `QuickLink`
   - `StatusBadge`
   - 以及 Button / Card / Badge / Input / Dialog / Sheet 等基础组件

5. **页面模板结构**
   - 集合页模板（collection/list layout）
   - 详情页模板（workspace/detail layout）
   - 审核页模板（review layout）
   - 登录 / auth shell 模板

6. **品牌资源的组织方式**
   - 品牌 logo / mark 的文件组织方式可以借鉴
   - 品牌资源在 `public/brand` 下的分组方式可以借鉴

#### 15.3.4 本轮“明确不迁移”的内容

本轮严禁迁移以下内容：

1. **认证逻辑**
   - `Supabase Auth`
   - 登录态判断
   - 登录后角色跳转
   - 任何 auth provider 实现

2. **API 与后端数据逻辑**
   - 录音上传逻辑
   - 转录逻辑
   - 提取逻辑
   - 匹配逻辑
   - 删除逻辑

3. **query / data fetching 实现**
   - 不迁移对方项目的取数方式
   - 不迁移对方的缓存策略
   - 不迁移对方的数据建模语义

4. **权限判断**
   - 不迁移参考项目里的角色/权限体系
   - 当前项目继续使用自己的 `admin / matchmaker / user` 判定方式

5. **业务页面语义**
   - 不迁移参考项目的“项目、账单、钱包、看板”等业务概念
   - 当前项目继续围绕：
     - 客户
     - 录音
     - 转录
     - 结构化提取
     - 匹配
     - 跟进
     - 提醒

一句话：

**迁 UI 结构，不迁业务脑子。**

#### 15.3.5 当前项目的视觉方向如何与参考系统结合

本轮迁移并不是“照抄参考仓库的青绿色皮肤”。  
当前项目需要结合以下两点：

1. **继续保留之前已经确认的高层方向**
   - 产品不再走“暖金、深棕、私享顾问室”路线
   - 主界面必须面向 20~30 岁红娘的高频工作台体验
   - 整体气质必须年轻、轻盈、顺滑、现代

2. **参考仓库主要借的是“结构”，不是“最后配色”**
   - 迁 `globals.css` 的 token 分层方式
   - 迁 `theme provider` 的机制
   - 迁 `visual shell` 的结构
   - 迁 `app-primitives` 与 `layout templates`
   - 但当前项目最终配色必须重新调校为适合 Matchmaking Studio 的版本

也就是说：

- 参考项目负责提供“系统骨架”
- 当前项目负责重新定义“颜色与品牌气质”

#### 15.3.6 Props 驱动页面模板的正式定义

本轮明确采用 **props 驱动页面模板**。

这里的含义不是“页面接受几个简单参数”，而是：

**页面模板只负责呈现结构，不负责知道你的业务数据怎么来的。**

例如，未来的列表页模板不应直接依赖：

- `Supabase`
- `profile` 的具体数据库行结构
- `match` 的具体 SQL 返回结构

而应只接受这类 props：

- `title`
- `description`
- `actions`
- `filters`
- `groups`
- `items`
- `emptyState`
- `sidebar`

当前项目自己的页面负责把真实业务数据转换为模板所需 props。

这样做的好处是：

1. **只重写 UI，不碰业务逻辑**
2. **页面统一性大幅提升**
3. **后续更容易替换壳层与组件**
4. **更适合持续引入新的列表页 / 详情页 / 审核页**

因此，props 驱动页面模板在本轮中不是“可选项”，而是正式方案。

#### 15.3.7 当前项目的目标设计系统分层

迁移后的当前项目，UI 层应分成以下五层：

##### A. Theme / Token Layer

对应：

- `app/globals.css`
- `design-system/theme/*`

职责：

- 定义颜色、边框、阴影、surface、radius、auth shell、workspace shell 所需 token
- 提供 light / dark 切换机制

##### B. UI Primitive Layer

对应：

- `components/ui/*`

职责：

- 提供 Button / Card / Badge / Input / Dialog / Sheet / Tabs / Select 等基础原件
- 所有页面和业务组件只能依赖这一层，不再自行发明另一套局部控件样式

##### C. App Primitive Layer

对应：

- `components/app-primitives.tsx`
  或当前项目新的等价文件

职责：

- 抽象页面级复用单元：
  - PageHeader
  - SectionCard
  - EmptyState
  - QuickLink
  - StatusBadge
  - MetricCard

##### D. Visual Shell Layer

对应：

- `components/nav/*`
  或新的 design-system shell 文件

职责：

- 统一整个后台的：
  - sidebar
  - top context bar
  - assist rail
  - mobile nav
  - page container

##### E. Props-driven Page Template Layer

对应：

- `design-system/layouts/*`
  或当前项目对应目录

职责：

- 提供列表页、详情页、审核页、登录页等模板
- 页面模板只接受 props
- 业务页面自身负责把数据转换为 props 再接入

#### 15.3.8 目标文件映射（当前项目）

以下是本轮重点会触达的当前项目文件范围：

##### 主题层

- `app/globals.css`
- 新增：`components/theme/*` 或 `design-system/theme/*`

##### 登录页

- `app/(auth)/login/page.tsx`
- `components/auth/login-form.tsx`
- `app/(auth)/user/login/page.tsx`

##### 壳层

- `components/nav/workspace-shell.tsx`
- `components/nav/sidebar.tsx`
- `components/nav/top-context-bar.tsx`
- `components/nav/assist-rail.tsx`
- `components/nav/mobile-nav.tsx`

##### 基础组件

- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/input.tsx`
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/tabs.tsx`
- `components/ui/select.tsx`
- `components/ui/textarea.tsx`

##### 公共 primitives / 模板

- 新增：`components/app-primitives.tsx` 或等价目录
- 新增：`design-system/layouts/*` 或等价目录

##### 第一批重接页面

- `app/(matchmaker)/matchmaker/clients/page.tsx`
- `app/(matchmaker)/matchmaker/clients/[id]/page.tsx`
- `app/(matchmaker)/matchmaker/matches/page.tsx`
- `app/(matchmaker)/matchmaker/reminders/page.tsx`
- `app/(admin)/admin/matches/page.tsx`

注意：

这些页面在第一批中**只重接 UI 壳层与模板**，不改：

- route
- data loading
- auth
- actions
- role 逻辑
- 工作流逻辑

#### 15.3.9 登录页专项要求

登录页是本轮优先级最高的视觉修复位之一。

当前问题：

- 仍然使用 `rose-50 / amber-50 / rose-500`
- 仍然是单卡片居中 demo 感
- 完全脱离工作台设计系统

本轮目标：

1. 登录页必须使用与工作台一致的 token 与 theme
2. 登录页必须引入新的 auth shell
3. 登录页的结构应采用：
   - 外层 auth shell
   - 内层 auth frame
   - 登录 panel
   - 品牌说明 / 产品简介 / 产品价值
4. 登录表单仍然使用当前项目自己的：
   - Supabase 登录逻辑
   - role 跳转逻辑
   - toast 提示逻辑

也就是说：

**重做登录页的视觉和结构，但不改登录页的业务行为。**

#### 15.3.10 执行策略与分支策略

本轮 UI 重构默认在独立分支推进：

- `codex/ui-design-system-refactor`

原因：

1. 改动范围大
2. 需要允许多次推翻与试错
3. 必须避免污染主线当前可用工作流

因此，本轮执行策略是：

1. 所有 UI 设计系统迁移先在该分支推进
2. 主线业务工作流继续保持可用
3. 待 `theme + shell + login + templates` 稳定后，再择机回合到主线

#### 15.3.11 分阶段实施方案

##### Phase A：Theme Reset

目标：

- 重写 `globals.css`
- 引入参考项目的 token 分层方式
- 引入 `data-theme` 深浅色机制
- 保留当前项目自己的品牌标识与最终配色判断

完成标志：

- 登录页与工作台使用同一套 token
- 页面不再依赖零散硬编码颜色类名撑视觉

##### Phase B：Shell Refactor

目标：

- 重建 `workspace-shell`
- 重建 `sidebar`
- 重建 `top-context-bar`
- 重建 `assist-rail`
- 重建 `mobile-nav`

完成标志：

- 工作台整体壳层进入同一语言
- 页面不再是“各自套壳”

##### Phase C：Auth Shell

目标：

- 重做登录页
- 引入 auth shell / auth frame / auth panel
- 登录页与后台壳层达到统一气质

完成标志：

- 登录页不再像单独 demo 页面
- 登录页与工作台看起来属于同一个产品

##### Phase D：App Primitives + Templates

目标：

- 引入 app primitives
- 引入 props 驱动页面模板
- 先覆盖列表页、详情页、审核页的共性结构

完成标志：

- 新页面不再从零写 header / section / empty state
- 老页面可逐步迁到模板体系中

##### Phase E：First-page Rewiring

目标：

- 用当前项目自己的数据结构接回：
  - 我的客户
  - 客户详情
  - 匹配工作台
  - 提醒中心

完成标志：

- UI 全面换壳
- 业务逻辑完全保留

#### 15.3.12 本轮验收标准

当以下条件同时满足，才算本轮方案达标：

1. 登录页和工作台视觉语言一致
2. 当前项目的配色不再让人感觉“旧、乱、拼凑”
3. sidebar / top bar / assist rail / card / status 形成同一产品语言
4. 页面模板已改为 props 驱动，而不是页面直接写死壳层
5. 当前项目自己的 auth、api、query、权限和工作流逻辑完全未被迁移污染
6. UI 系统可以继续服务后续页面改造，而不是只修好一两个页面

---

## 十六、开发阶段规划

> 当前项目已经完成大量业务闭环开发，因此后续规划不能再按“从零搭系统”的方式写，而应拆成两条并行主线：
>
> 1. `AI / 字段 / 匹配主线`
> 2. `UI / 布局 / 交互主线`
>
> 两条主线应并行推进，但 UI 主线必须遵循“先统一骨架和主题，再重做关键页面”的顺序。

### Phase 0：设计基线与主题基础层

1. 明确产品 UI 重构方向：以 `virtuals-whale-radar/frontend/admin` 的设计系统结构为参考，只迁 UI 层，不迁业务逻辑
2. 确定新的产品视觉 thesis：`年轻、轻盈、顺滑、系统化的 Matchmaking 工作台`
3. 在 `docs/plan.md` 中固定 token、theme、shell、primitives、props 驱动模板的分层方案
4. 收束并重写 `globals.css` 的主题 token 与 auth / workspace surface 体系
5. 统一 `Button / Badge / Card / Dialog / Tabs / Input / Select` 的产品语义样式
6. 重构 sidebar、top context bar、assist rail 与 auth shell，建立全局信息架构

### Phase 1：字段系统重构与敏感模式上线

1. 建立 `docs/plan.md` 中定义的新字段体系
2. 新增敏感关系模式字段和三态接受状态
3. 仅落地 V1 最小必要的生活方式字段与简化情绪稳定字段
4. 建立“AI 默认入库 + 红娘只处理异常”的异常确认页
5. 在匹配引擎中实现 `confirmed / pending_confirmation / rejected`
6. 生成补问任务和 AI 推荐问题
7. 红娘端展示 Top1 + Top3 + 待确认标签

### Phase 2：红娘核心工作流 UI 重构

1. 重构客户详情页头部骨架与辅助栏
2. 重构录音记录页为时间线摘要卡
3. 将“查看详细”升级为工作台式详情弹窗
4. 修正转录全文的独立滚动结构
5. 重构审核页为“证据区 + 处理区”的差异工作台
6. 清理红娘前台中的原始字段 key、英文枚举值、原始 JSON 暴露

### Phase 3：匹配与跟进工作台重构

1. 重构匹配列表页为 `confirmed / pending_confirmation` 双区工作台
2. 重构匹配详情页，突出“为什么匹配”和“下一步怎么推进”
3. 重构跟进记录页，建立更清晰的推进节奏视图
4. 重构提醒中心，使其与补问任务、匹配待确认状态联动

### Phase 4：高质量画像与核验体系

1. 引入字段证据表和核验状态
2. 评估并按需引入 MBTI 自报、Big Five、Attachment、HEXACO 等扩展画像体系
3. 增加字段完整度指标
4. 增加管理端字段治理看板

### Phase 5：更智能的运营闭环

1. 基于真实跟进结果动态调整匹配权重
2. 引入更稳定的音频结构信息（若网关后续支持 diarization）
3. 引入问卷式补充录入入口
4. 沉淀行业知识库与红娘话术模板

---

## 十七、当前已确认的产品决策

以下内容在本轮需求讨论中已经明确，应作为正式决策写入实现：

1. 男方存在三类敏感关系模式，且必须入库
2. 女方也要记录对三类模式的接受状态
3. 女方相关字段为空时，不直接排除，而按其他字段先匹配
4. 对于空值候选，AI 自动生成补问建议，由红娘线下确认
5. 平台核心目标是用 AI 减少人工，不是替代红娘
6. 前台主显 Top1，后台保留 Top3
7. V1 不做说话人分离前提
8. 男方和女方不做物理分库
9. 高净值场景需要支持收入、资产、婚史等字段的核验状态
10. 兴趣、生活习惯、情绪稳定、人格结构必须进入字段体系
11. 当前项目的 UI 必须从“普通后台”升级为“私人顾问式工作台”
12. 页面必须优先服务红娘，不直接暴露原始字段 key、英文枚举值和原始结构化结果
13. “查看详细”不再视为普通小弹窗，而是证据区与结论区分明的工作台详情层
14. 录音详情中的转录全文必须可稳定独立滚动
15. 全站统一使用 `lucide-react`，不使用 emoji

---

## 十八、借鉴与参考

以下参考用于完善人格与关系字段设计，不代表平台必须照搬其商业产品流程：

- Myers-Briggs 官方关于 best-fit type  
  [https://www.myersbriggs.org/unique-features-of-myers-briggs/best-fit-type/](https://www.myersbriggs.org/unique-features-of-myers-briggs/best-fit-type/)
- Myers-Briggs Step II 资源  
  [https://www.themyersbriggs.com/en-us/access-resources/articles/the-mbti-step-ii-assessment](https://www.themyersbriggs.com/en-us/access-resources/articles/the-mbti-step-ii-assessment)
- HEXACO 官方量表说明  
  [https://hexaco.org/scaledescriptions%26lang%3Den](https://hexaco.org/scaledescriptions%26lang%3Den)
- 成人依恋风格综述（PubMed）  
  [https://pubmed.ncbi.nlm.nih.gov/29510301/](https://pubmed.ncbi.nlm.nih.gov/29510301/)
- 开放 Jungian 量表（用于理解 MBTI 维度题项，不等于官方 MBTI）  
  [https://openpsychometrics.org/tests/OJTS/development/OEJTS1.2.pdf](https://openpsychometrics.org/tests/OJTS/development/OEJTS1.2.pdf)
