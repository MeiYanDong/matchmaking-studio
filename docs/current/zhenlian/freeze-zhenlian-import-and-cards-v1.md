# 甄恋 CRM 导入落点与资料卡边界冻结 v1

> 状态：`v1` 冻结，可引用  
> 适用范围：甄恋 CRM 当前主线第一阶段，导入落点对齐与资料卡可见范围冻结  
> 上游文档：
> - [freeze-zhenlian-fields-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md)
> - [freeze-zhenlian-data-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-data-model-v1.md)
> - [freeze-zhenlian-status-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-status-model-v1.md)
> - [todo-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-phase-1.md)
> 说明：本文回答"三种导入入口如何共享同一套字段落点、AI 草稿到正式写入如何流转、资料材料语义如何边界划分、资料卡三个版本各展示哪些字段"，是第一阶段导入与资料卡的正式合同。

---

## 一、冻结结论

第一阶段导入与资料卡 `v1` 一次性定死了 5 件事：

1. 手动建档、录音提取、PDF 导入三个入口共享同一套字段落点，落点以冻结字段字典为准，不再各自发明字段
2. 所有非手动确认的字段值统一先形成 `field_observations`（草稿层），经人工确认后才进入正式对象
3. 微信截图识别作为第四入口预留，第一阶段不强制实现，但字段落点规则与前三入口保持一致
4. 头像 / 生活照 / 认证材料 / 其他补充材料各有独立语义边界，不再混用
5. 资料卡固定三个版本（内部完整版 / 对客介绍版 / 营销版），每个版本的字段可见范围从字段字典的脱敏级别推导，不再临时发明可见规则

---

## 二、导入入口与字段落点

### 2.1 三入口统一字段落点原则

所有导入入口必须以 [freeze-zhenlian-fields-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md) 中的字段字典作为落点基准：

- 落点字段必须是冻结字段字典中已定义的 `key`
- 不允许入口逻辑自己发明新的中间字段或内部 key
- 如果某个信息在字段字典中没有对应 key，第一阶段先落入对应对象的 `notes` 类备注字段
- 不允许因为某个入口的便利性，把应该属于 `partner_preferences` 的字段写进 `customer_profile`，反之亦然

### 2.2 手动建档

**输入来源**：红娘在建档表单中直接录入

**落点规则**：

| 情况 | 落点 | 值状态 |
|------|------|------|
| 红娘明确填写的值 | 对应正式对象字段 | `confirmed` |
| 红娘主动标记"待确认"的值 | `field_observations` | `draft` |
| 建档必填字段未填 | 阻止建档或提示补全，不允许以空值建档 | - |

**建档第一屏必须包含的字段**（对应 `建档必填` + `P0/P1` 核心骨架）：

- `full_name`（建档必填）
- `gender`（建档必填）
- `current_city`（建档必填）
- `birth_year_month`（建档必填）
- `phone` 或 `wechat_id`（建档必填，至少一项）
- `primary_intent`（首轮补齐，第一屏引导填写）
- `status` 初始值由系统自动设为 `new_pending_completion`，不需要手动选择

**建档第一屏明确不出现的字段**：

- `P3` 以下的低频字段
- 认证材料字段
- AI 分析字段
- 择偶要求中的 `P3` 字段

### 2.3 录音提取

**输入来源**：上传音频 → 转录 → AI 结构化提取

**落点规则**：

| 情况 | 落点 | 值状态 | 说明 |
|------|------|------|------|
| AI 提取的字段值 | 先进入 `field_observations` | `draft` | `source_type = ai_extracted`，`verification_status = unverified` |
| 置信度高 + 非敏感字段 + 无冲突 | 可候选提升到正式对象 | `confirmed` | 需经人工"一键确认"或批量确认操作 |
| 婚育敏感字段 | 必须保留为 `draft`，强制人工确认 | `draft` | 包括：`has_children / children_count / custody_status / financial_ties_with_ex_partner` |
| 与现有 `confirmed` 值冲突 | 不覆盖，先入 `field_observations` | `draft` | 在 `pending_confirmation_fields` 中标出待确认项 |
| 字段字典中没有对应 key 的内容 | 先落入对应对象的 `notes` 或 `ai_summary` | `draft` | 不允许发明新字段 |

**高敏感字段强制保留草稿清单**（不允许 AI 自动提升为 `confirmed`）：

```
has_children
children_count
children_age_notes
custody_status
financial_ties_with_ex_partner
marital_history
monthly_income
annual_income
family_asset_band
financial_assets_notes
insurance_notes
appearance_score
```

### 2.4 PDF / 资料导入

**输入来源**：拖入 PDF 文件 → 解析 → 字段映射

**落点规则**：

| 情况 | 落点 | 值状态 | 说明 |
|------|------|------|------|
| 可映射到冻结字段且来源可验证 | 可直接进入正式对象 | `confirmed` | `source_type = verified_document` |
| 可映射到冻结字段但来源模糊 | 先入 `field_observations` | `draft` | 需人工确认 |
| 无法映射到冻结字段的内容 | 落入对应对象的 `notes` 备注字段 | `draft` | 不允许发明新字段 |
| 图片类材料（身份证照、学历证书等） | 进入 `profile_materials.supplemental_materials` | - | `kind = document`，并可关联到 `profile_certifications` |

**PDF 导入的字段映射目标**，也必须以冻结字段字典为准：

- 不允许 PDF 解析层自己维护一套字段 key
- 如果 PDF 解析工具输出的是临时中间字段，必须在入库前完成映射转换
- 解析失败或映射不确定的内容，先进备注，等待人工处理

### 2.5 微信截图识别（第一阶段预留）

**状态**：第一阶段预留入口，不强制实现

**预留规则**：

- 识别成功后的字段落点与录音提取规则完全一致
- 识别结果先形成 `field_observations`，`source_type = screenshot_extracted`
- 强制保留草稿的字段清单与 2.3 节保持一致
- 第一阶段可以先只保留上传截图到 `supplemental_materials` 的能力，不要求立即做识别提取

---

## 三、AI 草稿 → 人工确认 → 正式写入流转

### 3.1 流转三阶段

```
[入口触发]
    |
    ↓
[草稿层：field_observations]
    source_type: ai_extracted / verified_document / screenshot_extracted
    verification_status: unverified
    |
    ↓ 人工审核操作（逐字段确认 / 批量确认 / 忽略）
    |
[正式层：对应正式对象字段]
    值状态: confirmed
    来源: 按 source_type 映射到来源优先级
```

### 3.2 人工确认操作的最小集合

第一阶段必须支持的操作：

| 操作 | 说明 |
|------|------|
| ��字段确认 | 对单个 `field_observations` 条目，点击"确认采用"，提升为正式值 |
| 批量确认 | 对当前会话 / 当前 PDF 产出的所有候选值，一次性全部确认 |
| 忽略 / 驳回 | 对某个候选值，标记"不采用"，候选值保留为 `draft`，不再提示 |
| 编辑后确认 | 对候选值进行修正后确认，最终写入的是修正后的值 |

第一阶段不要求实现的操作：

- 版本回溯
- 冲突对比 UI
- 批量驳回

### 3.3 已有 `confirmed` 值时的保护规则

| 情况 | 允许动作 |
|------|------|
| 正式对象中该字段尚无 `confirmed` 值 | 可直接确认候选值 |
| 正式对象中该字段已有 `confirmed` 值，新候选值与之相同 | 可直接确认（幂等） |
| 正式对象中该字段已有 `confirmed` 值，新候选值与之不同 | 必须显式展示冲突，由红娘选择采用哪个值，不允许静默覆盖 |

### 3.4 值状态完整流转图

```
草稿值（draft）
  ├─ 人工确认 → confirmed（进入正式对象）
  ├─ 人工忽略 → draft 保留，不再主动提示
  └─ 超出时效/被新候选值取代 → 自动标记 stale（第一阶段可先忽略此状态）

系统派生值（derived）
  └─ 始终跟随源字段变化，不允许手工反向覆盖源字段

已确认值（confirmed）
  └─ 只能由红娘主动修改覆盖，不允许 AI 静默替换
```

---

## 四、资料材料语义边界

### 4.1 四类材料定义

| 材料类型 | 对应字段 | 归属对象 | 语义定义 | 与认证的关系 |
|------|------|------|------|------|
| 头像 | `avatar_url` | `profile_materials` | 客户唯一识别头像，用于列表、资料卡主图 | 不等于认证材料，头像不验证身份 |
| 生活照 | `lifestyle_photo_urls` | `profile_materials` | 多张反映生活状态的辅助图片，用于资料卡侧面展示 | 不等于认证材料 |
| 认证材料 | `profile_certifications.certification_items[*].material_refs` | `profile_certifications` | 用于完成某类认证的原始凭证文件（身份证、毕业证、收入证明等） | 直接关联认证状态 |
| 补充材料 | `profile_materials.supplemental_materials` | `profile_materials` | 其他类型文件，包括客户自述 PDF、截图、语音备注等 | 可关联认证流程，但本身不等于认证结论 |

### 4.2 混用禁止规则

- 头像字段只存唯一识别图，不允许把生活照存入 `avatar_url`
- 生活照字段 `lifestyle_photo_urls` 只存生活类辅助图，不允许存认证材料原图
- 认证材料的 `material_refs` 只存文件引用，认证状态本身由 `certification_items[*].status` 管理，不由材料存在与否推断
- 补充材料的 `supplemental_materials` 只承接无法归入以上三类的其他材料，不允许把头像/生活照重复存一遍

### 4.3 `supplemental_materials` 子结构（已由主数据模型冻结确认）

```ts
{
  kind: 'document' | 'screenshot' | 'voice_note' | 'other'
  url: string
  title: string | null
  description: string | null
  uploaded_at: string | null
  source: 'matchmaker' | 'client' | 'imported' | 'system'
}
```

### 4.4 认证材料与认证状态的关系

- 上传认证材料 ≠ 认证通过
- 认证通过需要人工审核，由 `certification_items[*].status` 从 `pending_review` 迁移到 `verified`
- 第一阶段只冻结对象边界，认证审核流程细节在后续专项处理

---

## 五、资料卡三版本可见范围

### 5.1 三个版本定义

| 版本 | 使用场景 | 核心目的 |
|------|------|------|
| **内部完整版** | 红娘内部查阅，不对外展示 | 全字段，含内部备注、评分、状态、AI 摘要 |
| **对客介绍版** | 红娘向客户介绍某个候选对象时使用 | 脱敏后的基本信息 + 优势呈现，不含联系方式和内部判断 |
| **营销版** | 朋友圈、社群等外部渠道宣传 | 高度脱敏，只保留最具吸引力的外显信息 |

### 5.2 字段可见范围（从脱敏级别推导）

可见性规则说明：
- `internal_full`：只出现在内部完整版
- `client_summary`：出现在内部完整版 + 对客介绍版（可摘要展示）
- `client_opt_in`：出现在内部完整版，经红娘手动选择后可进入对客介绍版；营销版原则上不主动展示，由红娘自行决定是否附加
- `client_hidden`：只出现在内部完整版，对客两个版本都不展示

#### 内部完整版可见字段

所有已冻结字段均可见，包括：
- `P0-P3` 全部 `customer_profile` 字段
- `partner_preferences` 全部字段
- `customer_lifecycle` 全部字段（状态、负责人、下一步、截止时间、阻塞点）
- `customer_source` 全部字段
- `profile_materials` 全部字段
- `profile_certifications` 认证状态摘要
- `profile_ai_analysis` AI 摘要 + 待确认字段标记

#### 对客介绍版可见字段

只包含脱敏级别为 `client_summary` 或人工选入的 `client_opt_in` 字段：

**默认可见（`client_summary`）**：

| 字段 | 展示说明 |
|------|------|
| `full_name` | 可展示姓氏 + 某某，或 `display_name` |
| `display_name` | 优先展示昵称 |
| `gender` | 直接展示 |
| `current_city` | 直接展示 |
| `birth_year_month` → `age` | 展示年龄，不展示具体出生年月 |
| `height_cm` | 直接展示 |
| `education_level` | 直接展示（学历级别） |
| `bachelor_school` | 直接展示 |
| `master_school` | 直接展示（如有） |
| `doctor_school` | 直接展示（如有） |
| `marital_history` | 直接展示 |
| `has_children` | 直接展示（有/没有/待确认） |
| `primary_intent` | 直接展示 |

**红娘手动选择后可见（`client_opt_in`）**：

| 字段 | 展示说明 |
|------|------|
| `avatar_url` | 展示头像 |
| `lifestyle_photo_urls` | 展示生活照 |
| `major` | 展示专业 |
| `company_name` | 可展示为"某行业/某类企业"，不必完整暴露 |
| `job_title` | 展示职位 |
| `monthly_income` / `annual_income` | 展示区间或摘要，不必精确数字 |
| `has_property` | 展示有/无 |
| `property_count` / `property_notes` | 展示摘要 |
| `has_vehicle` | 展示有/无 |
| `vehicle_brand` / `vehicle_model` | 展示车辆信息 |
| `vehicle_notes` | 展示摘要 |
| `personality_summary` | 展示摘要 |
| `mbti` | 展示 |
| `hobbies` | 展示标签 |
| `self_description` | 展示摘要 |
| `message_to_future_partner` | 展示原文或摘要 |
| `zodiac_sign` | 展示 |

**对客介绍版明确不展示的字段**：

- `phone` / `wechat_id`（联系方式全程不展示）
- `weight_kg`（对客默认不展示）
- `appearance_score`（内部评分不展示）
- `urgency_level`（内部跟进状态）
- `status` / `owner` / `next_action`（生命周期内部字段）
- `customer_source` 全部字段
- `financial_assets_notes` / `insurance_notes`（敏感资产详情）
- `family_asset_band`（内部档位）
- `financial_ties_with_ex_partner`（敏感）
- `custody_status` / `children_age_notes`（第一阶段对客不主动展示）
- `income_source_type`（内部判断）
- `hukou_city` / `native_place`（对客默认不展示）
- `parents_occupation` / `parents_marital_status` / `family_origin_notes`（内部字段）
- `siblings_summary`（内部字段）
- `marital_history_notes`（敏感细节）
- 所有 `partner_preferences` 字段（择偶要求不对外展示）
- `profile_ai_analysis` 全部字段（AI 摘要不对外展示）
- 所有 `certification_items` 的材料引用（认证结论可摘要，但不展示材料本身）

#### 营销版可见字段

营销版在对客介绍版基础上进一步收缩，原则是：**只保留最有外显吸引力的信息，剔除所有可能引发隐私顾虑的内容**。

营销版默认包含的字段（参考）：

| 字段 | 展示形式 |
|------|------|
| `gender` | 男 / 女 |
| `current_city` | 城市 |
| `age`（由生日派生） | 年龄 |
| `height_cm` | 身高 |
| `education_level` | 学历 |
| `bachelor_school` / `master_school` | 院校（如有） |
| `primary_intent` | 恋爱 / 结婚 / 生育 |
| `hobbies` | 兴趣标签 |
| `personality_summary` | 性格摘要（由红娘选取片段） |
| `avatar_url` | 头像（由红娘决定是否附图） |
| `lifestyle_photo_urls` | 生活照（由红娘决定选几张） |

营销版明确不出现的字段：
- 联系方式
- 具体单位名称
- 具体收入数字
- 婚史和孩子信息（可概括为"个人状态良好"等，但不展示枚举值）
- 资产详情
- 所有 `client_hidden` 字段

### 5.3 资料卡消费冻结字段约束

**约束规则**：

1. 资料卡三个版本的展示字段，必须且只能来自已冻结字段字典中的正式 key
2. 不允许资料卡层自己发明展示用的临时字段
3. 如果需要展示当前冻结字段中没有的信息，必须先走字段冻结流程，再修改资料卡模板
4. 展示值与存储值的转换（枚举展示名、单位换算等）必须遵循字段字典中的"展示与存储说明"
5. "脱敏展示"（如姓名只展示姓氏）属于展示层变换，不改变底层存储值

**检验标准**：

> 任何新版本的资料卡模板上线前，应能在 `freeze-zhenlian-fields-v1.md` 中逐一找到每个展示字段的对应 `key`；若找不到，说明违反了本约束，需先完成字段冻结才能上线。

---

## 六、当前顺序约束与阶段边界

### 6.1 第一阶段必须交付的

- [x] 三入口共享同一套字段落点规范（本文 § 二）
- [x] AI 草稿 → 人工确认 → 正式写入流转（本文 § 三）
- [x] 微信截图入口预留规则（本文 § 2.5）
- [x] 四类材料语义边界（本文 § 四）
- [x] 资料卡三版本可见范围（本文 § 五）

### 6.2 第一阶段明确不做

- 版本回溯与历史对比 UI
- 认证审核完整流程
- 营销版资料卡的自动生成能力（第一阶段只定规则，不做自动化）
- 微信截图 OCR / 识别实现

### 6.3 进入实现的前置条件

在开始 schema 草案、API 设计或页面实现之前，需要同时满足：

1. 本文（导入与资料卡冻结）已达到可引用状态
2. `freeze-zhenlian-fields-v1.md` 字段字典已达到可引用状态
3. `freeze-zhenlian-data-model-v1.md` 主数据模型已达到可引用状态
4. `freeze-zhenlian-status-model-v1.md` 状态模型已达到可引用状态

以上四份文档共同构成第一阶段 schema 草案的完整推导基础。

---

## 七、冻结评审结论 v1

### 7.1 本轮已冻结完成

- 三入口（手动 / 录音 / PDF）共享字段落点规则
- AI 草稿 → 人工确认 → 正式写入的三阶段流转
- 高敏感字段强制保留草稿清单
- 确认值冲突保护规则
- 微信截图第四入口预留规则
- 四类材料（头像 / 生活照 / 认证材料 / 补充材料）语义边界与混用禁止规则
- 资料卡三版本（内部完整版 / 对客介绍版 / 营销版）字段可见范围
- 资料卡只消费冻结字段的强约束

### 7.2 本轮明确未展开

- schema 草案（待后续由四份冻结文档联合推导）
- AI 提取目标结构（待后续专项）
- 认证审核流程细节
- 营销版自动生成能力
- 微信截图 OCR 实现

### 7.3 本轮结论

导入与���料卡冻结已达到第一阶段可引用状态。

与字段冻结、主数据模型冻结、状态模型冻结并列，共同构成进入实现准备阶段的四份基础文档。

后续应进入：

1. 从四份冻结文档联合推导 schema 草案
2. 明确 AI 提取目标结构（从字段字典直接推导）
3. 完成一次 phase-1 评审，正式从"规划"进入"实现准备"
