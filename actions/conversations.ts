'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runMatchingForProfile } from '@/lib/matching/engine'
import { Json } from '@/types/database'
import { applyExtractionContractToProfile } from '@/lib/ai/apply-extraction'
import { syncFollowupTask } from '@/lib/followup/tasks'
import { V1_FIELD_SPEC_BY_KEY, type V1FieldKey } from '@/lib/ai/field-spec'
import { isPlaceholderCandidateValue } from '@/lib/ai/field-presentation'

type ReviewDecision = {
  field_key: string
  new_value?: Json
  skip?: boolean
}

type ResolveConversationReviewInput = {
  conversationId: string
  profileId: string
  decisions: ReviewDecision[]
}

type ExistingExtractionPayload = {
  field_updates?: Array<Record<string, unknown>>
  applied_field_updates?: Array<Record<string, unknown>>
  review_required?: Array<Record<string, unknown>>
  missing_critical_fields?: string[]
  suggested_followup_questions?: string[]
  summary_updates?: Record<string, Json>
  processing_notes?: string[]
  [key: string]: unknown
}

export async function resolveConversationReview(input: ResolveConversationReviewInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('未登录')

  const [{ data: profile }, { data: intention }, { data: traitProfile }, { data: conversation }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', input.profileId)
      .eq('matchmaker_id', user.id)
      .single(),
    supabase
      .from('intentions')
      .select('*')
      .eq('profile_id', input.profileId)
      .maybeSingle(),
    supabase
      .from('trait_profiles')
      .select('*')
      .eq('profile_id', input.profileId)
      .maybeSingle(),
    supabase
      .from('conversations')
      .select('*')
      .eq('id', input.conversationId)
      .eq('profile_id', input.profileId)
      .eq('matchmaker_id', user.id)
      .single(),
  ])

  if (!profile || !conversation) {
    throw new Error('客户或会话不存在')
  }

  const existingExtraction = (conversation.extracted_fields as ExistingExtractionPayload | null) ?? {}
  const reviewRequired = Array.isArray(existingExtraction.review_required)
    ? existingExtraction.review_required
    : []

  const decisionMap = new Map(input.decisions.map((decision) => [decision.field_key, decision]))

  const fieldUpdates = reviewRequired
    .map((item) => {
      const fieldKey = String(item.field_key ?? '')
      const decision = decisionMap.get(fieldKey)
      if (decision?.skip || !(fieldKey in V1_FIELD_SPEC_BY_KEY)) return null

      const fallbackCandidateValue = item.candidate_value as Json | undefined
      const nextValue = decision?.new_value !== undefined
        ? decision.new_value
        : isPlaceholderCandidateValue(fieldKey, fallbackCandidateValue)
          ? undefined
          : fallbackCandidateValue

      if (nextValue === undefined) {
        return null
      }

      return {
        field_key: fieldKey as V1FieldKey,
        field_label: String(item.field_label ?? fieldKey),
        action: 'replace' as const,
        new_value: nextValue,
        old_value: item.old_value as Json | undefined,
        confidence: 'high' as const,
        evidence_excerpt: typeof item.evidence_excerpt === 'string' ? item.evidence_excerpt : undefined,
        reason: '红娘已确认异常字段',
        auto_apply: true,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const applyResult = await applyExtractionContractToProfile({
    supabase,
    profile,
    intention,
    traitProfile,
    conversation,
    contract: {
      field_updates: fieldUpdates,
      review_required: [],
      missing_critical_fields: existingExtraction.missing_critical_fields ?? [],
      suggested_followup_questions: existingExtraction.suggested_followup_questions ?? [],
      summary_updates: {},
      processing_notes: ['红娘已处理本次异常字段'],
    },
  })

  const mergedAppliedUpdates = [
    ...((existingExtraction.applied_field_updates as ExistingExtractionPayload['applied_field_updates']) ?? []),
    ...applyResult.appliedFieldUpdates,
  ]

  const nextExtractedFields = {
    ...existingExtraction,
    applied_field_updates: mergedAppliedUpdates,
    review_required: [],
  } as Json

  await supabase
    .from('conversations')
    .update({
      extracted_fields: nextExtractedFields,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.conversationId)

  await syncFollowupTask({
    supabase,
    matchmakerId: user.id,
    profileId: input.profileId,
    fieldKeys: existingExtraction.missing_critical_fields ?? [],
    questions: existingExtraction.suggested_followup_questions ?? [],
    rationale: '红娘已处理异常字段，保留待补问清单',
  })

  let matchResult = { matched: 0, created: 0, updated: 0, skipped: 0 }
  if (applyResult.matchingRelevantChanged) {
    matchResult = await runMatchingForProfile(input.profileId)
  }

  revalidatePath('/matchmaker/clients')
  revalidatePath(`/matchmaker/clients/${input.profileId}`)
  revalidatePath(`/matchmaker/clients/${input.profileId}/conversations/${input.conversationId}/review`)
  revalidatePath('/matchmaker/matches')
  revalidatePath('/matchmaker/reminders')

  return matchResult
}
