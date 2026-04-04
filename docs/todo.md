# Matchmaking Studio - 可执行开发清单

> 依据：[plan.md](./plan.md)  
> 目标：把当前项目收束为一套 AI-first、红娘主导、面向高质量客户的婚恋撮合工作台  
> 使用规则：只有在“代码已落地 + 本地验证通过 + 关键页面/流程实际可用”后，才将对应任务勾选为已完成

---

## 0. 当前已完成基线

- [x] 项目已经迁移到 `Next.js 16 + App Router + Supabase + Tailwind CSS + shadcn/ui`
- [x] 本地环境已经可用，`npm run build` 可通过
- [x] 代码仓库已经上传到 GitHub，并已更名为 `matchmaking-studio`
- [x] 产品与技术总方案已经写入 [plan.md](./plan.md)
- [x] 已有红娘端、管理端、用户端基础路由与认证保护
- [x] 已有音频上传、转录、结构化提取、写库、匹配、提醒的基础闭环
- [x] 已有 AI-first 的基础字段同步能力和异常确认能力
- [x] 已有本地测试账号、模拟角色与示例录音数据

> 说明：从这里开始，后续 todo 不再把“能跑起来”当目标，而是按新版 `plan` 逐步重构为更稳定、更优雅、更高质量的产品形态。

---

## 1. Phase DS-0：设计系统迁移边界、参考拆解与执行准备

> 说明：本阶段不直接改业务页面，而是把这轮 UI 重构的参考来源、迁移边界、文件映射和执行顺序钉死。  
> 目标：确保后续所有 UI 改动都严格遵守“只迁 UI 设计系统，不迁业务逻辑”的原则。

### 1.1 参考设计系统拆解

- [x] 审核 `virtuals-whale-radar/frontend/admin/src/styles/globals.css` 的 token 结构，并列出当前项目可迁移的 token 分类
- [x] 审核 `virtuals-whale-radar/frontend/admin/src/design-system/theme/*` 的 theme provider 机制，并确认当前项目的落位目录
- [x] 审核 `virtuals-whale-radar/frontend/admin/src/design-system/shell/visual-shell.tsx` 的 shell 结构，并拆成当前项目需要的 `sidebar / top bar / assist rail / mobile nav`
- [x] 审核 `virtuals-whale-radar/frontend/admin/src/components/app-primitives.tsx`，列出当前项目需要的页面级 primitives
- [x] 审核 `virtuals-whale-radar/frontend/admin/src/components/ui/*`，确认当前项目基础组件层哪些可以直接迁、哪些只借结构不借样式
- [x] 审核 `virtuals-whale-radar/frontend/admin/public/brand` 的品牌资源组织方式，确定当前项目的品牌资源目录规范

### 1.2 当前项目现状盘点

- [x] 盘点当前项目中所有需要被设计系统接管的入口文件
- [x] 盘点当前项目登录页、工作台壳层、基础组件、页面 header、empty state、metric card、list/detail/review 页面中最不统一的结构
- [x] 盘点当前项目里所有与业务逻辑耦合过深、不能直接迁入模板层的页面代码
- [x] 盘点当前项目里仍存在的硬编码颜色、硬编码阴影、临时过渡组件和 demo 风格残留
- [x] 盘点当前项目现有品牌资源与品牌文案的实际使用位置

### 1.3 迁移边界与约束确认

- [x] 明确本轮只迁移 token、theme、shell、公共组件、页面模板、品牌资源组织方式
- [x] 明确不迁移 auth、api、query、权限判断、业务数据结构和页面路由逻辑
- [x] 明确当前项目页面只能“换壳”，不能因为 UI 重构顺手改工作流逻辑
- [x] 明确页面模板必须采用 props 驱动，模板不直接依赖 Supabase 或具体数据库结构
- [x] 明确所有页面接入都必须由当前项目页面先把业务数据转换为模板 props

### 1.4 文件映射与目录规划

- [x] 为当前项目定义新的 theme 目录（如 `design-system/theme/*` 或 `components/theme/*`）
- [x] 为当前项目定义新的 shell 目录与命名方式
- [x] 为当前项目定义新的 `app-primitives` 文件位置与导出方式
- [x] 为当前项目定义新的 props-driven layout 模板目录
- [x] 为当前项目定义 `public/brand` 下 logo / mark / illustration 的文件组织规则

### 1.5 执行顺序固定

- [x] 先完成 `Theme Reset`
- [x] 再完成 `Visual Shell`
- [x] 再完成 `Auth Shell`
- [x] 再完成 `App Primitives`
- [x] 再完成 `Props-driven Templates`
- [x] 最后才把首批业务页面重接到新模板

### 1.6 Phase DS-0 验收

- [x] 后续任何 UI 改动都能明确说清“迁了什么 UI 结构、保留了什么业务逻辑”
- [x] 当前项目已经有清晰的设计系统目录规划，不再边做边发明结构
- [x] 参考仓库中哪些代码能迁、哪些只能参考、哪些不能碰，已经完全说清楚

---

## 2. Phase 1：字段系统与数据库治理

### 2.1 字段字典与来源治理

- [x] 审核当前 `field-spec` 与 [plan.md](./plan.md) 的一致性
- [x] 为所有 V1 核心字段补齐：
- [x] 字段 key
- [x] 中文名
- [x] 类型
- [x] 允许值
- [x] 敏感性
- [x] 匹配层级（硬筛选 / 软偏好 / 待确认 / 参考）
- [x] 提取规则
- [x] 更新规则
- [x] 证据要求
- [x] 明确哪些字段只允许客户明确表达后写入
- [x] 明确哪些字段允许 AI 做保守总结

### 2.2 数据模型审计与补齐

- [x] 审核 `profiles` 是否完整覆盖 V1 基础事实字段
- [x] 审核 `intentions` 是否完整覆盖关系模式和三态接受状态
- [x] 审核 `trait_profiles` 是否完整覆盖 V1 生活方式字段
- [x] 审核 `matches` 是否完整覆盖 `confirmed / pending_confirmation / rejected`
- [x] 审核 `followup_tasks` 是否能承载缺口补问与敏感确认
- [x] 新增 `field_observations` 表，用于字段级来源与证据追溯
- [x] 为关键字段补充 `source_type / confidence / verification_status / conversation_id`

### 2.3 索引、RLS 与兼容迁移

- [x] 为 tri-state、relationship mode、recommendation type 补足索引
- [x] 为 `followup_tasks(status, matchmaker_id)` 补足索引
- [x] 为 `field_observations(profile_id, field_key)` 补足索引
- [x] 为新增表补齐 RLS
- [x] 对历史数据补齐默认值与兼容迁移
- [x] 更新数据库类型生成与 TypeScript 类型

---

## 3. Phase 2：AI 字段提取协议与增量更新链路

### 3.1 提取协议落地

- [x] 审核当前提取 prompt 是否完全对齐 [plan.md](./plan.md) 中的 `AI 字段提取协议 v1`
- [x] 强制模型输出 patch，而不是完整档案对象
- [x] 强制模型输出 `field_updates`
- [x] 强制模型输出 `review_required`
- [x] 强制模型输出 `missing_critical_fields`
- [x] 强制模型输出 `suggested_followup_questions`
- [x] 强制模型输出 `summary_updates`
- [x] 强制模型输出 `processing_notes`

### 3.2 输入包完善

- [x] 保证提取时传入“当前客户快照”
- [x] 传入会话系统上下文：`profile_id / profile_gender / matchmaker_id / conversation_id / talked_at / uploaded_at`
- [x] 若可用则传入 `transcript_verbose_json`
- [x] 传入字段说明书的机器可读版本
- [x] 只传必要上下文，控制 token 体积

### 3.3 Patch 应用规则固化

- [x] 确保“未提及字段不覆盖旧值”
- [x] 确保“模糊新值不覆盖明确旧值”
- [x] 确保 `unknown` 不覆盖 `yes / no` 或明确事实
- [x] 确保敏感字段必须尽量带 `evidence_excerpt`
- [x] 确保冲突字段进入异常确认，而不是默默覆盖
- [x] 确保可自动写入字段默认直写入库
- [x] 确保 `summary_updates` 只允许白名单字段

### 3.4 字段来源与历史记录

- [x] 每次提取后保留本次原始 patch
- [x] 将本次 patch 与最终生效字段做差异记录
- [x] 把关键字段同步写入 `field_observations`
- [x] 支持按字段回看“来自哪次录音、哪段证据”

### 3.5 错误处理与容错

- [x] 统一处理云雾 Whisper 错误
- [x] 统一处理云雾 Claude 错误
- [x] 用户侧错误文案必须短句化
- [x] 合同解析失败时不直接把原始 JSON 暴露到前端
- [ ] 统计未知字段、别名漂移和模型输出异常，便于后续迭代

---

## 4. Phase 3：AI-first 录音与建档主流程

### 4.1 上传与转录链路

- [x] 审核上传页是否真正以“录音优先”而不是“表单优先”
- [x] 确保音频上传写入 `conversations`
- [x] 确保记录负责红娘、客户、上传时间、音频时长
- [x] 确保 `talked_at` 有合理自动推断逻辑
- [x] 为 Storage 下载补齐重试与超时处理
- [x] 将浏览器端音频上传改为 Supabase resumable upload，并显示资料库上传进度
- [x] 为转录请求补齐幂等保护
- [x] 将转录主链路改为：`Storage signed URL -> Groq`
- [x] 服务端生成短时效签名 URL，而不是默认下载整段文件后再转传
- [x] Groq 转录失败时，自动切换到云雾 Whisper 兜底
- [x] 上传阶段与转录阶段在状态机与接口实现上彻底解耦
- [x] 为 `conversations.status` 增加并落地中间状态：`uploaded`、`transcribed`
- [x] 为失败会话增加 `failed_stage` 语义，明确区分 `upload / transcribe / extract`
- [x] 让“上传录音音频到对象存储”在实现上只负责把会话推进到 `uploaded`
- [x] 让 `/api/transcribe` 只负责把 `uploaded -> transcribed`，不再顺手推进提取
- [x] 让 `/api/extract` 只接受 `transcribed` 会话，并独立完成 `transcribed -> done`
- [ ] 将前端上传页从“驱动整条处理链”改为“展示状态 + 提供分阶段重试入口”
- [ ] 将重试动作拆为：重新上传音频 / 重试转录 / 重试提取
- [x] 前端步骤文案明确区分“上传到资料库中”与“发送到转录服务中”
- [x] 确保同一段已入库音频重试转录时无需重新上传
- [x] 为 URL 转录补齐真实联通回归验证

### 4.2 提取与自动写库

- [x] 确保转录成功后自动进入结构化提取
- [x] 确保提取成功后自动写入客户当前档案
- [x] 确保写入完成后会话状态变为 `done`
- [x] 确保敏感字段与冲突字段进入异常确认链路
- [x] 确保提取后的缺口与补问写回 `conversations`

### 4.3 新客户建档体验

- [x] 支持“最少上下文创建草稿客户 + 直接上传第一段音频”
- [x] AI 自动补齐第一段录音中的基础事实字段
- [x] 只在重名、身份冲突、归属不清时要求红娘处理
- [x] 优化上传完成后的成功态、失败态、恢复态

### 4.4 多轮录音增量更新

- [x] 验证“第二段录音可更新第一段录音建立的档案”
- [x] 验证 tri-state 可从 `unknown -> yes/no`
- [x] 验证明确新值可覆盖旧值
- [x] 验证模糊新值不会污染旧值
- [x] 验证历史录音与当前档案可同时保留

### 4.5 长音频策略（V1 边界）

- [x] 明确 V1 默认整段转录，不引入自动分段
- [ ] 为上传页和后端增加“当前版本暂不做分段”的实现注释与文档说明
- [ ] 对超大文件只做大小限制与清晰提示，不提前实现 chunking
- [x] 将“静音切段 / overlap / 合并去重”移入后续版本储备

---

## 5. Phase 4：匹配引擎与待确认候选机制

### 5.1 匹配主流程

- [x] 审核基础匹配打分是否覆盖 V1 核心字段
- [x] 加入关系模式覆盖层
- [x] 明确 `confirmed / pending_confirmation / rejected` 三类输出
- [x] 确保 `unknown != no`
- [x] 确保 `no` 直接排除
- [x] 确保 `yes` 可进入已确认候选
- [x] 确保 `unknown` 进入待确认候选

### 5.2 偏好权重

- [x] 为年龄、城市、学历、收入、婚史、孩子、生育、生活方式、关系模式接入重要性等级
- [x] 固定四档：`hard / important / normal / flexible`
- [x] 将语言线索映射到重要性等级
- [x] 在得分中体现“满足程度 × 重要性权重”

### 5.3 候选解释

- [x] 输出总分
- [x] 输出分字段得分
- [x] 输出硬冲突字段
- [x] 输出待确认字段
- [x] 输出“为什么排前面”
- [x] 输出“下一步应该问什么”

### 5.4 重跑策略

- [x] 当匹配关键字段变更时自动重跑匹配
- [x] 当 tri-state 从 `unknown` 变为 `yes/no` 时自动重跑
- [x] 当关系模式发生变化时自动重跑
- [x] 保证重跑不会把已有跟进状态误重置

---

## 6. Phase 5：补问任务与提醒闭环

### 6.1 自动补问任务

- [x] 将 `missing_critical_fields` 可靠转成 `followup_tasks`
- [x] 将敏感待确认项转成 `sensitive_confirmation` 任务
- [x] 将任务绑定到客户、匹配、红娘
- [x] 为任务生成一问一事的补问列表

### 6.2 提醒中心联动

- [x] 将 `pending_confirmation` 长时间未处理接入提醒
- [x] 将长期无新录音客户接入提醒
- [x] 将长期无跟进匹配接入提醒
- [x] 将提醒与 `followup_tasks` 打通

### 6.3 补问完成后的回流

- [x] 当红娘上传后续录音时，自动尝试关闭相关补问任务
- [x] 当 tri-state 被明确后，自动关闭对应确认任务
- [x] 在匹配页和提醒中心同步刷新状态

---

## 7. Phase DS-1：Theme Reset 与 UI Primitive 基础设施

> 说明：本阶段是整个 UI 迁移的地基。  
> 目标：把当前项目从“局部样式拼装”切换到“由 token、theme 和基础组件统一驱动”。

### 7.1 Token 与 `globals.css` 重写

- [x] 用参考项目 `frontend/admin/src/styles/globals.css` 的结构重写当前项目 `app/globals.css`
- [x] 为当前项目建立新的 token 分层：
  - [x] `background / foreground`
  - [x] `card / popover`
  - [x] `primary / secondary / accent / muted`
  - [x] `border / input / ring`
  - [x] `surface-soft / surface-soft-strong / surface-panel / surface-hero / surface-empty`
  - [x] `shadow-soft / shadow-strong / shadow-primary`
  - [x] `success / warning / danger` 及其 soft/foreground 组合
- [x] 为当前项目建立 auth shell 专用 token（例如 `theme-auth-shell / theme-auth-frame / theme-auth-panel`）
- [x] 为当前项目建立 workspace shell 专用 token
- [x] 清理当前项目里与新 token 冲突的旧变量、旧渐变和旧页面背景规则
- [x] 明确 light / dark 两套 token 都可正常工作

### 7.2 Theme Provider 机制

- [x] 迁入参考项目的 theme context / theme provider 机制
- [x] 为当前项目增加 `data-theme` 驱动
- [x] 为当前项目增加 theme 持久化逻辑（localStorage）
- [x] 确保 theme provider 不侵入当前项目 auth、query、role 逻辑
- [x] 确保登录页与工作台都由同一套 theme 机制驱动

### 7.3 UI Primitive 统一

- [x] 重写当前项目 `Button`
- [x] 重写当前项目 `Card`
- [x] 重写当前项目 `Badge`
- [x] 重写当前项目 `Input / Textarea / Select`
- [x] 重写当前项目 `Dialog`
- [x] 重写当前项目 `Sheet`
- [x] 审核 `Tabs` 是否需要一起切到新设计语言
- [x] 审核当前项目中仍散落的“页面自定义按钮 / 表单控件 / 卡片”并逐步收口到 primitives

### 7.4 品牌资源整理

- [x] 建立当前项目自己的 `public/brand` 目录结构
- [x] 把现有 logo / mark / favicon 相关资源整理到统一品牌目录
- [x] 为登录页和 sidebar 明确主 logo / mark 的使用规则
- [x] 不迁移参考项目品牌图，只迁目录组织方式

### 7.5 Phase DS-1 验收

- [x] 登录页和工作台已经共用一套 token 与 theme 机制
- [x] 页面不再依赖大量临时颜色类名维持风格
- [x] Button / Card / Badge / Input / Dialog / Sheet 看起来属于同一产品
- [x] 后续页面不需要再手工发明新的局部控件体系

---

## 8. Phase DS-2：Visual Shell 与 Auth Shell 重构

> 说明：本阶段重构的是“壳”，不是业务内容。  
> 目标：把当前项目的工作台壳层和登录页壳层统一到同一设计系统语言中。

### 8.1 Visual Shell 基础结构

- [x] 参考 `frontend/admin/src/design-system/shell/visual-shell.tsx`，为当前项目重构 `workspace-shell`
- [x] 将当前项目 shell 明确拆成：
  - [x] `Sidebar`
  - [x] `TopContextBar`
  - [x] `AssistRail`
  - [x] `MobileNav`
  - [x] `Main Worksurface`
- [x] 统一主工作区最大宽度、内边距、section 间距和左右栏比例
- [x] 减少当前项目壳层中重复的圆角、重复面板和重复容器嵌套

### 8.2 Sidebar 重构

- [x] 迁移参考项目品牌块、导航列表、活跃项、底部功能区的结构组织方式
- [x] 保留当前项目自己的 `getNavItems(role)` 和路由体系
- [x] 保留当前项目自己的提醒数量与 guide 入口
- [x] 保留当前项目自己的登出 action
- [x] 让 sidebar 成为“安静导航层”，而不是主视觉展示墙

### 8.3 Top Context Bar 重构

- [x] 迁移参考项目 top bar 的上下文组织方式
- [x] 保留当前项目自己的 route meta 解析逻辑
- [x] 保留当前项目自己的 unreadCount、roleLabel、reminder/admin 跳转
- [x] 让 top bar 更像上下文工具条，而不是大标题展示条

### 8.4 Assist Rail 与 Mobile Nav

- [x] 重构 assist rail 的材质、卡片和快捷入口层级
- [x] 保留当前项目自己的工作流提示内容
- [x] 重构 mobile nav，使其继续和桌面端使用同一视觉语言
- [x] 确保中小屏下 shell 不崩、不遮、不重复抢焦点

### 8.5 登录页 / Auth Shell 专项

- [x] 登录页不再使用当前 `rose / amber` 的临时 demo 风格
- [x] 引入 auth shell：外层 shell + frame + panel 的结构
- [x] 左侧区域展示品牌与产品说明，右侧承载登录表单
- [x] 登录页标题、副标题、品牌说明沿用 README 的非技术口径
- [x] 登录表单继续使用当前项目自己的 Supabase 登录逻辑
- [x] 登录成功后的 role 跳转逻辑保持不变
- [x] 登录页的交互错误提示、loading、按钮禁用逻辑保持不变

### 8.6 Phase DS-2 验收

- [x] 工作台壳层和登录页壳层属于同一设计系统
- [x] sidebar / top bar / assist rail 不再各说各话
- [x] 登录页不再像一个独立 demo 卡片页
- [x] 在不改 auth / api / role 逻辑的前提下，视觉层已经彻底换壳

---

## 9. Phase DS-3：App Primitives、Props-driven 模板与首批页面重接

> 说明：本阶段的关键不是“再修几个页面”，而是建立能持续复用的页面结构。  
> 目标：把页面组织方式从“每页各写一套壳”改成“公共 primitives + props 驱动模板 + 当前项目数据接入”。

### 9.1 App Primitives

- [x] 新建当前项目自己的 `app-primitives` 文件
- [x] 引入并适配：
  - [x] `PageHeader`
  - [x] `SectionCard`
  - [x] `EmptyState`
  - [x] `MetricCard`
  - [x] `QuickLink`
  - [x] `StatusBadge`
- [x] 将这些 primitives 调整为适合当前项目的命名、文案和 tone
- [x] 确保 primitives 不依赖当前项目具体业务数据结构

### 9.2 Props-driven 页面模板

- [x] 新建列表页模板（collection/list layout）
- [x] 新建详情页模板（workspace/detail layout）
- [x] 新建审核页模板（review layout）
- [x] 为每个模板定义稳定 props 契约：
  - [x] title / description
  - [x] actions
  - [x] filters
  - [x] groups / sections
  - [x] empty state
  - [x] side panel
- [x] 确保模板本身不直接依赖 Supabase 返回结构
- [x] 确保模板本身不负责 auth、query、权限判断

### 9.3 首批页面重接（只重接 UI，不改业务）

- [x] 用新的列表页模板重接“我的客户”页
- [x] 用新的详情页模板重接“客户详情”页
- [x] 用新的列表/工作台模板重接“匹配工作台”页
- [x] 用新的列表/工作台模板重接“提醒中心”页
- [x] 用新的治理工作台模板重接“管理端匹配页”
- [x] 首批页面接入时，继续沿用当前项目自己的：
  - [x] route
  - [x] data loading
  - [x] actions
  - [x] role 判断
  - [x] 工作流逻辑

### 9.4 页面内容专项清理

- [x] 统一页面 header、section、empty state、quick action 的表达方式
- [x] 清理当前页面中局部自定义 header / 卡片 / 空态 / 按钮区
- [x] 清理当前页面中仍暴露旧设计系统气味的局部 patch
- [x] 确保 tri-state 人话化、头像/生活照分离等既有产品决策在新模板下继续成立
- [x] 为暗色模式补齐“我的客户”页的客户卡片、统计卡与筛选胶囊层次
- [x] 为暗色模式补齐 sidebar、top context bar 与 assist rail 的表面层级和对比关系
- [x] 为暗色模式补齐客户详情页 hero、指标卡、基础信息卡与照片管理模块的卡片系统
- [x] 为暗色模式补齐客户详情页 `匹配推荐 / 录音记录 / 跟进记录` 三个 tab 的卡片、空态、badge 与面板层次
- [x] 为暗色模式补齐“匹配工作台”页的筛选胶囊、Top1 模块、候补卡片与匹配卡系统
- [x] 为暗色模式补齐“提醒中心”页的提醒卡、优先级 badge、空态与操作按钮层次
- [x] 为暗色模式补齐“匹配详情”页的状态条、得分明细、补问面板与跟进操作卡片系统

### 9.5 Phase DS-3 验收

- [x] 页面模板已经真正由 props 驱动，而不是页面里写死壳层
- [x] 首批页面换壳后，业务逻辑与工作流行为保持不变
- [x] 页面之间的 header、section、empty state、action 区域明显更统一
- [x] 当前项目已经形成可持续扩展的设计系统，而不是只修好了几个页面

---

## 10. 测试、联调与发布

### 10.1 回归测试

- [x] 为字段 patch 应用补齐回归测试
- [x] 为 tri-state 更新补齐回归测试
- [x] 为匹配分类补齐回归测试
- [x] 为补问任务生成补齐回归测试
- [x] 为用户侧短句错误提示补齐回归测试

### 10.2 真实流程联调

- [x] 用男方首轮录音验证自动建档
- [ ] 用女方首轮录音验证自动建档
- [x] 用补充录音验证增量更新
- [x] 验证 `unknown -> yes`
- [ ] 验证 `unknown -> no`
- [x] 验证 `pending_confirmation -> confirmed`
- [x] 验证异常确认页真实可用

### 10.3 UI 验收

- [x] 客户详情页在桌面端可用
- [ ] 客户详情页在移动端可用
- [x] 录音详情转录全文可独立滚动
- [x] 红娘前台不再看到原始英文枚举值
- [x] 录音列表摘要不再被遮挡
- [x] 全站图标统一为 `lucide-react`

### 10.4 发布准备

- [x] 清理 `.env` 说明与部署文档
- [ ] 校验生产数据库 migration 顺序
- [x] 校验 Vercel / Supabase 环境变量
- [x] 校验生产构建
- [x] 完成上线前 smoke test

---

## 11. V2 储备项（暂不进入当前主线）

- [ ] 说话人分离 / diarization
- [ ] 长音频自动分段
- [ ] overlap 切段与 transcript 合并去重
- [ ] 段首上下文补偿与术语 prompt
- [ ] MBTI 自报字段
- [ ] Big Five 问卷接入
- [ ] Attachment 问卷接入
- [ ] HEXACO 问卷接入
- [ ] 问卷式补录入口
- [ ] 自助客户端
- [ ] 更精细的财富与核验工作流

---

## 12. 当前阶段最优先事项

- [ ] 完成核心工作流稳定性任务：上传音频 -> 转录 -> 结构化提取 -> 写数据库
- [x] 完成 Phase DS-0：设计系统迁移边界、参考拆解与执行准备
- [x] 完成 Phase 1：字段系统与数据库治理审计补齐
- [ ] 完成 Phase 2：AI 字段提取协议与增量更新链路加固
- [x] 完成 Phase DS-1：Theme Reset 与 UI Primitive 基础设施
- [x] 完成 Phase DS-2：Visual Shell 与 Auth Shell 重构
- [x] 完成 Phase DS-3：App Primitives、Props-driven 模板与首批页面重接
- [x] 完成 Phase 4：匹配引擎与待确认候选机制稳定化

### 12.1 当前执行顺序（固定）

- [ ] 先完成核心工作流稳定性任务：上传音频 -> 转录 -> 结构化提取 -> 写数据库
- [x] 再推进 Phase DS-0：先钉死迁移边界、目录规划和参考映射
- [x] 再推进 Phase DS-1：完成 token、theme、UI primitives 基础层
- [x] 再推进 Phase DS-2：完成 workspace shell 与登录页 auth shell
- [x] 再推进 Phase DS-3：完成 app-primitives、props 模板与首批页面重接

> 说明：这轮 UI 重构不再只是“Apple 式轻工作台”的方向描述，而是明确参考 `virtuals-whale-radar/frontend/admin` 的设计系统结构来做迁移；所有页面改动都必须服从 [plan.md](./plan.md) 中“只迁 UI 设计系统、不迁业务逻辑”的边界。
