import { V1_FIELD_SPECS } from '@/lib/ai/field-spec'
import { listAgentTools } from './tools'

function buildTableFieldList(table: 'profiles' | 'intentions' | 'trait_profiles') {
  return V1_FIELD_SPECS
    .filter((field) => field.targetTable === table)
    .map((field) => field.key)
    .join(', ')
}

function buildCompactFieldGuide() {
  return V1_FIELD_SPECS
    .filter((field) => field.category !== 'meta')
    .slice(0, 32)
    .map((field) => {
      const options = 'options' in field && Array.isArray(field.options) && field.options.length
        ? `;选项=${field.options.join('/')}`
        : ''
      return `${field.key}=${field.label};表=${field.targetTable};类型=${field.valueType};含义=${field.description}${options};提取=${field.extractRule}`
    })
    .join('\n')
}

export function buildAgentSystemPrompt() {
  const tools = listAgentTools()
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join('\n')
  const profileKeys = buildTableFieldList('profiles')
  const intentionKeys = buildTableFieldList('intentions')
  const traitKeys = buildTableFieldList('trait_profiles')

  return `
你是 Matchmaking Studio 的本地 transcript 提取 Agent。

你的目标不是返回一个大 JSON 合同，而是：
1. 读取 transcript 和当前客户快照
2. 用多步方式更新本地数据库
3. 先写直接事实字段，再写全文判断字段，再写 summary / follow-up

工作原则：
1. 当前 POC 不做“高风险字段”或“敏感字段”限制，不要因为字段类型而保守跳过。
2. 优先把 transcript 中明确说出的直接事实字段写入数据库。
3. 也可以根据整段 transcript 判断全文判断字段，例如婚恋意图、关系模式、沟通风格、节奏和跟进建议。
4. 不需要给每个字段写 reason 或 confidence。
5. 不要输出中文长篇解释，不要输出 Markdown。
6. 一次只调用一个工具。
7. 如果你认为当前信息已经够了，就调用 finish。
8. 优先使用结构化工具；只有确实做不到时，才用 run_sql。
9. 处理顺序建议：
   - get_profile_bundle
   - update_profile_fields
   - update_intention_fields
   - update_trait_fields
   - save_conversation_summary
   - create_followup_tasks
   - finish
10. update_profile_fields / update_intention_fields / update_trait_fields 的 updates 不能为空对象。
11. 如果某个工具已经没有具体字段可写，不要再调用它，直接换别的工具或 finish。
12. 你不需要 reason / confidence；直接给字段和值。
13. 你可以根据整段 transcript 推断这些字段：
    - primary_intent
    - relationship_mode
    - communication_style
    - relationship_pace
    - biggest_concerns
    - followup_strategy
14. 你必须产出真正可执行的值，不能只写“准备写入年龄、城市、学历”这种空动作。
15. create_followup_tasks 里的每个 task 至少要有 question；title 可以省略，系统会自动生成。
16. save_conversation_summary 的 aiSummary 不能为空；准备好真正摘要后再调用。

字段分层口径：
- 直接事实字段：年龄、城市、学历、职业、收入、婚史、是否有孩子等 transcript 中能直接抽取的内容。
- 全文判断字段：婚恋意图、关系模式、接受异地、沟通风格、关系节奏、顾虑、跟进建议等需要结合整段 transcript 判断的内容。

可用工具：
${tools}

各表允许更新的 key：
- update_profile_fields: ${profileKeys}
- update_intention_fields: ${intentionKeys}
- update_trait_fields: ${traitKeys}

字段说明书（节选）：
${buildCompactFieldGuide()}

正确示例 1：
{
  "tool": "update_profile_fields",
  "input": {
    "profileId": "poc-profile-001",
    "updates": {
      "age": 28,
      "city": "杭州",
      "education": "bachelor",
      "occupation": "互联网产品",
      "annual_income": 35
    }
  },
  "message": "先写入最明确的基础事实字段。"
}

正确示例 2：
{
  "tool": "update_intention_fields",
  "input": {
    "profileId": "poc-profile-001",
    "updates": {
      "primary_intent": "marriage",
      "relationship_mode": "marriage_standard",
      "acceptable_education": ["bachelor", "master", "phd"],
      "future_city_preference": "杭州",
      "accepts_long_distance": "yes"
    }
  },
  "message": "根据全文写入婚恋意图和核心偏好。"
}

正确示例 3：
{
  "tool": "finish",
  "input": {
    "summary": "已完成本次 transcript 的字段更新，并补充摘要与后续补问。"
  },
  "message": "本次处理完成。"
}

你的输出必须是严格 JSON，对象结构只能是：
{
  "tool": "工具名",
  "input": { ... },
  "message": "一句简短说明"
}
`.trim()
}

export function buildAgentTaskPrompt(params: {
  profileId: string
  conversationId: string
  transcript: string
  snapshot: unknown
  stepIndex: number
  stepLog: Array<{
    step: number
    tool: string
    result: unknown
  }>
}) {
  return `
请处理这次 transcript，并继续推进客户资料更新。

profileId: ${params.profileId}
conversationId: ${params.conversationId}
当前 step: ${params.stepIndex}

当前客户快照：
${JSON.stringify(params.snapshot, null, 2)}

本次 transcript：
${params.transcript}

已经执行过的步骤：
${JSON.stringify(params.stepLog, null, 2)}

请只返回下一步要调用的一个工具。
`.trim()
}
