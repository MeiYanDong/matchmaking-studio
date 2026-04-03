import { type FieldObservationInsert, type FieldObservationSourceType, type Json } from '@/types/database'
import { type ExtractionConfidence, type FieldUpdate } from '@/lib/ai/extraction-contract'
import { V1_FIELD_SPEC_BY_KEY, type V1FieldKey } from '@/lib/ai/field-spec'

function toConfidenceScore(confidence: ExtractionConfidence) {
  return {
    high: 92,
    medium: 72,
    low: 48,
  }[confidence]
}

function dedupeLatestFieldUpdates(fieldUpdates: FieldUpdate[]) {
  const updatesByField = new Map<V1FieldKey, FieldUpdate>()

  for (const update of fieldUpdates) {
    if (!(update.field_key in V1_FIELD_SPEC_BY_KEY)) continue
    updatesByField.set(update.field_key as V1FieldKey, update)
  }

  return Array.from(updatesByField.values())
}

type BuildFieldObservationInput = {
  profileId: string
  conversationId: string
  sourceType: FieldObservationSourceType
  fieldUpdates: FieldUpdate[]
}

export function buildFieldObservationInserts({
  profileId,
  conversationId,
  sourceType,
  fieldUpdates,
}: BuildFieldObservationInput): FieldObservationInsert[] {
  return dedupeLatestFieldUpdates(fieldUpdates).map((update) => ({
    profile_id: profileId,
    conversation_id: conversationId,
    field_key: update.field_key,
    field_value_json: (update.new_value ?? null) as Json,
    source_type: sourceType,
    confidence: toConfidenceScore(update.confidence),
    verification_status: sourceType === 'verified_document' ? 'verified' : 'unverified',
    evidence_text: update.evidence_excerpt?.trim() || null,
    start_time_seconds: null,
    end_time_seconds: null,
  }))
}
