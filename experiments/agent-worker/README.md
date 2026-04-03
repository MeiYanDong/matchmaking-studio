# Agent Worker POC

这个目录是 `codex/agent-extract-poc` 分支里的本地实验场。

目标不是替换主线，而是逐步验证两件事：

```text
音频 -> COS -> Groq -> transcript -> 本地 SQLite
transcript -> Agent 分步骤处理 -> 直接更新本地数据库
```

## 设计原则

- 不依赖 Supabase
- 不依赖远程 Postgres
- 不替换现有转录链路
- 先验证 Agent 是否比“大 JSON 合同”更稳
- POC 阶段不过度限制 Agent 能力

## 目录说明

- `schema.sql`
  本地 SQLite schema
- `db.ts`
  数据库初始化、seed 和读写入口
- `tools.ts`
  Agent 可调用的本地数据库工具
- `prompt.ts`
  Agent 系统提示词和任务构造器
- `runner.ts`
  Agent 循环执行器
- `fixtures/demo-transcript.txt`
  本地回放用 transcript 样本

## 快速开始

启动本地开发服务：

```bash
npm run dev -- --hostname 127.0.0.1 --port 4011
```

打开本地音频转录页：

```text
http://127.0.0.1:4011/agent-poc/audio-transcribe
```

这条页面当前只验证最小闭环：

- 选择本地音频
- 上传到腾讯云 COS
- 生成短时效签名 URL
- 调用 Groq Whisper 转录
- 把 transcript 写进本地 SQLite
- 在页面直接显示文字稿

Agent 写库、字段提取和匹配仍然保留在下一阶段验证。

初始化本地 POC 数据库：

```bash
npm run agent:poc:init
```

运行一次 demo transcript 回放：

```bash
npm run agent:poc:demo
```

查看当前本地 POC 数据库内容：

```bash
npm run agent:poc:inspect
```

一次把初始化、回放、检查跑完：

```bash
npm run agent:poc:init && npm run agent:poc:demo && npm run agent:poc:inspect
```

## 默认数据库位置

```text
experiments/agent-worker/data/agent-poc.sqlite
```

如需覆盖，可设置：

```bash
AGENT_POC_DB_PATH=/custom/path/agent-poc.sqlite
```

## 当前工具集

- `get_profile_bundle`
- `update_profile_fields`
- `update_intention_fields`
- `update_trait_fields`
- `save_conversation_summary`
- `create_followup_tasks`
- `run_sql`
- `finish`

其中 `run_sql` 是 POC 阶段的逃生舱，方便快速验证“Agent 直接编辑数据库”这件事。正式生产化时可以去掉或改成受限工具。

## 当前验证状态

当前已经验证通过：

- Agent 可以完成 6-7 步本地工具链
- `profiles / intentions / trait_profiles / conversations / followup_tasks` 都能被写入
- `agent_runs / agent_run_events` 会记录完整过程
- `create_followup_tasks` 支持只给 `question`，标题会自动生成
