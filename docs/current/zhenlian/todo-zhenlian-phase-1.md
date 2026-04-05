# 甄恋 CRM 重构计划 · 第一阶段 Todo

> 状态：进行中  
> 适用范围：甄恋 CRM 当前主线第一阶段执行清单  
> 依据文档：
> - [甄恋CRM产品重构方案（聚合版）.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/甄恋CRM产品重构方案（聚合版）.md)
> - [plan-zhenlian-rebuild.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-rebuild.md)
> - [plan-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-phase-1.md)
> - [plan-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-fields-2.1-2.3.md)
> - 字段冻结正式输出 [freeze-zhenlian-fields-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md)
> - 主数据模型冻结 [freeze-zhenlian-data-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-data-model-v1.md)
> - 状态模型冻结 [freeze-zhenlian-status-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-status-model-v1.md)
> - 字段专项执行清单 [todo-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-fields-2.1-2.3.md)
> 说明：这份 `todo` 是当前主线的第一阶段执行清单；[todo.md](/Users/myandong/Projects/marry2/docs/history/v1/todo.md) 已转为 v1.0 历史参考。

---

## 0. 当前已确认基线

- [x] 甄恋重构文档体系已成为当前主线，`docs/history/v1/plan.md` / `docs/history/v1/todo.md` 已转为 v1.0 历史参考
- [x] 第一阶段优先级固定为：字段重构 -> 字段分层 -> 字段联动 -> 主数据模型冻结 -> 状态模型冻结
- [x] 第一阶段先做数据结构，不先做页面炫技
- [x] `P0` 主显字段组固定为：姓名（含昵称）/ 性别 / 所在城市 / 状态
- [x] 学历拆分原因已经固定：高净值婚恋场景真实重视院校背景
- [x] `plan-zhenlian-phase-1.md` 已补入“字段冻结说明（正式冻结口径）”
- [x] 聚合版模块一 `2.1~2.3` 已补成独立的字段重构详细需求方案
- [x] 聚合版模块一 `2.1~2.3` 已补成独立的字段专项执行清单

---

## 1. 字段冻结收口

### 1.1 正式字段字典

- [x] 先按 [todo-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-fields-2.1-2.3.md) 完成字段专项收口
- [x] 输出第一阶段正式字段字典 `v1`
- [x] 为每个字段补齐：`key / 中文名 / 所属对象 / 类型 / 单位 / 枚举值域 / 必填层级 / 联动条件 / 来源优先级 / 脱敏级别`
- [x] 将客户主档案字段与择偶要求字段整理成可直接给 schema / prompt / 前端引用的正式表格版本

### 1.2 字段分层与联动

- [x] 固定 `P0-P5` 分层，不再让低频字段抢占首屏
- [x] 固定“三层录入策略”：建档必填 / 首轮补齐 / 递进补全
- [x] 固定关键联动规则：学历 / 孩子 / 婚史 / 房产 / 车辆 / 意图
- [x] 固定字段来源优先级、展示值/存储值边界、旧字段到新字段映射原则

### 1.3 高风险字段专项冻结

- [x] `education` 正式拆分为 `education_level / bachelor_school / master_school / doctor_school`
- [x] `income` 正式收口为 `monthly_income / annual_income / income_source_type`
- [x] `appearance_score` 补齐评分锚点与参考图口径
- [x] `assets` 补齐房产 / 车辆 / 金融资产 / 备注入口的结构边界
- [x] `has_children` 相关联动字段补齐数量 / 年龄 / 抚养信息
- [x] 完成一次“字段冻结评审 v1”

---

## 2. 主数据模型冻结

### 2.1 主对象边界

- [x] 冻结 `customer_profile`：客户静态事实与高频筛选事实
- [x] 冻结 `partner_preferences`：择偶硬条件、软偏好、婚育边界
- [x] 冻结 `customer_lifecycle`：状态、负责人、下一步动作、截止时间、阻塞点
- [x] 冻结 `customer_source`：来源主渠道、来源码、获客时间、备注
- [x] 冻结 `profile_materials`：头像、生活照、补充材料
- [x] 冻结 `profile_certifications`：认证类型、认证状态、认证材料
- [x] 冻结 `profile_ai_analysis`：AI 摘要、隐性诉求、待确认字段标记

### 2.2 对象关系与更新规则

- [x] 明确哪些字段进主表，哪些字段下沉子对象 / 子表
- [x] 明确草稿值、已确认值、系统派生值之间的关系
- [x] 明确手动、录音、PDF 三个入口写入同一客户对象时的合并规则
- [x] 明确历史数据兼容策略：能结构化的结构化，不能结构化的先下沉备注
- [x] 输出第一阶段主数据模型冻结图或正式对象清单

---

## 3. 状态模型冻结

### 3.1 生命周期状态集合

- [x] 固定第一阶段状态集合：新建待完善 / 积极寻找中 / 已推介 / 约见中 / 反馈待录入 / 暂缓 / 已成功匹配 / 退档
- [x] 为每个状态补齐“含义 / 进入条件 / 退出条件 / 是否主显”
- [x] 固定旧 `status` 语义到新状态集合的映射关系

### 3.2 迁移、动作与提醒

- [x] 固定状态迁移矩阵，明确哪些状态能直接互转，哪些必须经人工确认
- [x] 固定 `next_action` 标准动作集
- [x] 固定 `owner / due_at / blocking_reason` 的字段语义
- [x] 固定系统提醒触发规则：久未推进 / 推介后未回复 / 约见前 / 见面后 / 暂缓复活
- [x] 固定状态变更日志字段：谁改的 / 从什么状态到什么状态 / 为什么改 / 何时改
- [x] 完成一次“状态模型冻结评审 v1”

---

## 4. 导入、资料与资料卡对齐

### 4.1 导入落点对齐

- [ ] 让手动建档、录音提取、PDF 导入共享同一套字段落点
- [ ] 固定“AI 草稿 -> 人工确认 -> 正式写入”的基本流转
- [ ] 预留微信截图识别入口，但不在第一阶段过度展开实现

### 4.2 资料与资料卡边界

- [ ] 固定头像 / 生活照 / 认证材料 / 其他补充材料的语义边界
- [ ] 固定内部完整版 / 对客介绍版 / 营销版的字段可见范围
- [ ] 确认资料卡只消费已冻结字段，不再反向发明字段结构

---

## 5. 进入实现前的 Gate

- [x] `plan-zhenlian-phase-1.md` 中字段冻结、主数据模型冻结、状态模型冻结三部分都达到可引用状态
- [ ] schema 草案可以直接从冻结文档推导，不再靠口头解释
- [ ] AI 提取目标结构可以直接从字段字典推导
- [ ] 页面与资料卡实现只消费冻结字段，不再反向改字段定义
- [ ] 完成一次 phase-1 评审，确认可以从“规划”进入“实现准备”

---

## 6. 当前顺序约束

- [x] 先补全字段冻结说明
- [x] 再冻结主数据模型
- [x] 再冻结状态模型
- [ ] 再拆导入、资料卡、实现准备任务
- [ ] 未完成上述冻结前，不提前跳到大规模页面实现
