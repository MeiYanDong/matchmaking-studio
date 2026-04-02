# 婚恋匹配平台 - 可执行开发清单（AI-first 重构版）

> 基于 [docs/plan.md](/Users/myandong/Projects/marry2/docs/plan.md) 拆解  
> 当前目标：把现有系统从“通用婚恋 MVP”重构为“AI 默认入库、红娘只处理异常”的高质量婚恋匹配平台  
> 技术栈：Next.js 16 + Supabase + Tailwind + shadcn/ui + 云雾聚合网关（`whisper-1` + Claude）

---

## 0. 需求与设计基线

- [x] 将新版详细需求方案写入 [docs/plan.md](/Users/myandong/Projects/marry2/docs/plan.md)
- [x] 固化 `V1 最小必要字段定义表`
- [x] 固化 `AI 字段提取协议 v1`
- [x] 明确 `unknown != no`
- [x] 明确 `AI 默认自动入库，红娘只处理异常`
- [x] 明确 V1 不做说话人分离前提
- [x] 明确男方三类敏感关系模式与女方三态接受状态
- [x] 明确前台主显 `Top1`、后台保留 `Top3`
- [x] 明确 V1 暂不把 MBTI / Big Five / Attachment / HEXACO 作为核心自动匹配字段

---

## 1. 已完成基础能力（沿用当前仓库）

### 1.1 项目与环境

- [x] Next.js 16 项目已初始化
- [x] Supabase 客户端与服务端封装已完成
- [x] `proxy.ts` 已接入 Supabase Auth session 刷新与路由保护
- [x] Node / npm 环境已安装并可本地构建
- [x] 本地 `npm run build` 已通过

### 1.2 基础数据库与认证

- [x] 基础枚举已建立：性别、状态、主意图、匹配状态、提醒类型、角色
- [x] 已有核心表：`profiles`、`intentions`、`conversations`、`matches`、`reminders`、`user_roles`
- [x] 基础 RLS 已配置
- [x] `audio-files` / `profile-photos` bucket 已创建
- [x] 登录 / 登出 / 角色路由守卫已完成
- [x] 红娘端与管理端基础 layout / 侧边栏已完成

### 1.3 现有主流程

- [x] 客户列表 / 新增 / 详情页已完成
- [x] 音频上传、转录、结构化提取主流程已完成
- [x] 录音记录、审核页、基础字段同步能力已完成
- [x] 基础匹配引擎已完成
- [x] 红娘匹配工作台、匹配详情页已完成
- [x] 提醒中心已完成
- [x] 管理端 dashboard / clients / matchmakers / matches 已完成

> 说明：以上能力保留，但后续需要按新版 `plan` 做 AI-first 重构，而不是继续沿用旧的“完整审核表单 + 通用匹配”逻辑。

---

## 2. Phase 1：字段系统与数据库重构

### 2.1 字段字典落地

- [x] 创建机器可读的字段定义文件，例如 `lib/ai/field-spec.ts` 或 `lib/ai/field-spec.json`
- [x] 将 [docs/plan.md](/Users/myandong/Projects/marry2/docs/plan.md) 中 `7.5 V1 最小必要字段定义表` 转成代码常量
- [x] 给每个 V1 字段补齐：
  - [x] 字段 key
  - [x] 中文名
  - [x] 数据类型
  - [x] 允许值
  - [x] 是否敏感
  - [x] 是否参与匹配
  - [x] 提取规则
  - [x] 更新规则
- [x] 从现有 prompt / 表单 /类型中移除不再属于 V1 核心字段的内容
- [x] 明确 V1 只保留简化版 `情绪稳定`
- [x] 将 MBTI / Big Five / Attachment / HEXACO 标记为 V2 预留，不进入 V1 核心自动提取

### 2.2 新枚举与类型

- [x] 新增枚举 `relationship_mode`
  - [x] `marriage_standard`
  - [x] `compensated_dating`
  - [x] `fertility_asset_arrangement`
- [x] 新增枚举 `tri_state`
  - [x] `yes`
  - [x] `no`
  - [x] `unknown`
- [x] 新增枚举 `recommendation_type`
  - [x] `confirmed`
  - [x] `pending_confirmation`
  - [x] `rejected`
- [x] 新增枚举 `followup_task_type`
  - [x] `missing_field`
  - [x] `sensitive_confirmation`
  - [x] `verification`
  - [x] `relationship_followup`
- [x] 新增枚举 `followup_task_status`
  - [x] `open`
  - [x] `in_progress`
  - [x] `done`
  - [x] `dismissed`
- [x] 新增枚举 `importance_level`
  - [x] `hard`
  - [x] `important`
  - [x] `normal`
  - [x] `flexible`

### 2.3 表结构调整

#### `profiles`

- [x] 为 `profiles` 补齐 V1 最小必要字段中仍缺失的核心字段
- [x] 补充全球流动 / 高净值 V1 必要字段中当前仍缺失的部分
- [x] 保留已有字段，但对不再属于 V1 核心匹配的字段做降级标注

#### `intentions`

- [x] 为 `intentions` 增加 `relationship_mode`
- [x] 增加女方三态接受字段：
  - [x] `accepts_mode_marriage_standard`
  - [x] `accepts_mode_compensated_dating`
  - [x] `accepts_mode_fertility_asset_arrangement`
- [x] 增加 `importance_level` 相关字段或偏好重要性存储结构
- [x] 为异地、迁居、婚史、孩子、生育、收入等偏好增加重要性存储能力

#### `trait_profiles`

- [x] 创建 `trait_profiles` 表
- [x] V1 在 `trait_profiles` 中启用最小必要字段：
  - [x] `exercise_habits`
  - [x] `diet_habits`
  - [x] `sleep_schedule`
  - [x] `smoking_habit`
  - [x] `drinking_habit`
  - [x] `social_preference`
  - [x] `spending_style`
  - [x] `emotional_stability`
- [x] 其余 V1 软字段继续保留在当前更合适的位置：
  - [x] `hobbies` 留在 `profiles`
  - [x] `communication_style` / `relationship_pace` / `biggest_concerns` 留在 `intentions`
  - [x] `hidden_expectations` / `followup_strategy` 留在 `profiles`

#### `conversations`

- [x] 为 `conversations` 增加 `talked_at` 或等价字段，表示实际谈话时间
- [x] 保留 `created_at` 作为上传时间
- [x] 增加 `transcript_verbose_json`
- [x] 增加 `missing_fields`
- [x] 增加 `suggested_questions`
- [x] 明确区分“本次原始提取结果”和“当前客户生效字段”

#### `matches`

- [x] 为 `matches` 增加 `recommendation_type`
- [x] 增加 `pending_reasons`
- [x] 增加 `required_followup_fields`
- [x] 增加 `suggested_followup_questions`
- [x] 允许存储“待确认候选”与“已确认候选”的区别

#### `followup_tasks`

- [x] 创建 `followup_tasks` 表
- [x] 设计与 `profiles` / `matches` / `matchmaker_id` 的关联
- [x] 支持 `pending_confirmation` 场景自动生成任务

### 2.4 数据迁移与兼容

- [x] 为历史数据回填 tri-state 默认值
- [x] 为历史数据回填 `recommendation_type`
- [x] 为历史 conversations 回填 `talked_at`
- [x] 编写迁移脚本，避免旧数据因新字段为空而出错
- [x] 更新 `types/database.ts`

### 2.5 RLS 与索引

- [x] 为 `trait_profiles` 配置 RLS
- [x] 为 `followup_tasks` 配置 RLS
- [x] 为新增 tri-state / relationship_mode / recommendation_type 字段补充索引
- [x] 为 `followup_tasks(status, matchmaker_id)` 增加索引

---

## 3. Phase 2：AI 字段提取协议落地

### 3.1 Prompt 与协议重构

- [x] 重写 `lib/prompts/extract-profile.ts`
- [x] 从“输出完整对象”改成“输出 patch 合同”
- [x] Prompt 中显式引入字段字典
- [x] Prompt 中显式引入更新规则：
  - [x] 未提及字段不修改旧值
  - [x] 模糊新值不覆盖明确旧值
  - [x] `unknown` 不覆盖已有明确值
  - [x] 敏感字段只允许明确提及时写入
- [x] Prompt 中显式要求输出：
  - [x] `field_updates`
  - [x] `review_required`
  - [x] `missing_critical_fields`
  - [x] `suggested_followup_questions`
  - [x] `summary_updates`
  - [x] `processing_notes`

### 3.2 转录与提取输入包

- [x] 在提取 API 中，把当前客户快照一起传给 Claude
- [x] 把系统上下文传给 Claude：
  - [x] `matchmaker_id`
  - [x] `profile_id`
  - [x] `profile_gender`
  - [x] `conversation_id`
  - [x] `uploaded_at`
  - [x] `audio_duration`
- [x] 若可用，则传 `transcript_verbose_json`
- [x] 把字段说明书以机器可读方式传入模型

### 3.3 Patch 解析与校验

- [x] 新建 `lib/ai/extraction-contract.ts` 或等价模块
- [x] 为 AI 输出合同建立 Zod / TS 校验
- [x] 对非法 action / 非法 tri-state / 缺失字段 label 做兜底校验
- [x] 对低置信度字段做统一拦截逻辑
- [x] 对敏感字段缺少 `evidence_excerpt` 做警告或降级

### 3.4 自动入库策略

- [x] 实现“低风险字段默认自动写入”
- [x] 实现“敏感 / 冲突 / 低置信度字段进入异常确认页”
- [x] 自动写入时保留 old/new diff
- [x] 把本次 patch 持久化到 `conversations.extracted_fields`
- [x] 保留原始 `processing_notes`

### 3.5 多次音频增量更新

- [x] 明确“当前客户快照”的来源
- [x] 新音频只更新本次明确提到的字段
- [x] 不再使用“完整对象覆盖”方式同步
- [x] 实现“最新且明确的新值覆盖旧值”
- [x] 实现“模糊新值不覆盖明确旧值”
- [x] 对冲突字段写入 `review_required`

### 3.6 缺口分析与补问生成

- [x] 根据 `missing_critical_fields` 生成补问建议
- [x] 按优先级生成问题：
  - [x] 关系模式 / 接受状态
  - [x] 婚史 / 孩子
  - [x] 生育意愿
  - [x] 城市 / 异地 / 迁居
  - [x] 收入 / 资产 / 生活方式
- [x] 确保问题满足“一问一事、红娘可直接线下复述”
- [x] 补问建议写入 `conversations.suggested_questions`
- [x] 自动创建 `followup_tasks`

---

## 4. Phase 3：AI-first 录音与建档流程重构

### 4.1 上传优先建档

- [x] 重构“新增客户”流程为 AI-first
- [x] 支持“最少上下文创建草稿客户 + 直接上传第一段音频”
- [x] 让 AI 从第一段音频自动补齐基础字段
- [x] 只在重名 / 身份不清时要求红娘处理

### 4.2 Conversations 流程

- [x] 上传音频时系统自动记录：
  - [x] 红娘
  - [x] 客户
  - [x] 上传时间
  - [x] 音频时长
- [x] 优先用系统时间作为 `talked_at` 默认值
- [x] 若 AI 在文字稿里发现明确谈话时间，可自动修正 `talked_at`
- [x] 只在明显错误时允许人工纠正

### 4.3 异常确认页替代旧审核页

- [x] 将 `/matchmaker/clients/[id]/conversations/[cid]/review` 从“完整审核表单页”改成“差异与异常页”
- [x] 页面默认只展示：
  - [x] 本次新增字段
  - [x] 与旧值冲突字段
  - [x] 低置信度字段
  - [x] 敏感待确认字段
  - [x] AI 补问建议
- [x] 支持“一键接受 AI 更新”
- [x] 支持只修改异常字段
- [x] 不再要求红娘查看和填写完整字段大表单

### 4.4 客户详情页调整

- [x] 客户详情页的数据源改为“当前生效快照”
- [x] 增加“最近一次 AI 更新摘要”
- [x] 增加“待确认字段”区块
- [x] 增加“待补问任务”区块
- [x] 增加“本次音频带来的字段变化”可追溯视图

---

## 5. Phase 4：匹配引擎重构

### 5.1 方向性偏好与权重

- [x] 为核心偏好字段增加重要性提取能力
- [x] 重要性统一采用：
  - [x] `hard`
  - [x] `important`
  - [x] `normal`
  - [x] `flexible`
- [x] 从语义线索中提取重要性：
  - [x] “必须 / 一定要 / 完全不能接受” -> `hard`
  - [x] “比较看重 / 优先考虑 / 最好” -> `important`
  - [x] “有更好，没有也行” -> `normal`
  - [x] “无所谓 / 都行” -> `flexible`

### 5.2 匹配分类重构

- [x] 重写 `lib/matching/score.ts`
- [x] 将结果从单一 `passed` 改为：
  - [x] `confirmed`
  - [x] `pending_confirmation`
  - [x] `rejected`
- [x] 实现 `unknown` 不直接排除，而是进入 `pending_confirmation`
- [x] 对 tri-state 敏感字段加入专门逻辑
- [x] 对 `relationship_mode` 做专门门槛逻辑

### 5.3 新评分维度

- [x] 按新版 plan 调整评分维度和 breakdown
- [x] 至少支持：
  - [x] 意图 / 关系模式
  - [x] 城市 / 异地 / 迁居
  - [x] 婚史 / 孩子 / 生育
  - [x] 收入 / 资产
  - [x] 兴趣 / 生活方式
  - [x] 相处 / 推进
  - [x] 敏感模式确认度
- [x] 将“待确认字段”单独输出到匹配结果中

### 5.4 Match 持久化

- [x] 更新 `lib/matching/engine.ts`
- [x] 在写入 `matches` 时同时写入：
  - [x] `recommendation_type`
  - [x] `pending_reasons`
  - [x] `required_followup_fields`
  - [x] `suggested_followup_questions`
- [x] 保留高分 `match_reason` 生成能力
- [x] 对 `pending_confirmation` 的理由文案做专门处理

### 5.5 自动重跑

- [x] 当 AI 自动更新到匹配相关字段时，自动重跑匹配
- [x] 当敏感字段从 `unknown -> yes/no` 时，自动重跑匹配
- [x] 当客户核心偏好重要性变化时，自动重跑匹配

---

## 6. Phase 5：红娘端工作台重构

### 6.1 匹配列表页

- [x] 将匹配列表按 `confirmed / pending_confirmation` 分区展示
- [x] 前台主显 `Top1`
- [x] 后台保留 `Top3`
- [x] 待确认候选必须展示：
  - [x] 待确认字段
  - [x] AI 补问问题
  - [x] 为什么先入候选

### 6.2 匹配详情页

- [x] 增加“待确认原因”区块
- [x] 增加“下一步建议补问”区块
- [x] 显示方向性偏好权重与分字段打分
- [x] 显示哪些字段是 `hard conflict`
- [x] 显示哪些字段是 `unknown`

### 6.3 跟进任务与提醒

- [x] 在红娘端增加“待补问任务”列表
- [x] 将 `followup_tasks` 接入提醒系统
- [x] 新增 `pending_confirmation` 类型提醒
- [x] 支持从提醒直接跳转到客户 / 匹配 / 异常确认页

---

## 7. Phase 6：管理端与治理能力

### 7.1 管理端字段治理

- [x] 增加“字段完整度”看板
- [x] 统计：
  - [x] 基础字段完整度
  - [x] 敏感字段完整度
  - [x] 生活方式字段完整度
  - [x] 已核验字段占比
- [x] 统计 `pending_confirmation` 积压量
- [x] 统计各红娘的补问完成率

### 7.2 敏感模式运营视图

- [x] 管理端支持查看三类关系模式客户规模
- [x] 支持查看各模式的 `confirmed / pending_confirmation / rejected` 分布
- [x] 支持查看敏感字段确认耗时

### 7.3 历史与证据（预备 Phase 2/3）

- [x] 已评估 `field_observations` 表，当前轮暂缓进入开发
- [ ] 若进入，则实现字段级来源追溯
- [x] 暂缓情况下，已保证 conversations + patch 历史可回放

---

## 8. Phase 7：验证、回归与发布准备

### 8.1 协议与数据回归测试

- [x] 为 AI 输出合同增加单元测试
- [ ] 补齐剩余测试案例：
  - [x] 明确新值覆盖旧值
  - [x] 模糊新值不覆盖明确旧值
  - [x] `unknown` 不覆盖 `yes/no`
  - [x] 敏感模式正确进入 `pending_confirmation`
  - [x] 缺失字段正确生成补问任务

### 8.2 流程级测试

- [x] 跑通“首段音频自动建档”流程
- [x] 跑通“第二段音频增量更新”流程
- [x] 跑通“敏感字段从 unknown 变 yes/no”后的自动重跑匹配
- [x] 跑通“AI 自动入库 + 红娘异常确认”流程

> 说明：本地已完成一组真实流程验证。首段男女音频完成自动建档与字段写入；女方第二段补充音频在第三方 `whisper-1` / Claude 配额再次耗尽后，使用同一音频已验证 transcript 回放完成增量提取与匹配重跑，最终将匹配从 `pending_confirmation` 推进到 `confirmed`；异常确认则基于真实 `review_required` 会话完成清空与 `reviewed_at` 回写。
- [x] 已完成匿名态本地路由冒烟：
  - [x] `/` -> `/login`
  - [x] `/login` 返回 `200`
  - [x] `/matchmaker/clients/new` 未登录重定向到 `/login`
  - [x] `/admin/dashboard` 未登录重定向到 `/login`

### 8.3 本地与部署准备

- [x] 本地 `npm run build` 再次验证通过
- [x] 本地 `npm test` 已通过
- [x] 补充部署文档里对新表、新枚举、新定时任务的说明
- [ ] 在 Vercel / Supabase 控制台完成新环境变量与 migration 部署

---

## 9. 后续扩展（V2 / V3 储备）

### 9.1 人格与测评体系

- [ ] 评估 MBTI 自报字段是否需要回归客户档案
- [ ] 评估 Big Five / Attachment / HEXACO 是否通过问卷而非音频提取接入
- [ ] 明确这些字段是否进入匹配，还是仅做展示 / 参考

### 9.2 说话人分离

- [ ] 持续关注第三方网关是否支持 diarization / speaker labels
- [ ] 若支持，再评估是否升级转录链路

### 9.3 已核验体系

- [ ] 为收入 / 资产 / 婚史 / 孩子等高风险字段设计核验流程
- [ ] 增加核验状态展示与筛选

---

## 10. 当前建议的执行顺序

- [x] 先完成 **Phase 1 字段系统与数据库重构**
- [x] 再完成 **Phase 2 AI 协议落地**
- [x] 然后完成 **Phase 3 AI-first 建档与异常确认页**
- [x] 再完成 **Phase 4 匹配引擎重构**
- [x] 随后完成 **Phase 5 红娘端工作台重构**
- [ ] 最后补齐 **Phase 7 验证发布**（完整实录联调 + 控制台部署）

> 建议：  
> 这次不要从 UI 开始改，而是严格按以下顺序推进：  
> `字段字典 -> 数据库 -> AI 协议 -> 自动入库 -> 异常确认 -> 匹配重构 -> 工作台展示`
