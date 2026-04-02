import { V1_FIELD_SPECS, V1_SUMMARY_FIELD_KEYS } from '@/lib/ai/field-spec'

type BuildExtractPromptInput = {
  transcript: string
  currentSnapshot: Record<string, unknown>
  systemContext: Record<string, unknown>
  transcriptVerboseJson?: unknown
}

export const EXTRACT_PROFILE_SYSTEM_PROMPT = `你是婚恋字段提取与增量更新引擎。

你的唯一目标，是把一段新的红娘-客户对话转录稿，转成“可安全自动入库的增量 patch”。

规则：
1. 只提取客户明确表达的信息，不要猜测，不要脑补。
2. 红娘的提问不是客户事实。
3. 没提到的字段不要输出新值，也不要清空旧值。
4. 新的模糊信息不能覆盖旧的明确值。
5. 敏感字段只能写 yes / no / unknown，且只有客户明确表态时才能写 yes/no。
6. unknown 不等于 no。
7. 冲突、低置信度、身份不清、证据不足写入 review_required。
8. V1 不要把 MBTI、INTP、Big Five、Attachment、HEXACO 当作核心字段自动写入。
9. 情绪稳定字段仅允许：稳定 / 一般 / 敏感 / unknown。
10. 输出必须是严格 JSON，不要 Markdown，不要解释。
11. field_updates、review_required、missing_critical_fields、summary_updates 中的字段名必须使用精确英文 field_key，不要输出中文字段名。
12. review_required 里只要 AI 能给出候选值，就必须填写 candidate_value；不要用 null、空字符串、空数组当占位。

输出合同：
{
  "field_updates": [],
  "review_required": [],
  "missing_critical_fields": [],
  "suggested_followup_questions": [],
  "summary_updates": {},
  "processing_notes": []
}

field_updates 只包含本次音频里明确提到、且有机会自动写入的字段。
review_required 只包含需要红娘处理的冲突、低置信度或敏感异常字段。
review_required 每项至少包含：
- field_key
- issue_type
- confidence
- reason
若 AI 能给出候选值，必须带 candidate_value。
只有纯身份归属/说话人不清的问题，才允许省略 candidate_value。
missing_critical_fields 应优先覆盖：
- 男方关系模式
- 女方是否接受恋爱且带经济安排
- 女方是否接受生育资产安排型
- 婚史
- 是否有孩子
- 是否接受对方有孩子
- 生育意愿

suggested_followup_questions 要求：
- 一问一事
- 口语化
- 红娘可以直接线下复述
- 优先覆盖 missing_critical_fields

summary_updates 只允许这些 key：
${V1_SUMMARY_FIELD_KEYS.join(', ')}
`

const COMPACT_FIELD_GUIDE = V1_FIELD_SPECS.map((field) => {
  const options = 'options' in field && field.options?.length
    ? `;选项=${field.options.join('/')}`
    : ''
  const importance = 'importanceEligible' in field && field.importanceEligible
    ? ';支持偏好权重'
    : ''
  return `${field.key}=${field.label};类型=${field.valueType}${options};含义=${field.description};提取=${field.extractRule}${importance}`
}).join('\n')

function compactString(value: string, maxLength = 160) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function compactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized || normalized === 'unknown') return undefined
    return compactString(normalized)
  }

  if (Array.isArray(value)) {
    const compacted = value
      .map((item) => compactUnknown(item))
      .filter((item) => item !== undefined)
      .slice(0, 8)
    return compacted.length ? compacted : undefined
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, compactUnknown(entry)] as const)
      .filter(([, entry]) => entry !== undefined)

    return entries.length ? Object.fromEntries(entries) : undefined
  }

  return value
}

function compactSnapshot(snapshot: Record<string, unknown>) {
  return compactUnknown(snapshot) ?? {}
}

function compactSystemContext(systemContext: Record<string, unknown>) {
  const picked = {
    profile_id: systemContext.profile_id,
    profile_gender: systemContext.profile_gender,
    conversation_id: systemContext.conversation_id,
    uploaded_at: systemContext.uploaded_at,
    audio_duration: systemContext.audio_duration,
  }

  return compactUnknown(picked) ?? {}
}

function compactTranscriptVerboseJson(transcriptVerboseJson: unknown) {
  if (!transcriptVerboseJson || typeof transcriptVerboseJson !== 'object') {
    return null
  }

  const data = transcriptVerboseJson as {
    language?: unknown
    duration?: unknown
    segments?: Array<{ start?: unknown; end?: unknown }>
  }

  return compactUnknown({
    language: typeof data.language === 'string' ? data.language : undefined,
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    segment_count: Array.isArray(data.segments) ? data.segments.length : undefined,
    first_segment_window: Array.isArray(data.segments) && data.segments.length
      ? {
          start: data.segments[0]?.start,
          end: data.segments[0]?.end,
        }
      : undefined,
    last_segment_window: Array.isArray(data.segments) && data.segments.length
      ? {
          start: data.segments[data.segments.length - 1]?.start,
          end: data.segments[data.segments.length - 1]?.end,
        }
      : undefined,
  })
}

export function buildExtractPrompt({
  transcript,
  currentSnapshot,
  systemContext,
  transcriptVerboseJson,
}: BuildExtractPromptInput): string {
  const compactedSystemContext = compactSystemContext(systemContext)
  const compactedSnapshot = compactSnapshot(currentSnapshot)
  const compactedVerboseTranscript = compactTranscriptVerboseJson(transcriptVerboseJson)

  return [
    '以下是本次提取任务的精简输入，请基于这些输入输出严格 JSON。',
    '',
    '# 系统上下文（仅保留提取需要的信息）',
    JSON.stringify(compactedSystemContext),
    '',
    '# 当前客户快照（仅保留已知字段）',
    JSON.stringify(compactedSnapshot),
    '',
    '# 字段说明书（紧凑版）',
    COMPACT_FIELD_GUIDE,
    '',
    '# 本次转录稿',
    transcript.trim(),
    '',
    '# 详细转录元信息（压缩版）',
    JSON.stringify(compactedVerboseTranscript),
    '',
    '# 输出要求',
    '请根据系统提示词，输出严格 JSON。',
    '如果某个字段本次没有明确提到，就不要出现在 field_updates 里。',
    '如果是总结字段，可以写入 summary_updates。',
    '除 review_required、missing_critical_fields、suggested_followup_questions 外，其余内容请尽量简洁。',
  ].join('\n')
}
