# Docs Index

> 状态：当前文档导航入口  
> 适用范围：`/Users/myandong/Projects/marry2/docs`  
> 目的：明确当前主线 source of truth、历史文档、参考文档和运维文档的角色，避免继续在同一层目录里误读。

---

## 一、先看哪里

如果现在要继续推进 `marry` 当前主线，请按这个顺序阅读：

1. [甄恋 CRM 产品重构计划（当前主线）](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-rebuild.md)
2. [甄恋 CRM 重构计划 · 第一阶段 Plan](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-phase-1.md)
3. [甄恋 CRM 客户档案字段重构详细需求方案（模块一 2.1-2.3）](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-fields-2.1-2.3.md)
4. [甄恋 CRM 字段冻结包 v1](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md)
5. [甄恋 CRM 主数据模型冻结 v1](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-data-model-v1.md)
6. [甄恋 CRM 状态模型冻结 v1](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-status-model-v1.md)
7. [甄恋 CRM 客户档案字段重构执行清单（模块一 2.1-2.3 Todo）](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-fields-2.1-2.3.md)
8. [甄恋 CRM 重构计划 · 第一阶段 Todo](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-phase-1.md)

一句话：

**当前主线的 source of truth 是上面 8 份文档，不是旧的 `plan.md` / `todo.md`。**

---

## 二、当前主线文档

### 2.1 总纲

- [plan-zhenlian-rebuild.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-rebuild.md)
  - 作用：当前主线总纲
  - 回答：为什么重构、当前主线目标是什么、总的阶段结构是什么

### 2.2 第一阶段主计划

- [plan-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-phase-1.md)
  - 作用：第一阶段 plan
  - 回答：第一阶段做什么、不做什么、为什么先做这些

### 2.3 第一阶段详细需求方案

- [plan-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/plan-zhenlian-fields-2.1-2.3.md)
  - 作用：聚合版模块一 `2.1~2.3` 的详细需求方案
  - 回答：字段分层怎么定、字段问题怎么修、联动表单怎么展开

### 2.4 第一阶段执行清单

- [todo-zhenlian-phase-1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-phase-1.md)
  - 作用：第一阶段执行顺序与未完成项清单
  - 回答：下一步先做什么、什么还没冻结、进入实现前还差什么

### 2.5 字段冻结正式输出

- [freeze-zhenlian-fields-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-fields-v1.md)
  - 作用：模块一 `2.1~2.3` 的正式冻结输出
  - 回答：字段字典、枚举值表、迁移表、联动矩阵到底定成什么

### 2.6 主数据模型冻结

- [freeze-zhenlian-data-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-data-model-v1.md)
  - 作用：第一阶段主数据模型冻结输出
  - 回答：字段应该挂到哪个对象、对象之间如何关系、三入口如何合并

### 2.7 状态模型冻结

- [freeze-zhenlian-status-model-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-status-model-v1.md)
  - 作用：第一阶段生命周期状态模型冻结输出
  - 回答：客户状态到底有哪些、怎么迁移、如何提醒、怎样记日志

### 2.8 导入与资料卡冻结

- [freeze-zhenlian-import-and-cards-v1.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/freeze-zhenlian-import-and-cards-v1.md)
  - 作用：第一阶段导入落点对齐与资料卡可见范围冻结输出
  - 回答：三种导入入口如何共享字段落点、AI 草稿流转规则、材料语义边界、资料卡三版本字段范围

### 2.9 字段专项执行清单

- [todo-zhenlian-fields-2.1-2.3.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/todo-zhenlian-fields-2.1-2.3.md)
  - 作用：模块一 `2.1~2.3` 的字段专项执行拆解
  - 回答：字段分层、字段修复、字段联动应该按什么顺序真正收口

### 2.9 上游需求来源

- [甄恋CRM产品重构方案（聚合版）.md](/Users/myandong/Projects/marry2/docs/current/zhenlian/甄恋CRM产品重构方案（聚合版）.md)
  - 作用：业务需求来源文档
  - 回答：这轮重构最初想解决哪些问题、提出了哪些模块与方向

---

## 三、历史文档

这两份文档已经不是当前主线 source of truth，只保留为 v1.0 历史参考：

- [plan.md](/Users/myandong/Projects/marry2/docs/history/v1/plan.md)
- [todo.md](/Users/myandong/Projects/marry2/docs/history/v1/todo.md)

适合在这些情况下回看：

- 查旧实现为什么这么设计
- 查旧字段语义或旧枚举
- 查历史 UI / 工作流判断
- 查迁移时需要兼容的旧口径

不适合的用法：

- 不要再把它们当成当前执行入口
- 不要再按它们继续拆当前主线任务

---

## 四、参考与辅助文档

### 4.1 路线参考

- [roadmap.md](/Users/myandong/Projects/marry2/docs/reference/roadmap.md)
  - 作用：阶段路线与后置范围参考
  - 备注：不是当前主线执行清单

### 4.2 API 参考

- [API README](/Users/myandong/Projects/marry2/docs/reference/api/README.md)
- [API/yunwu_api.md](/Users/myandong/Projects/marry2/docs/reference/api/yunwu_api.md)
- [API/voice_api.md.md](/Users/myandong/Projects/marry2/docs/reference/api/voice_api.md.md)
- [API/claude_api.md.md](/Users/myandong/Projects/marry2/docs/reference/api/claude_api.md.md)
- [API/llms_tuzi.md.md](/Users/myandong/Projects/marry2/docs/reference/api/llms_tuzi.md.md)

这些文档的角色是外部接口参考，不是产品规划文档，也不是当前实现 source of truth。

如果需要判断当前真实接入链路，优先看：

- [lib/ai/client.ts](/Users/myandong/Projects/marry2/lib/ai/client.ts)
- [docs/ops/deployment.md](/Users/myandong/Projects/marry2/docs/ops/deployment.md)
- [docs/reference/api/README.md](/Users/myandong/Projects/marry2/docs/reference/api/README.md)

---

## 五、运维与环境文档

- [deployment.md](/Users/myandong/Projects/marry2/docs/ops/deployment.md)
  - 作用：部署与运行环境说明

---

## 六、当前推荐的文档使用规则

### 6.1 新增文档时先判断角色

- 如果回答“现在主线要做什么”：放当前主线文档链路
- 如果回答“旧版本当时怎么想”：放历史文档
- 如果回答“外部接口怎么用”：放 `reference/api/`
- 如果回答“怎么部署或运行”：放运维文档

### 6.2 当前主线文档的推荐分工

- `plan-zhenlian-rebuild.md`：总纲
- `plan-zhenlian-phase-1.md`：阶段 plan
- `plan-zhenlian-fields-2.1-2.3.md`：详细需求方案
- `freeze-zhenlian-fields-v1.md`：字段冻结正式输出
- `freeze-zhenlian-data-model-v1.md`：主数据模型冻结
- `freeze-zhenlian-status-model-v1.md`：状态模型冻结
- `todo-zhenlian-fields-2.1-2.3.md`：字段专项执行清单
- `todo-zhenlian-phase-1.md`：执行清单

不要再把四种角色混写到一份文档里。

### 6.3 当前目录结构

第二轮目录整理已经完成，当前结构如下：

1. `current/zhenlian/`：当前主线文档
2. `history/v1/`：v1.0 历史文档
3. `reference/api/`：接口参考
4. `ops/`：部署与运维说明

后续如果继续整理，重点应该放在补齐索引、减少重复说明，而不是再次频繁搬路径。

---

## 七、工作区边界提醒

- `/Users/myandong/Projects/marry2/experiments/` 不属于当前主线文档体系
- 不要把 `experiments/` 当成正式规划、正式交付或 source of truth
