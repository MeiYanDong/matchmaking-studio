'use server'

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  EducationLevel,
  GenderType,
  ImportanceLevel,
  Json,
  PrimaryIntent,
  ProfileStatus,
  RelationshipMode,
  TriState,
} from '@/types/database'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

const STORAGE_DELETE_BATCH_SIZE = 100

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function uniqueNonEmpty(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])]
}

async function removeStorageObjects(
  bucketName: 'audio-files' | 'profile-photos',
  objectPaths: string[]
) {
  const serviceRoleClient = createServiceRoleClient()
  const warnings: string[] = []

  for (const batch of chunk(uniqueNonEmpty(objectPaths), STORAGE_DELETE_BATCH_SIZE)) {
    if (batch.length === 0) continue

    const { error } = await withSupabaseRetry(
      () => serviceRoleClient.storage.from(bucketName).remove(batch),
      { label: `${bucketName} cleanup` }
    )

    if (error) {
      console.error(`[client delete] failed to remove ${bucketName} objects`, { batch, error })
      warnings.push(bucketName)
    }
  }

  return warnings
}

export async function createClient(formData: {
  name: string
  gender: GenderType
  phone?: string
  note?: string
}) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      name: formData.name.trim() || `待识别客户-${Date.now().toString().slice(-6)}`,
      gender: formData.gender,
      phone: formData.phone,
      raw_notes: formData.note ?? null,
      matchmaker_id: user.id,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 同时创建空的 intentions 记录
  await supabase.from('intentions').insert({ profile_id: data.id })
  await supabase.from('trait_profiles').insert({ profile_id: data.id })

  revalidatePath('/matchmaker/clients')
  return data
}

export const createClient_action = createClient

export async function updateProfile(profileId: string, updates: {
  name?: string
  gender?: GenderType
  age?: number | null
  height?: number | null
  weight?: number | null
  city?: string | null
  hometown?: string | null
  education?: EducationLevel | null
  occupation?: string | null
  job_title?: string | null
  phone?: string | null
  annual_income?: number | null
  income_range?: string | null
  assets?: string | null
  appearance_score?: number | null
  avatar_url?: string | null
  lifestyle_photo_urls?: string[] | null
  photo_urls?: string[] | null
  hobbies?: string[] | null
  marital_history?: string | null
  has_children?: boolean | null
  children_notes?: string | null
  lifestyle_tags?: string[] | null
  personality_tags?: string[] | null
  smoking?: boolean | null
  drinking?: boolean | null
  family_burden_notes?: string | null
  parental_involvement?: string | null
  seriousness_score?: number | null
  followup_strategy?: string | null
  hidden_expectations?: string | null
  ai_summary?: string | null
  raw_notes?: string | null
  status?: ProfileStatus
}) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .eq('matchmaker_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath(`/matchmaker/clients/${profileId}`)
}

export async function updateIntention(profileId: string, updates: {
  primary_intent?: PrimaryIntent | null
  intent_notes?: string | null
  relationship_mode?: RelationshipMode | null
  relationship_mode_notes?: string | null
  accepts_mode_marriage_standard?: TriState
  accepts_mode_compensated_dating?: TriState
  accepts_mode_fertility_asset_arrangement?: TriState
  mode_boundary_notes?: string | null
  financial_arrangement_expectation?: string | null
  financial_arrangement_boundary?: string | null
  exclusive_relationship_requirement?: string | null
  preferred_age_min?: number | null
  preferred_age_max?: number | null
  preferred_height_min?: number | null
  preferred_cities?: string[] | null
  preferred_education?: EducationLevel[] | null
  preferred_income_min?: number | null
  preferred_net_worth_min?: string | null
  preferred_industry_tags?: string[] | null
  dealbreakers?: string[] | null
  tolerance_notes?: string | null
  acceptable_conditions?: string[] | null
  accepts_long_distance?: TriState
  long_distance_notes?: string | null
  fertility_preference?: string | null
  fertility_timeline?: string | null
  desired_children_count?: number | null
  biological_child_requirement?: boolean | null
  co_parenting_expectation?: string | null
  child_support_expectation?: string | null
  inheritance_expectation?: string | null
  prenup_acceptance?: TriState
  settle_city_preferences?: string[] | null
  relocation_willingness?: TriState
  accepts_partner_marital_history?: string[] | null
  accepts_partner_children?: TriState
  relationship_pace?: string | null
  communication_style?: string | null
  biggest_concerns?: string[] | null
  implicit_intent_notes?: string | null
  preference_importance?: Json | null
}) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('intentions')
    .update(updates)
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath(`/matchmaker/clients/${profileId}`)
}

export async function updateTraitProfile(profileId: string, updates: {
  hobby_ranked_tags?: string[] | null
  exercise_habits?: string | null
  diet_habits?: string | null
  sleep_schedule?: string | null
  smoking_habit?: string | null
  drinking_habit?: string | null
  social_preference?: string | null
  spending_style?: string | null
  emotional_stability?: string | null
}) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('trait_profiles')
    .upsert({ profile_id: profileId, ...updates }, { onConflict: 'profile_id' })

  if (error) throw new Error(error.message)
  revalidatePath(`/matchmaker/clients/${profileId}`)
}

export async function deleteClientProfile(profileId: string) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const [{ data: roleData }, { data: profile, error: profileError }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'delete client role query' }
    ),
    withSupabaseRetry(
      () => supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle(),
      { label: 'delete client profile query' }
    ),
  ])

  if (profileError) throw new Error(profileError.message)
  if (!profile) throw new Error('客户不存在或已删除。')

  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    throw new Error('你只能删除自己上传的客户。')
  }

  const { data: conversations, error: conversationsError } = await withSupabaseRetry(
    () => serviceRoleClient.from('conversations').select('audio_url').eq('profile_id', profileId),
    { label: 'delete client conversations query' }
  )

  if (conversationsError) throw new Error(conversationsError.message)

  const audioPaths = uniqueNonEmpty(
    (conversations ?? []).map((conversation) => extractBucketObjectPath(conversation.audio_url, 'audio-files'))
  )
  const photoPaths = uniqueNonEmpty(
    [
      profile.avatar_url,
      ...(profile.lifestyle_photo_urls ?? []),
      ...(profile.photo_urls ?? []),
    ].map((photoUrl) => extractBucketObjectPath(photoUrl, 'profile-photos'))
  )

  const cleanupWarnings = [
    ...(await removeStorageObjects('audio-files', audioPaths)),
    ...(await removeStorageObjects('profile-photos', photoPaths)),
  ]

  const { error: deleteError } = await withSupabaseRetry(
    () => serviceRoleClient.from('profiles').delete().eq('id', profileId),
    { label: 'delete client profile mutation' }
  )

  if (deleteError) throw new Error(deleteError.message)

  revalidatePath('/matchmaker/clients')
  revalidatePath(`/matchmaker/clients/${profileId}`)
  revalidatePath('/matchmaker/reminders')
  revalidatePath('/matchmaker/matches')
  revalidatePath('/admin/clients')

  return {
    deletedId: profileId,
    deletedName: profile.name,
    cleanupWarnings,
  }
}
