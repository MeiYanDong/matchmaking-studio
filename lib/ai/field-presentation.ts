import {
  EDUCATION_LABELS,
  IMPORTANCE_LEVEL_LABELS,
  INTENT_LABELS,
  RELATIONSHIP_MODE_LABELS,
  TRI_STATE_LABELS,
} from '@/types/app'
import {
  type EducationLevel,
  type ImportanceLevel,
  type Json,
  type PrimaryIntent,
  type RelationshipMode,
  type TriState,
} from '@/types/database'
import {
  EDUCATION_VALUES,
  IMPORTANCE_LEVEL_VALUES,
  PRIMARY_INTENT_VALUES,
  RELATIONSHIP_MODE_VALUES,
  TRI_STATE_VALUES,
  V1_FIELD_SPECS,
  V1_FIELD_SPEC_BY_KEY,
  type V1FieldKey,
} from '@/lib/ai/field-spec'

const SYSTEM_FIELD_LABELS: Record<string, string> = {
  profile_gender: '客户归属',
  field_updates: '自动写入字段',
  review_required: '待确认异常',
  missing_critical_fields: '关键缺口',
  suggested_followup_questions: '补问建议',
}

const BOOLEAN_LABELS = {
  true: '是',
  false: '否',
} as const

const EMOTIONAL_STABILITY_LABELS: Record<string, string> = {
  稳定: '稳定',
  一般: '一般',
  敏感: '敏感',
  unknown: '未确认',
}

const COMMON_IMPORTANCE_KEYS = [
  'age',
  'current_city',
  'education_level_v2',
  'preferred_education',
  'preferred_income_min',
  'monthly_income',
  'accepts_long_distance',
  'relationship_mode',
] as const satisfies readonly V1FieldKey[]

const HUMAN_REPLACEMENTS = [
  ...Object.entries(SYSTEM_FIELD_LABELS),
  ...V1_FIELD_SPECS.map((field) => [field.key, field.label] as const),
  ...EDUCATION_VALUES.map((value) => [value, EDUCATION_LABELS[value]] as const),
  ...PRIMARY_INTENT_VALUES.map((value) => [value, INTENT_LABELS[value]] as const),
  ...RELATIONSHIP_MODE_VALUES.map((value) => [value, RELATIONSHIP_MODE_LABELS[value]] as const),
  ...TRI_STATE_VALUES.map((value) => [value, TRI_STATE_LABELS[value]] as const),
  ...IMPORTANCE_LEVEL_VALUES.map((value) => [value, IMPORTANCE_LEVEL_LABELS[value]] as const),
]
  .sort((a, b) => b[0].length - a[0].length)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PLACEHOLDER_CANDIDATE_PATTERNS = [
  /需(?:要)?(?:继续)?(?:线下)?(?:询问|确认|补问)/,
  /请(?:继续)?(?:线下)?(?:询问|确认|补问)/,
  /待(?:补问|确认)/,
  /先(?:补问|确认)/,
  /还没给出具体/,
  /月度或年度预算范围/,
]

const FIELD_KEY_BY_TOKEN = new Map<string, V1FieldKey>(
  V1_FIELD_SPECS.map((field) => [normalizeToken(field.key), field.key as V1FieldKey])
)

for (const field of V1_FIELD_SPECS) {
  FIELD_KEY_BY_TOKEN.set(normalizeToken(field.label), field.key as V1FieldKey)
}

const EDUCATION_VALUE_BY_TOKEN = new Map<string, EducationLevel>(
  EDUCATION_VALUES.flatMap((value) => [
    [normalizeToken(value), value],
    [normalizeToken(EDUCATION_LABELS[value]), value],
  ])
)

const PRIMARY_INTENT_VALUE_BY_TOKEN = new Map<string, PrimaryIntent>(
  PRIMARY_INTENT_VALUES.flatMap((value) => [
    [normalizeToken(value), value],
    [normalizeToken(INTENT_LABELS[value]), value],
  ])
)

const RELATIONSHIP_MODE_VALUE_BY_TOKEN = new Map<string, RelationshipMode>(
  RELATIONSHIP_MODE_VALUES.flatMap((value) => [
    [normalizeToken(value), value],
    [normalizeToken(RELATIONSHIP_MODE_LABELS[value]), value],
  ])
)

const TRI_STATE_VALUE_BY_TOKEN = new Map<string, TriState>(
  TRI_STATE_VALUES.flatMap((value) => [
    [normalizeToken(value), value],
    [normalizeToken(TRI_STATE_LABELS[value]), value],
  ])
)

const IMPORTANCE_VALUE_BY_TOKEN = new Map<string, ImportanceLevel>(
  IMPORTANCE_LEVEL_VALUES.flatMap((value) => [
    [normalizeToken(value), value],
    [normalizeToken(IMPORTANCE_LEVEL_LABELS[value]), value],
  ])
)

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function isKnownFieldKey(value: string): value is V1FieldKey {
  return value in V1_FIELD_SPEC_BY_KEY
}

function formatPrimitiveValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '未填写'
  if (typeof value === 'boolean') return BOOLEAN_LABELS[String(value) as keyof typeof BOOLEAN_LABELS]
  return humanizeAIText(String(value))
}

function formatEducationValue(value: unknown) {
  const matched = EDUCATION_VALUE_BY_TOKEN.get(normalizeToken(String(value)))
  return matched ? EDUCATION_LABELS[matched] : formatPrimitiveValue(value)
}

function formatPrimaryIntentValue(value: unknown) {
  const matched = PRIMARY_INTENT_VALUE_BY_TOKEN.get(normalizeToken(String(value)))
  return matched ? INTENT_LABELS[matched] : formatPrimitiveValue(value)
}

function formatRelationshipModeValue(value: unknown) {
  const matched = RELATIONSHIP_MODE_VALUE_BY_TOKEN.get(normalizeToken(String(value)))
  return matched ? RELATIONSHIP_MODE_LABELS[matched] : formatPrimitiveValue(value)
}

function formatTriStateValue(value: unknown) {
  const matched = TRI_STATE_VALUE_BY_TOKEN.get(normalizeToken(String(value)))
  return matched ? TRI_STATE_LABELS[matched] : formatPrimitiveValue(value)
}

function formatImportanceValue(value: unknown) {
  const matched = IMPORTANCE_VALUE_BY_TOKEN.get(normalizeToken(String(value)))
  return matched ? IMPORTANCE_LEVEL_LABELS[matched] : formatPrimitiveValue(value)
}

function formatStringArrayValue(fieldKey: string, values: unknown[]) {
  const spec = isKnownFieldKey(fieldKey) ? V1_FIELD_SPEC_BY_KEY[fieldKey] : null

  if (spec?.valueType === 'education_array') {
    return values.map((item) => formatEducationValue(item))
  }

  return values.map((item) => formatPrimitiveValue(item)).filter(Boolean)
}

function formatImportanceObject(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, raw]) => {
      const resolvedFieldKey = resolveFieldKeyFromToken(key)
      const fieldLabel = resolvedFieldKey ? getFieldDisplayLabel(resolvedFieldKey) : key
      return `${fieldLabel}：${formatImportanceValue(raw)}`
    })
    .filter(Boolean)
}

function resolveFieldKeyFromToken(value: string): V1FieldKey | null {
  return FIELD_KEY_BY_TOKEN.get(normalizeToken(value)) ?? null
}

function parseEducationToken(value: string): EducationLevel | null {
  return EDUCATION_VALUE_BY_TOKEN.get(normalizeToken(value)) ?? null
}

function parsePrimaryIntentToken(value: string): PrimaryIntent | null {
  return PRIMARY_INTENT_VALUE_BY_TOKEN.get(normalizeToken(value)) ?? null
}

function parseRelationshipModeToken(value: string): RelationshipMode | null {
  return RELATIONSHIP_MODE_VALUE_BY_TOKEN.get(normalizeToken(value)) ?? null
}

function parseTriStateToken(value: string): TriState | null {
  return TRI_STATE_VALUE_BY_TOKEN.get(normalizeToken(value)) ?? null
}

function parseImportanceToken(value: string): ImportanceLevel | null {
  return IMPORTANCE_VALUE_BY_TOKEN.get(normalizeToken(value)) ?? null
}

export function getFieldDisplayLabel(fieldKey: string) {
  if (isKnownFieldKey(fieldKey)) return V1_FIELD_SPEC_BY_KEY[fieldKey].label
  return SYSTEM_FIELD_LABELS[fieldKey] ?? fieldKey
}

export function formatFieldValueLines(fieldKey: string, value: unknown): string[] {
  if (value === null || value === undefined || value === '') return []

  if (Array.isArray(value)) {
    return formatStringArrayValue(fieldKey, value)
  }

  if (typeof value === 'object') {
    return formatImportanceObject(value as Record<string, unknown>)
  }

  if (fieldKey === 'education_level_v2' || fieldKey === 'preferred_education') {
    return [formatEducationValue(value)]
  }

  if (fieldKey === 'primary_intent') {
    return [formatPrimaryIntentValue(value)]
  }

  if (fieldKey === 'relationship_mode') {
    return [formatRelationshipModeValue(value)]
  }

  if (
    fieldKey === 'accepts_mode_marriage_standard'
    || fieldKey === 'accepts_mode_compensated_dating'
    || fieldKey === 'accepts_mode_fertility_asset_arrangement'
    || fieldKey === 'accepts_long_distance'
    || fieldKey === 'relocation_willingness'
    || fieldKey === 'accepts_partner_children'
  ) {
    return [formatTriStateValue(value)]
  }

  if (fieldKey === 'preference_importance') {
    return typeof value === 'object' && value ? formatImportanceObject(value as Record<string, unknown>) : []
  }

  if (fieldKey === 'emotional_stability') {
    return [EMOTIONAL_STABILITY_LABELS[String(value)] ?? formatPrimitiveValue(value)]
  }

  return [formatPrimitiveValue(value)]
}

export function formatFieldValue(fieldKey: string, value: unknown) {
  const lines = formatFieldValueLines(fieldKey, value)
  if (!lines.length) return '未填写'
  return lines.join('、')
}

export function formatFieldDiff(fieldKey: string, oldValue: unknown, newValue: unknown) {
  return `${formatFieldValue(fieldKey, oldValue)} → ${formatFieldValue(fieldKey, newValue)}`
}

export function toEditableFieldValue(fieldKey: string, value: Json | undefined) {
  if (value === null || value === undefined) return ''

  if (isPlaceholderCandidateValue(fieldKey, value)) return ''

  if (fieldKey === 'preferred_education' && Array.isArray(value)) {
    return value.map((item) => formatEducationValue(item)).join('\n')
  }

  if (fieldKey === 'preference_importance' && value && typeof value === 'object' && !Array.isArray(value)) {
    return formatImportanceObject(value as Record<string, unknown>).join('\n')
  }

  if (Array.isArray(value)) return value.join('\n')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function parseEditableFieldValue(
  fieldKey: string,
  valueType: string,
  value: string
): Json | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (valueType === 'number') {
    const next = Number(trimmed)
    return Number.isFinite(next) ? next : undefined
  }

  if (valueType === 'primary_intent') {
    return parsePrimaryIntentToken(trimmed) ?? undefined
  }

  if (valueType === 'relationship_mode') {
    return parseRelationshipModeToken(trimmed) ?? undefined
  }

  if (valueType === 'tri_state') {
    return parseTriStateToken(trimmed) ?? undefined
  }

  if (valueType === 'education_array') {
    const next = trimmed
      .split(/\r?\n|、|，|,/)
      .map((item) => parseEducationToken(item))
      .filter((item): item is EducationLevel => Boolean(item))

    return next.length ? Array.from(new Set(next)) : undefined
  }

  if (valueType === 'string_array') {
    const next = trimmed
      .split(/\r?\n|、|，|,/)
      .map((item) => item.trim())
      .filter(Boolean)

    return next.length ? Array.from(new Set(next)) : undefined
  }

  if (valueType === 'json' && fieldKey === 'preference_importance') {
    const next = trimmed
      .split(/\r?\n|；/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce<Record<string, ImportanceLevel>>((acc, line) => {
        const [rawField, rawLevel] = line.split(/[:：=]/).map((item) => item.trim())
        if (!rawField || !rawLevel) return acc

        const resolvedFieldKey = resolveFieldKeyFromToken(rawField)
        const resolvedLevel = parseImportanceToken(rawLevel)

        if (!resolvedFieldKey || !resolvedLevel) return acc
        acc[resolvedFieldKey] = resolvedLevel
        return acc
      }, {})

    return Object.keys(next).length ? next : undefined
  }

  if (valueType === 'json') {
    try {
      return JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }

  return trimmed
}

export function getImportancePreviewKeys(value: string) {
  const parsed = parseEditableFieldValue('preference_importance', 'json', value)
  const extraKeys: string[] = []

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const setKeys = Object.keys(parsed).filter(isKnownFieldKey)
    for (const key of setKeys) {
      if (!(COMMON_IMPORTANCE_KEYS as readonly string[]).includes(key)) {
        extraKeys.push(key)
      }
    }
  }

  return [...COMMON_IMPORTANCE_KEYS, ...extraKeys]
}

export function toggleEducationSelection(rawValue: string, option: EducationLevel) {
  const parsed = parseEditableFieldValue('preferred_education', 'education_array', rawValue)
  const selected = new Set(Array.isArray(parsed) ? (parsed as EducationLevel[]) : [])

  if (selected.has(option)) selected.delete(option)
  else selected.add(option)

  return toEditableFieldValue('preferred_education', Array.from(selected))
}

export function humanizeAIText(text: string | null | undefined) {
  if (!text) return ''

  return HUMAN_REPLACEMENTS.reduce((nextText, [from, to]) => {
    return nextText.replace(new RegExp(escapeRegExp(from), 'g'), to)
  }, text)
}

export function isPlaceholderCandidateValue(fieldKey: string, value: unknown) {
  if (value === null || value === undefined) return false
  if (Array.isArray(value) || typeof value === 'object') return false

  if (
    fieldKey === 'education_level_v2'
    || fieldKey === 'primary_intent'
    || fieldKey === 'relationship_mode'
    || fieldKey === 'preferred_education'
    || fieldKey === 'preference_importance'
  ) {
    return false
  }

  const text = humanizeAIText(String(value)).trim()
  if (!text) return false

  return PLACEHOLDER_CANDIDATE_PATTERNS.some((pattern) => pattern.test(text))
}
