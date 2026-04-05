# 甄恋 CRM 字段重构执行清单（模块一 2.1-2.3 Todo）

> 状态：进行中  
> 适用范围：甄恋 CRM 当前主线，模块一 `2.1 字段优先级重排`、`2.2 字段问题修复`、`2.3 动态联动表单逻辑` 的执行拆解  
> 依据文档：
> - [甄恋CRM产品重构方案（聚合版）.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/甄恋CRM产品重构方案（聚合版）.md)
> - [plan-zhenlian-rebuild.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-rebuild.md)
> - [plan-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-phase-1.md)
> - [plan-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-fields-2.1-2.3.md)
> - 正式冻结输出 [freeze-zhenlian-fields-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md)
> - 上层阶段清单 [todo-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-phase-1.md)
> 说明：这份 `todo` 只负责把字段专项方案压成执行顺序，不代替第一阶段总 `todo`。

---

## 0. 当前已确认基线

- [x] 当前主线已经切换为甄恋 CRM 重构文档体系
- [x] 第一阶段优先级固定为：字段重构 -> 字段分层 -> 字段联动 -> 主数据模型冻结 -> 状态模型冻结
- [x] 当前已完成模块一 `2.1~2.3` 的详细需求方案
- [x] `P0` 主显字段组固定为：姓名（含昵称）/ 性别 / 所在城市 / 状态
- [x] 字段设计遵循“按业务决策价值重构”，不是一律深拆
- [x] 当前阶段先冻结字段合同，不先跳页面实现

---

## 1. 2.1 字段优先级重排

### 1.1 `P0-P5` 分层冻结

- [x] 产出客户主档案字段 `P0-P5` 正式分层表
- [x] 产出择偶要求字段 `P0-P5` 正式分层表
- [x] 保证每个正式字段只有一个主分层，不再跨层重复归属
- [x] 固定 `P0` 正式字段 key：`full_name / display_name / gender / current_city / status`
- [x] 明确 `status` 虽然主显，但对象归属仍属于生命周期对象
- [x] 明确 `hukou_city / native_place` 从 `P0` 下沉，不再与 `current_city` 抢主显

### 1.2 不同界面的显示合同

- [x] 固定客户列表必须出现的字段层级：`P0 + 少量 P1`
- [x] 固定客户详情首屏必须出现的字段层级：完整 `P0 + 核心 P1`
- [x] 固定手动建档第一屏只出现建档必填字段和 `P0/P1` 主骨架
- [x] 固定对客资料卡默认只消费 `P0/P1/P2` 的脱敏结果
- [x] 固定内部完整版资料卡可消费 `P0-P5`，但必须区分 AI 字段和人工确认字段
- [x] 固定筛选面板以 `P1/P2/P3` 为主，不再把低权重字段放到高优先级筛选位

### 1.3 录入策略与兼容策略

- [x] 为每个正式字段标注录入层级：建档必填 / 首轮补齐 / 递进补全
- [x] 为每个正式字段标注展示值 / 存储值边界
- [x] 为每个正式字段标注来源优先级：手填 / 录音 / PDF / AI 派生
- [x] 输出旧字段到新字段的映射表 `v1`
- [x] 标出需要合并、下沉备注、停止继续使用的旧字段
- [x] 完成一次“字段分层与显示合同评审 v1”

---

## 2. 2.2 字段问题修复

### 2.1 学历字段

- [x] 冻结 `education_level / bachelor_school / master_school / doctor_school`
- [x] 冻结 `education_level` 枚举值
- [x] 冻结学历联动展开规则
- [x] 冻结学历字段的历史迁移规则
- [x] 明确第一阶段不继续拆院系、国家、排名

### 2.2 收入字段

- [x] 冻结 `monthly_income / annual_income / income_source_type`
- [x] 冻结 `income_source_type` 枚举值
- [x] 冻结“月收入为源、年收入为派生”的默认规则
- [x] 明确只有年收入时的人工回填规则
- [x] 冻结收入字段历史迁移规则

### 2.3 吸烟 / 饮酒字段

- [x] 冻结 `smokes / smoking_frequency / drinks / drinking_frequency`
- [x] 冻结 yes/no/unknown 与频率枚举值
- [x] 明确基础信息区不再重复出现吸烟饮酒字段
- [x] 明确历史只有 yes/no 的数据不强行推断频率

### 2.4 颜值评分字段

- [x] 冻结 `appearance_score`
- [x] 冻结分值范围、步长、精度
- [x] 补齐评分锚点口径说明
- [x] 明确“参考图是系统资源，不是客户资料字段”
- [x] 明确对客资料卡默认不直接展示具体分数

### 2.5 房产 / 车辆 / 资产字段

- [x] 冻结 `has_property / property_count / property_notes`
- [x] 冻结 `has_vehicle / vehicle_brand / vehicle_model / vehicle_notes`
- [x] 冻结 `family_asset_band / financial_assets_notes / insurance_notes`
- [x] 冻结 `family_asset_band` 枚举值
- [x] 明确房产、车辆、金融资产、保险资产四类边界
- [x] 明确第一阶段先文本承接金融资产和保险资产说明

### 2.6 迫切程度字段

- [x] 冻结 `urgency_level`
- [x] 冻结枚举值与前端展示文案
- [x] 明确它替代旧“认真程度”的语义边界

### 2.7 孩子字段

- [x] 冻结 `has_children / children_count / children_age_notes / custody_status / financial_ties_with_ex_partner`
- [x] 冻结 `has_children / custody_status / financial_ties_with_ex_partner` 枚举值
- [x] 明确 `has_children = yes` 后的补齐优先级提升规则
- [x] 明确“有孩子”不等于直接排除匹配

### 2.8 本段输出物

- [x] 输出字段字典 `v1`
- [x] 输出枚举值表 `v1`
- [x] 输出字段迁移表 `v1`
- [x] 完成一次“字段问题修复评审 v1”

---

## 3. 2.3 动态联动表单逻辑

### 3.1 联动总规则

- [x] 冻结联动触发字段总表
- [x] 冻结“命中展开 / 未命中隐藏”的规则
- [x] 冻结“隐藏不等于删除”的保存规则
- [x] 冻结父字段变更后对子字段旧值的保留提示规则
- [x] 冻结 AI 提取时“可补父字段、不可凭空补满子字段”的规则
- [x] 明确 `unknown` 不覆盖已确认值

### 3.2 `primary_intent` 联动组

- [x] 冻结 `primary_intent` key、展示名与枚举值
- [x] 冻结 `dating` 联动字段组
- [x] 冻结 `marriage` 联动字段组
- [x] 冻结 `fertility` 联动字段组
- [x] 明确第一阶段不做多主意图多选

### 3.3 其他联动组

- [x] 冻结“有孩子”联动组
- [x] 冻结婚史联动组
- [x] 冻结房产联动组
- [x] 冻结车辆联动组
- [x] 冻结学历联动组

### 3.4 跨入口一致性

- [x] 保证手动建档、录音提取、PDF 导入命中同一套联动字段落点
- [x] 保证联动子字段在资料卡中的可见范围一致
- [x] 保证 AI 提取结构与手动表单结构一致
- [x] 输出联动矩阵 `v1`：触发字段 / 条件 / 展开字段 / 隐藏规则 / 清空规则 / 资料卡可见性
- [x] 完成一次“联动逻辑评审 v1”

---

## 4. 本专项的完成标准

- [x] `2.1~2.3` 涉及的关键字段全部有正式 `key / 类型 / 枚举 / 必填层级 / 触发条件 / 迁移规则`
- [x] 字段字典 `v1` 可直接供 schema、AI 提取、手动建档、PDF 导入、资料卡引用
- [x] 不再存在“同一业务语义两个落点”或“同一字段承载两个语义”的情况
- [x] 不再存在“联动大概这样做”的口头规则，全部转成正式矩阵
- [x] 完成本专项后，`phase-1` 可以继续推进主数据模型冻结

---

## 5. 当前顺序约束

- [x] 先写详细需求方案
- [x] 再写字段专项 todo
- [x] 再输出字段字典 / 枚举值表 / 联动矩阵
- [x] 本专项完成后，下一步入口切到主数据模型冻结
- [x] 未完成字段冻结前，不提前跳到大规模页面实现
