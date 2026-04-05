# API Vendor References

> 状态：外部供应商 / 聚合网关参考
> 适用范围：`/Users/myandong/Projects/marry2/docs/reference/api`
> 结论：这里的文档用于查第三方接口和兼容网关资料，不是 `marry` 当前实现的 source of truth。

---

## 当前应该信什么

如果 API 参考文档与项目代码、部署文档出现冲突，默认以这两处为准：

1. [/Users/myandong/Projects/marry2/lib/ai/client.ts](/Users/myandong/Projects/marry2/lib/ai/client.ts)
2. [/Users/myandong/Projects/marry2/docs/ops/deployment.md](/Users/myandong/Projects/marry2/docs/ops/deployment.md)

原因很简单：

- 代码定义了当前真实的 provider 选择、兜底顺序和环境变量读取逻辑
- 部署文档定义了当前环境应该如何配置
- 这里的 API 文档更多是供应商材料备份、兼容协议参考和历史接入痕迹

---

## 当前实际接入链路

### Whisper / Speech-to-Text

- 主链路：`Groq`
  - 关键变量：`GROQ_API_KEY`
  - 模型默认值：`whisper-large-v3-turbo`
- 兼容网关兜底：`云雾 / 兔子`
  - 关键变量：`marry_whisper_YUNWU_API_KEY` 或 `API_KEY`
  - 兼容模型口径通常仍表现为 `whisper-1`

### Claude / 结构化提取

- 主链路：`OpenRouter`
  - 关键变量：`OPENROUTER_API_KEY`
  - 默认模型：`anthropic/claude-sonnet-4.6`
- 兼容网关兜底：`云雾 / 兔子`
  - 关键变量：`marry_claude_YUNWU_API_KEY` 或 `API_KEY`
- 最终官方兜底：`Anthropic`
  - 关键变量：`ANTHROPIC_API_KEY`

---

## 这些文档各自是什么

- [yunwu_api.md](/Users/myandong/Projects/marry2/docs/reference/api/yunwu_api.md)
  - 云雾聚合网关资料汇总
- [voice_api.md.md](/Users/myandong/Projects/marry2/docs/reference/api/voice_api.md.md)
  - OpenAI 兼容音频转写接口的历史 / 兼容参考
- [claude_api.md.md](/Users/myandong/Projects/marry2/docs/reference/api/claude_api.md.md)
  - Anthropic 兼容聊天接口的历史 / 兼容参考
- [llms_tuzi.md.md](/Users/myandong/Projects/marry2/docs/reference/api/llms_tuzi.md.md)
  - `api.tu-zi.com` 聚合平台资料汇总

---

## 使用规则

- 要判断“现在系统到底怎么接”：先看代码和部署文档
- 要查“某个网关兼容什么参数 / 路径 / 文档入口”：再看这里
- 不要把这里的接口样例直接当成当前业务协议
- 不要把这里的模型可用性描述直接当成当前主链路事实
