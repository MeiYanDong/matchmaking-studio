# 甄恋 CRM 字段冻结包 v1

> 状态：`v1` 冻结，可引用  
> 适用范围：甄恋 CRM 当前主线，模块一 `2.1 字段优先级重排`、`2.2 字段问题修复`、`2.3 动态联动表单逻辑`  
> 上游文档：
> - [甄恋CRM产品重构方案（聚合版）.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/甄恋CRM产品重构方案（聚合版）.md)
> - [plan-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-phase-1.md)
> - [plan-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-fields-2.1-2.3.md)
> - [todo-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-fields-2.1-2.3.md)
> 说明：本文是字段专项的正式输出包，一次性给出 `字段字典 v1`、`枚举值表 v1`、`旧字段迁移表 v1`、`联动矩阵 v1` 和 `冻结评审结论 v1`。

---

## 一、冻结结论

这次 `v1` 冻结明确了 5 件事：

1. `2.1~2.3` 涉及字段已形成正式字段字典，不再只是方案描述
2. `P0-P5` 分层已固定，且每个正式字段只有一个主分层
3. 关键问题字段已经明确采用 `拆分 / 合并 / 标准化 / 联动` 中的哪一种动作
4. 旧字段到新字段的迁移方式已经明确，不再靠口头理解
5. 联动逻辑已经转成正式矩阵，后续页面和 AI 只能消费，不再反向定义结构

本文件之后，模块一 `2.1~2.3` 的 source of truth 以本文为准；上游 `plan` 负责解释为什么这样设计，本文负责定义到底落什么。

---

## 二、元数据规则

### 2.1 字段类型

| 类型 | 说明 |
|------|------|
| `enum_single` | 单值枚举 |
| `enum_multi` | 多值枚举 |
| `number` | 数值 |
| `text` | 文本 |
| `date_partial` | 不要求完整日期的时间字段，如 `YYYY-MM` |
| `url` | 单个链接 |
| `url_array` | 多个链接 |
| `derived` | 系统派生字段 |
| `lifecycle_ref` | 主显但归属生命周期对象 |

### 2.2 录入层级

| 层级 | 说明 |
|------|------|
| `建档必填` | 没有就不应正式建档 |
| `首轮补齐` | 初次访谈或首次整理后应尽快补齐 |
| `递进补全` | 允许先空，但要在推进过程中持续补齐 |
| `系统派生` | 不要求手填，由系统生成或换算 |

### 2.3 来源优先级

默认优先级固定为：

`红娘确认值 > 客户原始资料值 > AI 提取值 > 系统派生值`

字段表里的 `来源优先级` 用以下缩写：

| 缩写 | 含义 |
|------|------|
| `MC > CM > AI > SYS` | 红娘确认 > 客户资料 > AI > 系统派生 |
| `MC > CM > AI` | 红娘确认 > 客户资料 > AI |
| `SYS` | 系统派生，不接受手工覆盖源事实 |
| `LIFECYCLE` | 由生命周期对象维护 |

### 2.4 脱敏级别

| 级别 | 说明 |
|------|------|
| `internal_full` | 仅内部完整显示 |
| `client_summary` | 对客可展示摘要或脱敏结果 |
| `client_opt_in` | 仅在人工选择后进入对客资料卡 |
| `client_hidden` | 对客默认隐藏 |

### 2.5 当前冻结中的关键兼容决策

| 主题 | 正式 key | 兼容 / 退役说明 |
|------|------|------|
| 对方婚史偏好 | `accepts_partner_marital_history` | `preferred_partner_marital_history` 退为旧文案别名，不再作为正式 key |
| 资产说明 | `financial_assets_notes` + `insurance_notes` | `personal_assets_notes` 退为历史备注承接，不再作为正式主字段 |
| 车辆字段 | `has_vehicle` + `vehicle_brand` + `vehicle_model` + `vehicle_notes` | `has_vehicle + vehicle_notes` 只够历史兼容，不再代表正式结构 |
| 房产字段 | `has_property` + `property_count` + `property_notes` | 旧 `assets` 或单一“有房产”字段必须拆分 |

---

## 三、2.1 字段分层与显示合同

### 3.1 客户主档案 `P0-P5`

| 分层 | 正式字段 |
|------|------|
| `P0` | `full_name` `display_name` `gender` `current_city` `status` |
| `P1` | `birth_year_month` `age` `height_cm` `weight_kg` `avatar_url` `appearance_score` `primary_intent` |
| `P2` | `education_level` `bachelor_school` `master_school` `doctor_school` `major` `company_name` `job_title` `monthly_income` `annual_income` `income_source_type` `lifestyle_photo_urls` `has_property` `property_count` `property_notes` `has_vehicle` `vehicle_brand` `vehicle_model` `vehicle_notes` `family_asset_band` `financial_assets_notes` `insurance_notes` |
| `P3` | `marital_history` `marital_history_notes` `has_children` `children_count` `children_age_notes` `custody_status` `financial_ties_with_ex_partner` `smokes` `smoking_frequency` `drinks` `drinking_frequency` `urgency_level` `siblings_summary` `parents_occupation` `parents_marital_status` `family_origin_notes` `personality_summary` `mbti` `hobbies` `self_description` |
| `P4` | 当前模块不新增认证字段；认证相关仍在 phase-1 后续冻结 |
| `P5` | 当前模块不新增 AI 分析字段；AI 摘要仍在 phase-1 后续冻结 |

### 3.2 择偶要求 `P0-P5`

| 分层 | 正式字段 |
|------|------|
| `P0` | 无；择偶要求不参与客户身份识别 |
| `P1` | `preferred_age_min` `preferred_age_max` `preferred_height_min` `preferred_height_max` `preferred_locations` `preferred_education_levels` `primary_intent` |
| `P2` | `preferred_occupation_notes` `preferred_financial_requirements` `accepts_partner_marital_history` `accepts_partner_children` |
| `P3` | `preferred_personality_notes` `message_to_future_partner` `accepts_long_distance` `preferred_date_frequency_notes` `monthly_dating_budget` `gift_preference_notes` `accepts_relocation` `wedding_scale_preference` `post_marriage_property_arrangement_notes` `accepts_living_with_partner_parents` `preferred_children_count` `childbearing_timeline_notes` `parenting_role_preference_notes` `requires_fertility_proof` |
| `P4` | 当前模块不新增认证要求字段 |
| `P5` | 当前模块不新增 AI 推断要求字段 |

### 3.3 不同界面的显示合同

| 场景 | 必须出现 | 明确不该发生的情况 |
|------|------|------|
| 客户列表 | `P0 + 少量 P1` | 看不到客户是谁、在哪、当前状态是什么 |
| 客户详情首屏 | 完整 `P0 + 核心 P1` | 城市 / 状态 / 主意图被下沉到详情深处 |
| 手动建档第一屏 | `建档必填 + P0/P1 主骨架` | 默认铺出整页低频字段 |
| 对客资料卡 | `P0/P1/P2` 的脱敏结果 | 直接暴露待确认项、认证材料、内部备注 |
| 内部完整版资料卡 | `P0-P5` 摘要 | 混淆 AI 字段与人工确认字段 |
| 筛选面板 | `P1/P2/P3` | 把 `hukou_city / native_place` 放到高优先级筛选位 |

### 3.4 特殊约束

- `status` 虽然属于 `P0` 主显字段，但归属 `customer_lifecycle`，不算静态身份事实
- `current_city` 与 `hukou_city / native_place` 完全分离，且优先级显著更高
- 每个正式字段只能有一个主分层，不再跨层重复归属

---

## 四、字段字典 v1

### 4.1 客户主档案字段字典

| key | 中文名 | 对象 | 分层 | 类型 | 单位 | 枚举/值域 | 录入层级 | 联动/触发 | 来源优先级 | 脱敏级别 | 展示与存储说明 |
|------|------|------|------|------|------|------|------|------|------|------|------|
| `full_name` | 姓名 | `customer_profile` | `P0` | `text` | - | - | `建档必填` | 始终可见 | `MC > CM > AI` | `client_summary` | 存正式姓名；展示可用全名 |
| `display_name` | 昵称/常用称呼 | `customer_profile` | `P0` | `text` | - | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_summary` | 存常用称呼；列表和资料卡可优先展示 |
| `gender` | 性别 | `customer_profile` | `P0` | `enum_single` | - | 见枚举表 | `建档必填` | 始终可见 | `MC > CM > AI` | `client_summary` | 存稳定枚举；展示中文文案 |
| `current_city` | 所在城市 | `customer_profile` | `P0` | `text` | - | - | `建档必填` | 始终可见 | `MC > CM > AI` | `client_summary` | 存当前长期生活/工作地，不和户籍混用 |
| `status` | 当前状态 | `customer_lifecycle` | `P0` | `lifecycle_ref` | - | 见生命周期冻结 | `建档必填` | 始终主显 | `LIFECYCLE` | `client_hidden` | 主显，但归属生命周期对象 |
| `birth_year_month` | 出生年月 | `customer_profile` | `P1` | `date_partial` | `YYYY-MM` | - | `建档必填` | 始终可见 | `MC > CM > AI` | `client_summary` | 存出生年月；详情/资料卡可展示年龄 |
| `age` | 年龄 | `customer_profile` | `P1` | `derived` | 岁 | - | `系统派生` | 由 `birth_year_month` 派生 | `SYS` | `client_summary` | 只展示，不反向覆盖出生年月 |
| `height_cm` | 身高 | `customer_profile` | `P1` | `number` | `cm` | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_summary` | 存厘米数值；展示可附单位 |
| `weight_kg` | 体重 | `customer_profile` | `P1` | `number` | `kg` | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 存公斤数值；对客默认不主显 |
| `avatar_url` | 头像 | `profile_materials` | `P1` | `url` | - | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 存唯一识别头像，不与生活照混用 |
| `appearance_score` | 颜值评分 | `customer_profile` | `P1` | `number` | 分 | `5.0~9.5` | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 存内部锚点评分；对客默认不显示具体分值 |
| `primary_intent` | 意图 | `partner_preferences` | `P1` | `enum_single` | - | 见枚举表 | `首轮补齐` | 始终主显 | `MC > CM > AI` | `client_summary` | 沿用现有 key；值固定为 `dating/marriage/fertility/unknown` |
| `hukou_city` | 户籍 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 不再参与 `P0` 识别 |
| `native_place` | 籍贯 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 家族/出生地语义，不等于当前所在地 |
| `zodiac_sign` | 星座 | `customer_profile` | `P3` | `derived` | - | 见枚举表 | `系统派生` | 由生日可派生 | `SYS` | `client_opt_in` | 可展示，不作为建档源事实 |
| `phone` | 手机号 | `customer_profile` | `P1` | `text` | - | - | `建档必填` | `phone` 或 `wechat_id` 至少一项 | `MC > CM > AI` | `client_hidden` | 联系方式只内部可见 |
| `wechat_id` | 微信号 | `customer_profile` | `P1` | `text` | - | - | `建档必填` | `phone` 或 `wechat_id` 至少一项 | `MC > CM > AI` | `client_hidden` | 联系方式只内部可见 |
| `education_level` | 最高学历 | `customer_profile` | `P2` | `enum_single` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_summary` | 固定表示最高学历，不表示在读状态 |
| `bachelor_school` | 本科院校 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `education_level >= bachelor` | `MC > CM > AI` | `client_summary` | 只在本科及以上展开 |
| `master_school` | 硕士院校 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `education_level >= master` | `MC > CM > AI` | `client_summary` | 只在硕士及以上展开 |
| `doctor_school` | 博士院校 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `education_level = doctor` | `MC > CM > AI` | `client_summary` | 只在博士展开 |
| `major` | 专业 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 第一阶段先文本，不拆院系 |
| `company_name` | 工作单位 | `customer_profile` | `P2` | `text` | - | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 可对客摘要展示单位类型，不必完整暴露 |
| `job_title` | 职位 | `customer_profile` | `P2` | `text` | - | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 存职位文本，不与收入混写 |
| `monthly_income` | 月收入 | `customer_profile` | `P2` | `number` | `CNY/月` | - | `递进补全` | 始终可见 | `MC > CM > AI > SYS` | `client_opt_in` | 源字段，后续可换算年收入 |
| `annual_income` | 年收入 | `customer_profile` | `P2` | `derived` | `CNY/年` | - | `递进补全` | 由 `monthly_income` 派生，或人工补录 | `MC > CM > AI > SYS` | `client_opt_in` | 展示层可优先展示年收入概述 |
| `income_source_type` | 收入来源性质 | `customer_profile` | `P2` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 只描述主要来源性质，不做金额重复 |
| `lifestyle_photo_urls` | 生活照 | `profile_materials` | `P2` | `url_array` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 存多张资料图，用于资料卡辅助表达 |
| `marital_history` | 婚史 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_summary` | 存稳定婚史枚举，不再自由文本散写 |
| `marital_history_notes` | 婚史说明 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | `marital_history = divorced` 或 `widowed` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本说明，不继续深拆 |
| `has_children` | 是否有孩子 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_summary` | 明确区分 `yes/no/unknown`，不再用布尔简化业务语义 |
| `children_count` | 孩子数量 | `customer_profile` | `P3` | `number` | 个 | - | `首轮补齐` | `has_children = yes` | `MC > CM > AI` | `client_hidden` | 有孩子时优先级自动上升 |
| `children_age_notes` | 孩子年龄说明 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | `has_children = yes` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本承接 |
| `custody_status` | 抚养权归属 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `has_children = yes` | `MC > CM > AI` | `client_hidden` | 只在相关场景进入匹配判断 |
| `financial_ties_with_ex_partner` | 与前任金融往来 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `has_children = yes` 或 `marital_history = divorced` | `MC > CM > AI` | `client_hidden` | 敏感字段，只在明确表达后记录 |
| `smokes` | 是否吸烟 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 只保留在生活习惯区，不再在基本信息重复 |
| `smoking_frequency` | 吸烟频率 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `smokes = yes` | `MC > CM > AI` | `client_hidden` | 只有吸烟时展开 |
| `drinks` | 是否饮酒 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 只保留在生活习惯区 |
| `drinking_frequency` | 饮酒频率 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `drinks = yes` | `MC > CM > AI` | `client_hidden` | 只有饮酒时展开 |
| `has_property` | 是否有房产 | `customer_profile` | `P2` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 高层判断字段，不等于房产细节 |
| `property_count` | 房产数量 | `customer_profile` | `P2` | `number` | 套 | - | `递进补全` | `has_property = yes` | `MC > CM > AI` | `client_opt_in` | 只在有房产时展开 |
| `property_notes` | 房产说明 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `has_property = yes` | `MC > CM > AI` | `client_opt_in` | 地点、性质、贷款情况等先文本化 |
| `has_vehicle` | 是否有车辆 | `customer_profile` | `P2` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 高层判断字段 |
| `vehicle_brand` | 车辆品牌 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `has_vehicle = yes` | `MC > CM > AI` | `client_opt_in` | 对高净值场景是重要信息，不再只留备注 |
| `vehicle_model` | 车辆型号 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `has_vehicle = yes` | `MC > CM > AI` | `client_opt_in` | 型号与品牌分开存储 |
| `vehicle_notes` | 车辆说明 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | `has_vehicle = yes` | `MC > CM > AI` | `client_opt_in` | 购置情况、车龄等先文本承接 |
| `family_asset_band` | 家庭总资产档位 | `customer_profile` | `P2` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 第一阶段先保留 `A7/A8/A9/A10` 档位 |
| `financial_assets_notes` | 金融资产说明 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 股票、基金、现金、理财等 |
| `insurance_notes` | 保险资产说明 | `customer_profile` | `P2` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 年金险、寿险等先文本承接 |
| `urgency_level` | 迫切程度 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 替代旧“认真程度” |
| `siblings_summary` | 兄弟姐妹情况 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `parents_occupation` | 父母职业 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `parents_marital_status` | 父母婚姻状态 | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 与“原生家庭描述”分离 |
| `family_origin_notes` | 原生家庭说明 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 只承接叙述，不冒充结构事实 |
| `personality_summary` | 性格摘要 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 内外都可摘要展示 |
| `mbti` | MBTI | `customer_profile` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 存标准 16 型值 |
| `hobbies` | 兴趣爱好 | `customer_profile` | `P3` | `enum_multi` | - | 见枚举表 | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 底层为枚举数组，展示为标签 |
| `self_description` | 自我评价 | `customer_profile` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 保留原始表达，可用于资料卡摘要 |

### 4.2 择偶要求字段字典

| key | 中文名 | 对象 | 分层 | 类型 | 单位 | 枚举/值域 | 录入层级 | 联动/触发 | 来源优先级 | 脱敏级别 | 展示与存储说明 |
|------|------|------|------|------|------|------|------|------|------|------|------|
| `preferred_age_min` | 期望年龄下限 | `partner_preferences` | `P1` | `number` | 岁 | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 存数值，不用文本“28-35”混写 |
| `preferred_age_max` | 期望年龄上限 | `partner_preferences` | `P1` | `number` | 岁 | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 与下限组成区间 |
| `preferred_height_min` | 期望身高下限 | `partner_preferences` | `P1` | `number` | `cm` | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 存厘米数值 |
| `preferred_height_max` | 期望身高上限 | `partner_preferences` | `P1` | `number` | `cm` | - | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 与下限组成区间 |
| `preferred_locations` | 期望地域 | `partner_preferences` | `P1` | `enum_multi` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 多值地域列表，可展示为标签 |
| `preferred_education_levels` | 期望学历 | `partner_preferences` | `P1` | `enum_multi` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 底层多值枚举，不用自由文本 |
| `preferred_occupation_notes` | 期望职业 | `partner_preferences` | `P2` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 第一阶段先文本承接 |
| `preferred_financial_requirements` | 经济要求说明 | `partner_preferences` | `P2` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 先文本化，不强行拆成多子字段 |
| `accepts_partner_marital_history` | 可接受的对方婚史 | `partner_preferences` | `P2` | `enum_multi` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 正式 key 固定为 `accepts_partner_marital_history` |
| `accepts_partner_children` | 是否接受对方有孩子 | `partner_preferences` | `P2` | `enum_single` | - | 见枚举表 | `首轮补齐` | 始终可见 | `MC > CM > AI` | `client_hidden` | 高价值边界字段，默认用 tri-state 表达 |
| `preferred_personality_notes` | 期望性格 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `message_to_future_partner` | 想对另一半说的话 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | 始终可见 | `MC > CM > AI` | `client_opt_in` | 可作为资料卡情感表达字段 |
| `accepts_long_distance` | 是否接受异地 | `partner_preferences` | `P3` | `enum_single` | - | 见枚举表 | `首轮补齐` | `primary_intent = dating` 时优先 | `MC > CM > AI` | `client_hidden` | 对恋爱场景权重更高 |
| `preferred_date_frequency_notes` | 约会频率期望 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | `primary_intent = dating` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `monthly_dating_budget` | 恋爱月预算 | `partner_preferences` | `P3` | `number` | `CNY/月` | - | `递进补全` | `primary_intent = dating` | `MC > CM > AI` | `client_hidden` | 存月预算数值 |
| `gift_preference_notes` | 送礼/付出偏好 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | `primary_intent = dating` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `accepts_relocation` | 是否接受迁居 | `partner_preferences` | `P3` | `enum_single` | - | 见枚举表 | `首轮补齐` | `primary_intent = marriage` | `MC > CM > AI` | `client_hidden` | 婚后现实边界字段 |
| `wedding_scale_preference` | 婚礼规模偏好 | `partner_preferences` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `primary_intent = marriage` | `MC > CM > AI` | `client_hidden` | 存标准枚举，不用自由文本 |
| `post_marriage_property_arrangement_notes` | 婚后财产安排意愿 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | `primary_intent = marriage` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `accepts_living_with_partner_parents` | 是否接受和对方父母同住 | `partner_preferences` | `P3` | `enum_single` | - | 见枚举表 | `首轮补齐` | `primary_intent = marriage` | `MC > CM > AI` | `client_hidden` | 婚后边界字段 |
| `preferred_children_count` | 期望生育数量 | `partner_preferences` | `P3` | `number` | 个 | - | `首轮补齐` | `primary_intent = fertility` | `MC > CM > AI` | `client_hidden` | 表达目标值，不等于现有子女数 |
| `childbearing_timeline_notes` | 生育时间规划 | `partner_preferences` | `P3` | `text` | - | - | `首轮补齐` | `primary_intent = fertility` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `parenting_role_preference_notes` | 育儿分工偏好 | `partner_preferences` | `P3` | `text` | - | - | `递进补全` | `primary_intent = fertility` | `MC > CM > AI` | `client_hidden` | 第一阶段先文本 |
| `requires_fertility_proof` | 是否要求生育能力证明 | `partner_preferences` | `P3` | `enum_single` | - | 见枚举表 | `递进补全` | `primary_intent = fertility` | `MC > CM > AI` | `client_hidden` | 只在明确表达后写入 |

---

## 五、枚举值表 v1

### 5.1 基础身份与状态枚举

| 字段 | 存储值 | 展示值 |
|------|------|------|
| `gender` | `male` | 男 |
| `gender` | `female` | 女 |
| `gender` | `unknown` | 待确认 |
| `education_level` | `high_school_or_below` | 高中及以下 |
| `education_level` | `junior_college` | 大专 |
| `education_level` | `bachelor` | 本科 |
| `education_level` | `master` | 硕士 |
| `education_level` | `doctor` | 博士 |
| `education_level` | `unknown` | 待确认 |
| `urgency_level` | `low` | 不着急 |
| `urgency_level` | `normal` | 正常推进 |
| `urgency_level` | `high` | 较急 |
| `urgency_level` | `urgent` | 很急 |
| `urgency_level` | `unknown` | 待确认 |

### 5.2 婚育与生活习惯枚举

| 字段 | 存储值 | 展示值 |
|------|------|------|
| `marital_history` | `never_married` | 未婚 |
| `marital_history` | `divorced` | 离异 |
| `marital_history` | `widowed` | 丧偶 |
| `marital_history` | `unknown` | 待确认 |
| `has_children` | `yes` | 有 |
| `has_children` | `no` | 没有 |
| `has_children` | `unknown` | 待确认 |
| `custody_status` | `self` | 自己抚养 |
| `custody_status` | `ex_partner` | 对方抚养 |
| `custody_status` | `shared` | 共同抚养 |
| `custody_status` | `other` | 其他 |
| `custody_status` | `unknown` | 待确认 |
| `financial_ties_with_ex_partner` | `yes` | 有 |
| `financial_ties_with_ex_partner` | `no` | 没有 |
| `financial_ties_with_ex_partner` | `unknown` | 待确认 |
| `smokes` / `drinks` | `yes` | 是 |
| `smokes` / `drinks` | `no` | 否 |
| `smokes` / `drinks` | `unknown` | 待确认 |
| `smoking_frequency` / `drinking_frequency` | `occasionally` | 偶尔 |
| `smoking_frequency` / `drinking_frequency` | `frequently` | 经常 |
| `smoking_frequency` / `drinking_frequency` | `daily` | 每天 |
| `smoking_frequency` / `drinking_frequency` | `unknown` | 待确认 |
| `parents_marital_status` | `together` | 父母婚姻稳定 |
| `parents_marital_status` | `divorced` | 父母离异 |
| `parents_marital_status` | `widowed` | 一方已故 |
| `parents_marital_status` | `unknown` | 待确认 |

### 5.3 资产与材料枚举

| 字段 | 存储值 | 展示值 |
|------|------|------|
| `has_property` / `has_vehicle` | `yes` | 有 |
| `has_property` / `has_vehicle` | `no` | 没有 |
| `has_property` / `has_vehicle` | `unknown` | 待确认 |
| `family_asset_band` | `A7` | A7 |
| `family_asset_band` | `A8` | A8 |
| `family_asset_band` | `A9` | A9 |
| `family_asset_band` | `A10` | A10 |
| `family_asset_band` | `unknown` | 待确认 |

### 5.4 收入与人格枚举

| 字段 | 存储值 | 展示值 |
|------|------|------|
| `income_source_type` | `salary` | 工资薪酬 |
| `income_source_type` | `dividend` | 分红/投资 |
| `income_source_type` | `self_business` | 自营/经营收入 |
| `income_source_type` | `mixed` | 混合来源 |
| `income_source_type` | `other` | 其他 |
| `income_source_type` | `unknown` | 待确认 |
| `mbti` | `INTJ/INTP/ENTJ/ENTP/INFJ/INFP/ENFJ/ENFP/ISTJ/ISFJ/ESTJ/ESFJ/ISTP/ISFP/ESTP/ESFP` | 原值展示 |

### 5.5 意图与择偶偏好枚举

| 字段 | 存储值 | 展示值 |
|------|------|------|
| `primary_intent` | `dating` | 恋爱 |
| `primary_intent` | `marriage` | 结婚 |
| `primary_intent` | `fertility` | 生育 |
| `primary_intent` | `unknown` | 待确认 |
| `accepts_partner_children` | `yes` | 接受 |
| `accepts_partner_children` | `no` | 不接受 |
| `accepts_partner_children` | `unknown` | 待确认 |
| `accepts_long_distance` | `yes` | 接受 |
| `accepts_long_distance` | `no` | 不接受 |
| `accepts_long_distance` | `unknown` | 待确认 |
| `accepts_relocation` | `yes` | 接受 |
| `accepts_relocation` | `no` | 不接受 |
| `accepts_relocation` | `unknown` | 待确认 |
| `accepts_living_with_partner_parents` | `yes` | 接受 |
| `accepts_living_with_partner_parents` | `no` | 不接受 |
| `accepts_living_with_partner_parents` | `unknown` | 待确认 |
| `requires_fertility_proof` | `yes` | 需要 |
| `requires_fertility_proof` | `no` | 不需要 |
| `requires_fertility_proof` | `unknown` | 待确认 |
| `accepts_partner_marital_history` | `never_married` | 接受未婚 |
| `accepts_partner_marital_history` | `divorced` | 接受离异 |
| `accepts_partner_marital_history` | `widowed` | 接受丧偶 |
| `preferred_locations` | `same_city` | 同城优先 |
| `preferred_locations` | `same_province` | 同省优先 |
| `preferred_locations` | `cross_province` | 可跨省 |
| `preferred_locations` | `flexible` | 地域灵活 |
| `wedding_scale_preference` | `small` | 小型 |
| `wedding_scale_preference` | `medium` | 中型 |
| `wedding_scale_preference` | `large` | 大型 |
| `wedding_scale_preference` | `flexible` | 灵活 |
| `wedding_scale_preference` | `unknown` | 待确认 |

---

## 六、旧字段迁移表 v1

| 旧字段 / 旧语义 | 动作 | 新字段落点 | 迁移规则 |
|------|------|------|------|
| `name` / 模糊姓名 | 合并规范化 | `full_name` + `display_name` | 正式姓名进 `full_name`，昵称或常用称呼进 `display_name` |
| `city` | 改语义 | `current_city` | 当前居住/工作地统一进 `current_city` |
| `hukou` | 保留 | `hukou_city` | 不再与 `current_city` 抢主显 |
| `origin` / `native_place` | 保留 | `native_place` | 家族/出生地语义单独保留 |
| `education` | 拆分 | `education_level` + `bachelor_school` + `master_school` + `doctor_school` | 先判断最高学历，再按层级补学校；无法确定学校时只迁 `education_level` |
| `income` / `annual_income_range` | 合并重构 | `monthly_income` + `annual_income` + `income_source_type` | 能换算则换算；不能稳定换算的模糊值下沉备注 |
| `appearance_score` 旧 1-10 自由分 | 标准化 | `appearance_score` | 存量值先保留，后续人工按锚点重校 |
| `assets` / “房车资产”一句话 | 拆分 | `has_property` `property_count` `property_notes` `has_vehicle` `vehicle_brand` `vehicle_model` `vehicle_notes` `family_asset_band` `financial_assets_notes` `insurance_notes` | 能拆的拆；不能拆的先下沉对应 `*_notes` |
| `seriousness` / “认真程度” | 改语义 | `urgency_level` | 统一收口为推进紧迫度 |
| `has_children` 布尔 | 扩展 | `has_children` + `children_count` + `children_age_notes` + `custody_status` + `financial_ties_with_ex_partner` | 原有布尔先迁高层判断，不强行补全子字段 |
| `marital_history` 自由文本 | 标准化 + 联动 | `marital_history` + `marital_history_notes` | 明确婚史枚举后，剩余描述进备注 |
| 基础信息里的吸烟/饮酒重复字段 | 去重 | `smokes` `smoking_frequency` `drinks` `drinking_frequency` | 统一迁入生活习惯区 |
| `preferred_partner_marital_history` | 统一 key | `accepts_partner_marital_history` | 旧文案退役，正式 key 固定为 `accepts_partner_marital_history` |
| `personal_assets_notes` | 下沉兼容 | `financial_assets_notes` / `insurance_notes` / `property_notes` / `vehicle_notes` | 能归类则归类，不能归类的暂留内部备注 |
| `has_vehicle + vehicle_notes` | 补结构 | `has_vehicle` + `vehicle_brand` + `vehicle_model` + `vehicle_notes` | 已有备注里若能识别品牌/型号，允许人工补迁 |
| 无法结构化的历史长文本 | 下沉备注 | 对应 `*_notes` 字段 | 原则是先保留信息，不强造结构 |

---

## 七、联动矩阵 v1

| 触发字段 | 触发条件 | 展开字段 | 隐藏后处理 | 清空规则 | 对客资料卡可见性 | AI 提取规则 |
|------|------|------|------|------|------|------|
| `education_level` | `bachelor` | `bachelor_school` | 未命中时隐藏，不自动删值 | 父字段变化时提示确认是否保留旧值 | 学校信息可进入 `P2` 资料卡摘要 | 若 transcript 明确说“硕士/博士”，允许同时补 `education_level` 与对应学校 |
| `education_level` | `master` | `bachelor_school` `master_school` | 同上 | 同上 | 同上 | 同上 |
| `education_level` | `doctor` | `bachelor_school` `master_school` `doctor_school` | 同上 | 同上 | 同上 | 同上 |
| `has_children` | `yes` | `children_count` `children_age_notes` `custody_status` `financial_ties_with_ex_partner` | 隐藏不等于删除 | 仅人工确认后可清空 | 对客默认隐藏，只能内部查看 | 明确提到孩子数量/抚养关系时才补子字段 |
| `marital_history` | `divorced` / `widowed` | `marital_history_notes` | 隐藏不删值 | 父字段变更后提示确认旧备注 | 对客默认隐藏 | 可补父字段，不可臆测备注 |
| `has_property` | `yes` | `property_count` `property_notes` | 隐藏不删值 | 父字段变更后提示确认旧值 | 对客仅展示经人工选择的摘要 | 只在明确提到置业事实时补写 |
| `has_vehicle` | `yes` | `vehicle_brand` `vehicle_model` `vehicle_notes` | 隐藏不删值 | 父字段变更后提示确认旧值 | 对客仅展示经人工选择的摘要 | 只有明确提到车型/品牌才补写 |
| `primary_intent` | `dating` | `accepts_long_distance` `preferred_date_frequency_notes` `monthly_dating_budget` `gift_preference_notes` `accepts_partner_children` | 切换到其他意图时隐藏，不自动删除 | 需人工确认是否保留旧值 | 对客默认隐藏，仅内部使用 | AI 可从子字段反推 `primary_intent = dating`，但不能自动补满同组其他字段 |
| `primary_intent` | `marriage` | `accepts_relocation` `wedding_scale_preference` `post_marriage_property_arrangement_notes` `accepts_living_with_partner_parents` | 同上 | 同上 | 对客默认隐藏，仅内部使用 | 可从“结婚意图”原话补父字段 |
| `primary_intent` | `fertility` | `preferred_children_count` `childbearing_timeline_notes` `parenting_role_preference_notes` `requires_fertility_proof` | 同上 | 同上 | 对客默认隐藏，仅内部使用 | 敏感字段如 `requires_fertility_proof` 必须明确表达才写入 |

### 7.1 联动共通规则

- 未命中条件时只隐藏，不自动清空
- `unknown` 不覆盖已确认值
- 父字段变化且子字段已有值时，系统必须提示“已有旧值，请确认是否保留”
- 手动建档、录音提取、PDF 导入必须命中同一套联动落点
- 对客资料卡默认不展示隐藏字段、待确认字段和敏感联动子字段

---

## 八、冻结评审结论 v1

### 8.1 本轮评审通过的点

- `P0-P5` 分层已固定
- `P0` 主显字段组已固定为 `full_name / display_name / gender / current_city / status`
- 学历、收入、吸烟饮酒、颜值、资产、孩子 6 组问题字段都已转成正式合同
- `primary_intent`、孩子、婚史、房产、车辆、学历 6 组联动都已转成正式矩阵
- 旧字段迁移原则已明确
- “显示文案不反向决定存储结构”的边界已明确

### 8.2 本轮评审确认的遗留边界

- `status` 的完整状态集合与迁移矩阵，仍在 `phase-1` 的状态模型冻结里继续完成
- `profile_certifications` 和完整认证体系不在本轮字段专项冻结范围内
- `profile_ai_analysis` 的完整对象定义不在本轮字段专项冻结范围内

### 8.3 本轮结论

本轮字段专项可以视为完成冻结，后续允许进入：

1. 主数据模型冻结
2. 状态模型冻结
3. schema 草案推导
4. AI 提取目标结构对齐

不允许再回到“边做页面边临时补字段”的工作方式。
