import { z } from 'zod'
import { Json } from '@/types/database'
import {
  V1_FIELD_SPEC_BY_KEY,
  V1_FIELD_SPECS,
  V1_SUMMARY_FIELD_KEYS,
  type V1FieldKey,
} from '@/lib/ai/field-spec'
import {
  buildDisplayFollowupQuestions,
  classifyFollowupQuestion,
  MANUAL_ONLY_V1_FOLLOWUP_FIELD_KEYS,
} from '@/lib/followup/presentation'

export type ExtractionConfidence = 'high' | 'medium' | 'low'
export type ExtractionAction = 'set' | 'append_unique' | 'replace' | 'no_change' | 'review'
export type ReviewIssueType =
  | 'value_conflict'
  | 'identity_conflict'
  | 'low_confidence'
  | 'speaker_uncertain'
  | 'ambiguous_statement'

function isFieldKey(value: string): value is V1FieldKey {
  return value in V1_FIELD_SPEC_BY_KEY
}

const SYSTEM_REVIEW_FIELD_KEYS = new Set(['profile_gender'])
const SUMMARY_FIELD_KEY_SET = new Set<string>(V1_SUMMARY_FIELD_KEYS)

function normalizeFieldIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, '')
    .replace(/[：:;；,，。.!！?？()[\]{}]/g, '')
    .replace(/[\s_-]+/g, '')
}

const MANUAL_FIELD_ALIASES: Record<string, V1FieldKey> = {
  城市: 'city',
  常住城市: 'current_base_cities',
  常驻地: 'current_base_cities',
  收入: 'annual_income',
  年收入情况: 'annual_income',
  资产: 'assets',
  有无孩子: 'has_children',
  孩子: 'children_notes',
  宏观目标: 'primary_intent',
  关系模式: 'relationship_mode',
  接受标准婚恋: 'accepts_mode_marriage_standard',
  接受恋爱且带经济安排: 'accepts_mode_compensated_dating',
  接受生育资产安排型: 'accepts_mode_fertility_asset_arrangement',
  最小年龄: 'preferred_age_min',
  最大年龄: 'preferred_age_max',
  接受城市: 'preferred_cities',
  接受异地: 'accepts_long_distance',
  愿意迁居: 'relocation_willingness',
  接受学历: 'preferred_education',
  收入要求: 'preferred_income_min',
  接受对方婚史: 'accepts_partner_marital_history',
  接受对方有孩子: 'accepts_partner_children',
  不能接受的条件: 'dealbreakers',
  情绪稳定性: 'emotional_stability',
  顾虑: 'biggest_concerns',
  跟进建议: 'followup_strategy',
  综合描述: 'ai_summary',
}

const FIELD_ALIAS_TO_KEY = (() => {
  const entries = new Map<string, V1FieldKey>()

  for (const field of V1_FIELD_SPECS) {
    const candidates = new Set<string>([
      field.key,
      field.label,
      field.label.replace(/^男方/, ''),
      field.label.replace(/^女方是否/, ''),
      field.label.replace(/^是否/, ''),
      field.label.replace(/^当前/, ''),
      field.label.replace(/^AI /, ''),
    ])

    for (const candidate of candidates) {
      const normalized = normalizeFieldIdentifier(candidate)
      if (normalized) {
        entries.set(normalized, field.key)
      }
    }
  }

  for (const [alias, key] of Object.entries(MANUAL_FIELD_ALIASES)) {
    entries.set(normalizeFieldIdentifier(alias), key)
  }

  return entries
})()

function normalizeReviewIssueType(
  value: unknown,
  fieldKey: string
): ReviewIssueType {
  const normalized = normalizeFieldIdentifier(String(value ?? ''))

  const aliasMap: Record<string, ReviewIssueType> = {
    valueconflict: 'value_conflict',
    modechange: 'value_conflict',
    potentialmodechange: 'value_conflict',
    intentchange: 'value_conflict',
    relationshipmodechange: 'value_conflict',
    identityconflict: 'identity_conflict',
    identitymismatch: 'identity_conflict',
    genderconflict: 'identity_conflict',
    lowconfidence: 'low_confidence',
    confidenceissue: 'low_confidence',
    speakeruncertain: 'speaker_uncertain',
    speakerunknown: 'speaker_uncertain',
    speakerconflict: 'speaker_uncertain',
    ambiguous: 'ambiguous_statement',
    ambiguousstatement: 'ambiguous_statement',
  }

  if (normalized && aliasMap[normalized]) {
    return aliasMap[normalized]
  }

  return fieldKey === 'profile_gender' ? 'identity_conflict' : 'ambiguous_statement'
}

function normalizeConfidence(value: unknown): ExtractionConfidence {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0.85) return 'high'
    if (value >= 0.55) return 'medium'
    return 'low'
  }

  const raw = String(value ?? '').trim()
  if (!raw) return 'medium'

  const normalized = normalizeFieldIdentifier(raw)

  if (normalized === 'high' || normalized === '高' || normalized === 'highconfidence') {
    return 'high'
  }

  if (normalized === 'medium' || normalized === '中' || normalized === 'mediumconfidence') {
    return 'medium'
  }

  if (normalized === 'low' || normalized === '低' || normalized === 'lowconfidence') {
    return 'low'
  }

  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    return normalizeConfidence(numeric)
  }

  return 'medium'
}

function resolveFieldKey(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (isFieldKey(raw)) return raw

  const direct = FIELD_ALIAS_TO_KEY.get(normalizeFieldIdentifier(raw))
  if (direct) return direct

  const splitCandidates = raw
    .split(/[=＝>|｜|]/)
    .map((item) => item.trim())
    .filter(Boolean)

  for (const candidate of splitCandidates) {
    if (isFieldKey(candidate)) return candidate
    const resolved = FIELD_ALIAS_TO_KEY.get(normalizeFieldIdentifier(candidate))
    if (resolved) return resolved
  }

  return raw
}

const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

const confidenceSchema = z.enum(['high', 'medium', 'low'])
const actionSchema = z.enum(['set', 'append_unique', 'replace', 'no_change', 'review'])
const reviewIssueTypeSchema = z.enum([
  'value_conflict',
  'identity_conflict',
  'low_confidence',
  'speaker_uncertain',
  'ambiguous_statement',
])

const fieldKeySchema = z.string().min(1, 'field key is required')

const fieldUpdateSchema = z.object({
  field_key: fieldKeySchema,
  field_label: z.string().optional(),
  action: actionSchema,
  new_value: jsonValueSchema.optional(),
  old_value: jsonValueSchema.optional(),
  confidence: confidenceSchema,
  evidence_excerpt: z.string().optional(),
  reason: z.string().optional(),
  auto_apply: z.boolean().optional(),
})

const reviewRequiredSchema = z.object({
  field_key: z.string(),
  field_label: z.string().optional(),
  issue_type: reviewIssueTypeSchema,
  old_value: jsonValueSchema.optional(),
  candidate_value: jsonValueSchema.optional(),
  confidence: confidenceSchema.default('medium'),
  evidence_excerpt: z.string().optional(),
  reason: z.string().optional(),
})

const summaryUpdatesSchema = z.record(z.string(), jsonValueSchema).optional()

const extractionContractSchema = z.object({
  field_updates: z.array(fieldUpdateSchema).default([]),
  review_required: z.array(reviewRequiredSchema).default([]),
  missing_critical_fields: z.array(z.string()).default([]),
  suggested_followup_questions: z.array(z.string()).default([]),
  summary_updates: summaryUpdatesSchema.default({}),
  processing_notes: z.array(z.string()).default([]),
})

export type FieldUpdate = z.infer<typeof fieldUpdateSchema>
export type ReviewRequiredItem = z.infer<typeof reviewRequiredSchema>
export type ExtractionContract = z.infer<typeof extractionContractSchema>

function withResolvedFieldLabel<T extends { field_key: string; field_label?: string }>(item: T) {
  return {
    ...item,
    field_label: isFieldKey(item.field_key)
      ? V1_FIELD_SPEC_BY_KEY[item.field_key].label
      : (item.field_label?.trim() || item.field_key),
  }
}

function normalizeFieldUpdateItem(item: Record<string, unknown>) {
  const fieldKey = resolveFieldKey(item.field_key ?? item.key ?? item.field ?? item.label)

  return {
    field_key: fieldKey,
    field_label: item.field_label ?? item.label,
    action: item.action ?? 'set',
    new_value: item.new_value ?? item.value,
    old_value: item.old_value,
    confidence: normalizeConfidence(item.confidence),
    evidence_excerpt: item.evidence_excerpt ?? item.source,
    reason: item.reason,
    auto_apply: item.auto_apply,
  }
}

function normalizeReviewRequiredItem(item: Record<string, unknown>) {
  const fieldKey = resolveFieldKey(item.field_key ?? item.key ?? item.field ?? item.label)
  const issueType = normalizeReviewIssueType(item.issue_type, fieldKey)

  return {
    field_key: fieldKey,
    field_label: item.field_label ?? item.label,
    issue_type: issueType,
    old_value: item.old_value,
    candidate_value: item.candidate_value ?? item.candidate_values,
    confidence: normalizeConfidence(item.confidence),
    evidence_excerpt: item.evidence_excerpt ?? item.source,
    reason: item.reason,
  }
}

function normalizeFieldRefItem(item: unknown) {
  if (typeof item === 'string') return resolveFieldKey(item)
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ''

  const record = item as Record<string, unknown>
  return resolveFieldKey(record.field_key ?? record.key ?? record.field ?? record.label)
}

function normalizeQuestionItem(item: unknown) {
  if (typeof item === 'string') return item.trim()
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ''

  const record = item as Record<string, unknown>
  return String(record.question ?? record.text ?? record.label ?? '').trim()
}

function normalizeRawExtractionContract(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw
  }

  const data = raw as Record<string, unknown>

  return {
    field_updates: Array.isArray(data.field_updates)
      ? data.field_updates.map((item) =>
          normalizeFieldUpdateItem(item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {})
        )
      : [],
    review_required: Array.isArray(data.review_required)
      ? data.review_required.map((item) =>
          normalizeReviewRequiredItem(item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {})
        )
      : [],
    missing_critical_fields: Array.isArray(data.missing_critical_fields)
      ? data.missing_critical_fields.map(normalizeFieldRefItem)
      : [],
    suggested_followup_questions: Array.isArray(data.suggested_followup_questions)
      ? data.suggested_followup_questions.map(normalizeQuestionItem)
      : [],
    summary_updates: data.summary_updates ?? {},
    processing_notes: Array.isArray(data.processing_notes) ? data.processing_notes : [],
  }
}

export function parseExtractionContract(raw: unknown): ExtractionContract {
  const parsed = extractionContractSchema.parse(normalizeRawExtractionContract(raw))
  const unknownFieldUpdates = parsed.field_updates
    .map((item) => item.field_key)
    .filter((fieldKey) => !isFieldKey(fieldKey))
  const unknownReviewFields = parsed.review_required
    .map((item) => item.field_key)
    .filter((fieldKey) => fieldKey && !isFieldKey(fieldKey) && !SYSTEM_REVIEW_FIELD_KEYS.has(fieldKey))
  const unknownMissingFields = parsed.missing_critical_fields
    .filter((fieldKey) => fieldKey && !isFieldKey(fieldKey))
  const unknownSummaryFields: string[] = []

  const normalizedSummaryUpdates = Object.entries(parsed.summary_updates ?? {}).reduce<Record<string, Json>>(
    (acc, [fieldKey, value]) => {
      const resolvedFieldKey = resolveFieldKey(fieldKey)

      if (isFieldKey(resolvedFieldKey) && SUMMARY_FIELD_KEY_SET.has(resolvedFieldKey)) {
        acc[resolvedFieldKey] = value
        return acc
      }

      if (fieldKey.trim()) {
        unknownSummaryFields.push(fieldKey.trim())
      }

      return acc
    },
    {}
  )

  const processingNotes = [...parsed.processing_notes]
  if (unknownFieldUpdates.length > 0) {
    processingNotes.push(`已忽略无法识别的字段: ${Array.from(new Set(unknownFieldUpdates)).join('、')}`)
  }

  if (unknownReviewFields.length > 0) {
    processingNotes.push(`已忽略无法识别的异常字段: ${Array.from(new Set(unknownReviewFields)).join('、')}`)
  }

  if (unknownMissingFields.length > 0) {
    processingNotes.push(`已忽略无法识别的缺失字段: ${Array.from(new Set(unknownMissingFields)).join('、')}`)
  }

  if (unknownSummaryFields.length > 0) {
    processingNotes.push(`已忽略不受支持的总结字段: ${Array.from(new Set(unknownSummaryFields)).join('、')}`)
  }

  const normalizedMissingCriticalFields = Array.from(
    new Set(
      parsed.missing_critical_fields
        .filter((fieldKey): fieldKey is V1FieldKey => isFieldKey(fieldKey))
        .filter((fieldKey) => !MANUAL_ONLY_V1_FOLLOWUP_FIELD_KEYS.has(fieldKey))
    )
  )

  const deferredMissingFields = Array.from(
    new Set(
      parsed.missing_critical_fields
        .filter((fieldKey): fieldKey is V1FieldKey => isFieldKey(fieldKey))
        .filter((fieldKey) => MANUAL_ONLY_V1_FOLLOWUP_FIELD_KEYS.has(fieldKey))
    )
  )

  if (deferredMissingFields.length > 0) {
    processingNotes.push(`V1 默认不追问的特殊模式字段已后置: ${deferredMissingFields.join('、')}`)
  }

  const normalizedSuggestedQuestions = parsed.suggested_followup_questions
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((question) => {
      const matchedFieldKey = classifyFollowupQuestion(question)
      return !matchedFieldKey || !MANUAL_ONLY_V1_FOLLOWUP_FIELD_KEYS.has(matchedFieldKey)
    })

  return {
    field_updates: parsed.field_updates
      .filter((item): item is typeof item & { field_key: V1FieldKey } => isFieldKey(item.field_key))
      .map((item) => withResolvedFieldLabel(item)),
    review_required: parsed.review_required
      .filter((item) => isFieldKey(item.field_key) || SYSTEM_REVIEW_FIELD_KEYS.has(item.field_key))
      .map((item) => withResolvedFieldLabel(item)),
    missing_critical_fields: normalizedMissingCriticalFields,
    suggested_followup_questions: buildDisplayFollowupQuestions(
      normalizedMissingCriticalFields,
      normalizedSuggestedQuestions
    ),
    summary_updates: normalizedSummaryUpdates,
    processing_notes: Array.from(new Set(processingNotes.map((item) => item.trim()).filter(Boolean))),
  }
}

export function tryParseExtractionContract(raw: unknown) {
  try {
    return {
      success: true as const,
      data: parseExtractionContract(raw),
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'invalid extraction contract',
    }
  }
}
