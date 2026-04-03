import { SupabaseClient } from '@supabase/supabase-js'
import { Database, FollowupTaskType, TaskPriority } from '@/types/database'

const HIGH_PRIORITY_FIELD_KEYS = new Set([
  'relationship_mode',
  'accepts_mode_compensated_dating',
  'accepts_mode_fertility_asset_arrangement',
  'accepts_partner_children',
  'marital_history',
  'has_children',
  'fertility_preference',
])

function determineTaskType(fieldKeys: string[], explicitType?: FollowupTaskType): FollowupTaskType {
  if (explicitType) return explicitType
  if (fieldKeys.some((fieldKey) => HIGH_PRIORITY_FIELD_KEYS.has(fieldKey))) {
    return 'sensitive_confirmation'
  }
  return 'missing_field'
}

function determinePriority(fieldKeys: string[]): TaskPriority {
  if (fieldKeys.some((fieldKey) => HIGH_PRIORITY_FIELD_KEYS.has(fieldKey))) return 'high'
  if (fieldKeys.length >= 3) return 'medium'
  return 'low'
}

function normalizeStringList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function stableStringify(values: string[]) {
  return JSON.stringify(values.slice().sort())
}

type SyncTaskInput = {
  supabase: SupabaseClient<Database>
  matchmakerId: string
  profileId?: string | null
  matchId?: string | null
  fieldKeys: string[]
  questions: string[]
  rationale: string
  taskType?: FollowupTaskType
}

async function closeOpenTasks(
  supabase: SupabaseClient<Database>,
  profileId?: string | null,
  matchId?: string | null
) {
  let query = supabase
    .from('followup_tasks')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
    })
    .in('status', ['open', 'in_progress'])

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  if (matchId) {
    query = query.eq('match_id', matchId)
  } else {
    query = query.is('match_id', null)
  }

  await query
}

export async function syncFollowupTask({
  supabase,
  matchmakerId,
  profileId = null,
  matchId = null,
  fieldKeys,
  questions,
  rationale,
  taskType,
}: SyncTaskInput) {
  const dedupedFieldKeys = normalizeStringList(fieldKeys)
  const dedupedQuestions = normalizeStringList(questions)

  if (!dedupedFieldKeys.length && !dedupedQuestions.length) {
    await closeOpenTasks(supabase, profileId, matchId)
    return
  }

  const nextTaskType = determineTaskType(dedupedFieldKeys, taskType)
  const nextPriority = determinePriority(dedupedFieldKeys)

  let existingQuery = supabase
    .from('followup_tasks')
    .select('id, match_id, task_type, field_keys, question_list, updated_at')
    .eq('matchmaker_id', matchmakerId)
    .in('status', ['open', 'in_progress'])
    .limit(10)

  if (profileId) {
    existingQuery = existingQuery.eq('profile_id', profileId)
  } else {
    existingQuery = existingQuery.is('profile_id', null)
  }

  if (!profileId && matchId) {
    existingQuery = existingQuery.eq('match_id', matchId)
  } else if (!profileId) {
    existingQuery = existingQuery.is('match_id', null)
  }

  const { data: existing } = await existingQuery

  const reusable = (existing ?? []).find((task) => {
    const currentFields = stableStringify(normalizeStringList(task.field_keys ?? []))
    const currentQuestions = stableStringify(normalizeStringList(task.question_list ?? []))
    const nextFields = stableStringify(dedupedFieldKeys)
    const nextQuestions = stableStringify(dedupedQuestions)
    return currentFields === nextFields
      && currentQuestions === nextQuestions
      && task.task_type === nextTaskType
  })

  const payload = {
    profile_id: profileId,
    match_id: reusable?.match_id ?? matchId,
    matchmaker_id: matchmakerId,
    task_type: nextTaskType,
    priority: nextPriority,
    field_keys: dedupedFieldKeys,
    question_list: dedupedQuestions,
    rationale,
    status: 'open' as const,
    completed_at: null,
  }

  if (reusable) {
    await supabase
      .from('followup_tasks')
      .update(payload)
      .eq('id', reusable.id)
    return reusable.id
  }

  const { data } = await supabase
    .from('followup_tasks')
    .insert(payload)
    .select('id')
    .single()

  return data?.id
}
