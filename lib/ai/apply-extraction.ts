import { SupabaseClient } from '@supabase/supabase-js'
import {
  Conversation,
  ConversationUpdate,
  Database,
  Intention,
  IntentionUpdate,
  Json,
  Profile,
  ProfileUpdate,
  TraitProfile,
  TraitProfileUpdate,
  TriState,
} from '@/types/database'
import {
  ExtractionContract,
  ExtractionConfidence,
  FieldUpdate,
  ReviewRequiredItem,
} from '@/lib/ai/extraction-contract'
import { buildCurrentProfileSnapshot, type CurrentProfileSnapshot } from '@/lib/ai/snapshot'
import { V1_FIELD_SPEC_BY_KEY, type V1FieldKey } from '@/lib/ai/field-spec'
import { isPlaceholderCandidateValue } from '@/lib/ai/field-presentation'
import { buildFieldObservationInserts } from '@/lib/ai/field-observations'

type ApplyExtractionInput = {
  supabase: SupabaseClient<Database>
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
  conversation: Conversation
  contract: ExtractionContract
  observationSourceType?: Database['public']['Enums']['field_observation_source_type']
}

type ApplyExtractionResult = {
  appliedFieldUpdates: FieldUpdate[]
  reviewRequired: ReviewRequiredItem[]
  matchingRelevantChanged: boolean
  missingCriticalFields: string[]
  suggestedFollowupQuestions: string[]
}

function isReviewValueMissing(value: Json | undefined) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function enrichReviewRequiredItems(
  items: ReviewRequiredItem[],
  currentSnapshot: CurrentProfileSnapshot,
  allFieldUpdates: FieldUpdate[]
) {
  const candidateValueByField = new Map<V1FieldKey, Json>()

  for (const update of allFieldUpdates) {
    if (!isKnownFieldKey(update.field_key)) continue

    const normalizedNewValue = normalizeValue(update.field_key, update.new_value)
    if (normalizedNewValue === undefined) continue

    const mergedValue = mergeValue(
      update.action,
      currentSnapshot[update.field_key] as Json | undefined,
      normalizedNewValue
    ) as Json

    candidateValueByField.set(update.field_key, mergedValue)
  }

  return items.map((item) => {
    if (!isKnownFieldKey(item.field_key)) {
      return item
    }

    return {
      ...item,
      field_label: V1_FIELD_SPEC_BY_KEY[item.field_key].label,
      old_value: isReviewValueMissing(item.old_value)
        ? (currentSnapshot[item.field_key] as Json | undefined)
        : item.old_value,
      candidate_value: isReviewValueMissing(item.candidate_value)
        ? candidateValueByField.get(item.field_key)
        : item.candidate_value,
    }
  })
}

function mergeConfidence(
  left: ExtractionConfidence,
  right: ExtractionConfidence
): ExtractionConfidence {
  const rank: Record<ExtractionConfidence, number> = {
    high: 1,
    medium: 2,
    low: 3,
  }

  return rank[left] >= rank[right] ? left : right
}

function mergeIssueType(
  left: ReviewRequiredItem['issue_type'],
  right: ReviewRequiredItem['issue_type']
): ReviewRequiredItem['issue_type'] {
  const rank: Record<ReviewRequiredItem['issue_type'], number> = {
    ambiguous_statement: 1,
    low_confidence: 2,
    value_conflict: 3,
    speaker_uncertain: 4,
    identity_conflict: 5,
  }

  return rank[left] >= rank[right] ? left : right
}

function pickRicherReason(left?: string, right?: string) {
  const normalizedLeft = left?.trim() || ''
  const normalizedRight = right?.trim() || ''

  if (!normalizedLeft) return normalizedRight || undefined
  if (!normalizedRight) return normalizedLeft
  return normalizedLeft.length >= normalizedRight.length ? normalizedLeft : normalizedRight
}

function dedupeReviewRequiredItems(items: ReviewRequiredItem[]) {
  const merged = new Map<string, ReviewRequiredItem>()

  for (const item of items) {
    const existing = merged.get(item.field_key)
    if (!existing) {
      merged.set(item.field_key, item)
      continue
    }

    merged.set(item.field_key, {
      ...existing,
      field_label: existing.field_label || item.field_label,
      issue_type: mergeIssueType(existing.issue_type, item.issue_type),
      old_value: isReviewValueMissing(existing.old_value) ? item.old_value : existing.old_value,
      candidate_value: isReviewValueMissing(existing.candidate_value) ? item.candidate_value : existing.candidate_value,
      confidence: mergeConfidence(existing.confidence, item.confidence),
      evidence_excerpt: existing.evidence_excerpt || item.evidence_excerpt,
      reason: pickRicherReason(existing.reason, item.reason),
    })
  }

  return Array.from(merged.values())
}

function hasMeaningfulReviewCandidate(fieldKey: V1FieldKey, candidateValue: Json | undefined) {
  if (isReviewValueMissing(candidateValue)) return false

  if (isPlaceholderCandidateValue(fieldKey, candidateValue)) {
    return false
  }

  if (
    V1_FIELD_SPEC_BY_KEY[fieldKey].valueType !== 'tri_state'
    && typeof candidateValue === 'string'
    && candidateValue.trim().toLowerCase() === 'unknown'
  ) {
    return false
  }

  return true
}

function filterDisplayableReviewRequiredItems(
  items: ReviewRequiredItem[],
  currentSnapshot: CurrentProfileSnapshot
) {
  return items.filter((item) => {
    if (!isKnownFieldKey(item.field_key)) {
      return item.issue_type === 'identity_conflict' || item.issue_type === 'speaker_uncertain'
    }

    if (item.issue_type === 'identity_conflict' || item.issue_type === 'speaker_uncertain') {
      return true
    }

    if (!hasMeaningfulReviewCandidate(item.field_key, item.candidate_value)) {
      return false
    }

    const normalizedCandidate = normalizeValue(item.field_key, item.candidate_value)
    if (normalizedCandidate === undefined) {
      return false
    }

    const currentValue = currentSnapshot[item.field_key]
    return !valuesEqual(currentValue, mergeValue('set', currentValue, normalizedCandidate))
  })
}

function isKnownFieldKey(value: string): value is V1FieldKey {
  return value in V1_FIELD_SPEC_BY_KEY
}

function isTriStateValue(value: unknown): value is TriState {
  return value === 'yes' || value === 'no' || value === 'unknown'
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return null
  const normalized = value
    .map((item) => String(item).trim())
    .filter(Boolean)

  return normalized.length ? Array.from(new Set(normalized)) : null
}

function normalizeImportanceJson(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const next = Object.entries(value).reduce<Record<string, string>>((acc, [key, raw]) => {
    const normalized = String(raw).trim()
    if (['hard', 'important', 'normal', 'flexible'].includes(normalized)) {
      acc[key] = normalized
    }
    return acc
  }, {})

  return Object.keys(next).length ? next : null
}

function normalizeValue(fieldKey: V1FieldKey, value: unknown): Json | undefined {
  const spec = V1_FIELD_SPEC_BY_KEY[fieldKey]

  if (value === undefined) return undefined
  if (value === null) return null

  switch (spec.valueType) {
    case 'number': {
      const next = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(next) ? next : undefined
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      const next = String(value).trim().toLowerCase()
      if (['true', 'yes', '有', '是'].includes(next)) return true
      if (['false', 'no', '没有', '否'].includes(next)) return false
      return undefined
    }
    case 'tri_state': {
      const next = String(value).trim().toLowerCase()
      return isTriStateValue(next) ? next : undefined
    }
    case 'string': {
      const next = String(value).trim()
      return next ? next : undefined
    }
    case 'string_array':
    case 'education_array': {
      return normalizeStringArray(value)
    }
    case 'json': {
      return normalizeImportanceJson(value)
    }
    case 'date_time': {
      const next = new Date(String(value))
      return Number.isNaN(next.getTime()) ? undefined : next.toISOString()
    }
    default: {
      const next = String(value).trim()
      return next ? next : undefined
    }
  }
}

function mergeValue(action: FieldUpdate['action'], oldValue: unknown, newValue: Json) {
  if (action === 'append_unique') {
    const current = Array.isArray(oldValue) ? oldValue.map((item) => String(item)) : []
    const incoming = Array.isArray(newValue) ? newValue.map((item) => String(item)) : [String(newValue)]
    return Array.from(new Set([...current, ...incoming])).filter(Boolean)
  }

  return newValue
}

function valuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const MEDIUM_CONFIDENCE_PROFILE_FACT_AUTO_APPLY_FIELDS = new Set<V1FieldKey>([
  'age',
  'height',
  'city',
  'current_base_cities',
  'education',
  'occupation',
  'work_schedule',
  'annual_income',
  'marital_history',
  'has_children',
])

function canBackfillDirectProfileFactAtMediumConfidence(
  fieldKey: V1FieldKey,
  confidence: ExtractionConfidence,
  explicitConflict: boolean,
  oldValue: unknown
) {
  if (confidence === 'low' || explicitConflict) return false
  if (oldValue !== null && oldValue !== undefined) return false
  return MEDIUM_CONFIDENCE_PROFILE_FACT_AUTO_APPLY_FIELDS.has(fieldKey)
}

function shouldAutoApply(
  confidence: ExtractionConfidence,
  explicitConflict: boolean,
  fieldKey: V1FieldKey,
  oldValue: unknown,
  evidenceExcerpt?: string
) {
  const spec = V1_FIELD_SPEC_BY_KEY[fieldKey]

  if (spec.category === 'sensitive' && !evidenceExcerpt?.trim()) {
    return false
  }

  if (spec.autoApply === 'always') return confidence !== 'low'
  if (spec.autoApply === 'when_high_confidence') {
    return confidence === 'high'
      || canBackfillDirectProfileFactAtMediumConfidence(fieldKey, confidence, explicitConflict, oldValue)
  }
  if (spec.autoApply === 'review_on_conflict') return confidence === 'high' && !explicitConflict
  return false
}

function isResolvableTriStateUpgrade(
  valueType: string,
  oldValue: unknown,
  newValue: Json
) {
  return valueType === 'tri_state'
    && isTriStateValue(oldValue)
    && oldValue === 'unknown'
    && isTriStateValue(newValue)
    && newValue !== 'unknown'
}

function pushTableUpdate(
  fieldKey: V1FieldKey,
  value: Json,
  profileUpdates: ProfileUpdate,
  intentionUpdates: IntentionUpdate,
  traitProfileUpdates: TraitProfileUpdate
) {
  const spec = V1_FIELD_SPEC_BY_KEY[fieldKey]

  if (spec.targetTable === 'profiles') {
    ;(profileUpdates as Record<string, Json | undefined>)[fieldKey] = value
  }

  if (spec.targetTable === 'intentions') {
    ;(intentionUpdates as Record<string, Json | undefined>)[fieldKey] = value
  }

  if (spec.targetTable === 'trait_profiles') {
    ;(traitProfileUpdates as Record<string, Json | undefined>)[fieldKey] = value
  }
}

export async function applyExtractionContractToProfile({
  supabase,
  profile,
  intention,
  traitProfile,
  conversation,
  contract,
  observationSourceType = 'ai_extracted',
}: ApplyExtractionInput): Promise<ApplyExtractionResult> {
  const currentSnapshot = buildCurrentProfileSnapshot({
    profile,
    intention,
    traitProfile,
    conversation,
  })

  const profileUpdates: ProfileUpdate = {}
  const intentionUpdates: IntentionUpdate = {}
  const traitProfileUpdates: TraitProfileUpdate = {}
  const conversationUpdates: ConversationUpdate = {
    missing_fields: contract.missing_critical_fields,
    suggested_questions: contract.suggested_followup_questions,
  }

  const syntheticSummaryFieldUpdates: FieldUpdate[] = Object.entries(contract.summary_updates ?? {})
    .filter(([key]) => key in V1_FIELD_SPEC_BY_KEY)
    .map(([field_key, new_value]) => ({
      field_key: field_key as V1FieldKey,
      field_label: V1_FIELD_SPEC_BY_KEY[field_key as V1FieldKey].label,
      action: 'set' as const,
      new_value: new_value as Json,
      old_value: currentSnapshot[field_key as V1FieldKey] as Json | undefined,
      confidence: 'medium' as const,
      reason: 'AI 对软字段的保守总结',
      auto_apply: true,
    }))

  const allFieldUpdates = [...contract.field_updates, ...syntheticSummaryFieldUpdates]
  const reviewRequired: ReviewRequiredItem[] = enrichReviewRequiredItems(
    contract.review_required,
    currentSnapshot,
    allFieldUpdates
  )
  const appliedFieldUpdates: FieldUpdate[] = []

  for (const update of allFieldUpdates) {
    if (!isKnownFieldKey(update.field_key)) {
      continue
    }

    const fieldKey = update.field_key
    const spec = V1_FIELD_SPEC_BY_KEY[fieldKey]
    const normalizedNewValue = normalizeValue(fieldKey, update.new_value)
    const oldValue = currentSnapshot[fieldKey]

    if (normalizedNewValue === undefined) {
      continue
    }

    if (spec.valueType === 'tri_state' && normalizedNewValue === 'unknown' && isTriStateValue(oldValue)) {
      if (oldValue !== 'unknown') {
        continue
      }
    }

    const mergedValue = mergeValue(update.action, oldValue, normalizedNewValue)
    const explicitConflict =
      oldValue !== null &&
      oldValue !== undefined &&
      !valuesEqual(oldValue, mergedValue) &&
      !isResolvableTriStateUpgrade(spec.valueType, oldValue, mergedValue)

    const canAutoApply = (update.auto_apply ?? true)
      && update.action !== 'review'
      && shouldAutoApply(update.confidence, explicitConflict, fieldKey, oldValue, update.evidence_excerpt)

    if (!canAutoApply) {
      reviewRequired.push({
        field_key: fieldKey,
        field_label: spec.label,
        issue_type: explicitConflict ? 'value_conflict' : 'low_confidence',
        old_value: oldValue as Json | undefined,
        candidate_value: mergedValue as Json,
        confidence: update.confidence,
        evidence_excerpt: update.evidence_excerpt,
        reason: update.reason,
      })
      continue
    }

    if (valuesEqual(oldValue, mergedValue)) {
      continue
    }

    if (spec.targetTable === 'conversations') {
      ;(conversationUpdates as Record<string, Json | undefined>)[fieldKey] = mergedValue as Json
    } else {
      pushTableUpdate(
        fieldKey,
        mergedValue as Json,
        profileUpdates,
        intentionUpdates,
        traitProfileUpdates
      )
    }

    currentSnapshot[fieldKey] = mergedValue
    appliedFieldUpdates.push({
      ...update,
      old_value: oldValue as Json | undefined,
      new_value: mergedValue as Json,
      field_label: spec.label,
      auto_apply: true,
    })
  }

  const hasProfileUpdates = Object.keys(profileUpdates).length > 0
  const hasIntentionUpdates = Object.keys(intentionUpdates).length > 0
  const hasTraitProfileUpdates = Object.keys(traitProfileUpdates).length > 0

  const writeOperations: Array<unknown> = []

  if (hasProfileUpdates) {
    writeOperations.push(
      supabase.from('profiles').update(profileUpdates).eq('id', profile.id)
    )
  }

  if (hasIntentionUpdates) {
    writeOperations.push(
      supabase
        .from('intentions')
        .upsert({ profile_id: profile.id, ...intentionUpdates }, { onConflict: 'profile_id' })
    )
  }

  if (hasTraitProfileUpdates) {
    writeOperations.push(
      supabase
        .from('trait_profiles')
        .upsert({ profile_id: profile.id, ...traitProfileUpdates }, { onConflict: 'profile_id' })
    )
  }

  const dedupedReviewRequired = filterDisplayableReviewRequiredItems(
    dedupeReviewRequiredItems(reviewRequired),
    currentSnapshot
  )

  conversationUpdates.extracted_fields = {
    ...contract,
    applied_field_updates: appliedFieldUpdates,
    review_required: dedupedReviewRequired,
  }
  conversationUpdates.extraction_notes = contract.processing_notes.join('\n') || null

  writeOperations.push(
    supabase
      .from('conversations')
      .update(conversationUpdates)
      .eq('id', conversation.id)
  )

  const fieldObservationPayload = buildFieldObservationInserts({
    profileId: profile.id,
    conversationId: conversation.id,
    sourceType: observationSourceType,
    fieldUpdates: appliedFieldUpdates,
  })

  if (fieldObservationPayload.length) {
    writeOperations.push(
      supabase
        .from('field_observations')
        .insert(fieldObservationPayload)
    )
  }

  await Promise.all(writeOperations)

  const matchingRelevantChanged = appliedFieldUpdates.some((item) => {
    if (!isKnownFieldKey(item.field_key)) {
      return false
    }

    const role = V1_FIELD_SPEC_BY_KEY[item.field_key].matchingRole
    return role === 'hard' || role === 'soft' || role === 'pending'
  })

  return {
    appliedFieldUpdates,
    reviewRequired: dedupedReviewRequired,
    matchingRelevantChanged,
    missingCriticalFields: contract.missing_critical_fields,
    suggestedFollowupQuestions: contract.suggested_followup_questions,
  }
}
