import { generateClaudeText } from '@/lib/ai/client'
import { syncFollowupTask } from '@/lib/followup/tasks'
import { calculateMatchScore, ProfileWithIntention } from '@/lib/matching/score'
import { getMatchThreshold } from '@/lib/matching/settings'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Intention, Profile, TraitProfile } from '@/types/database'

type MatchRunResult = {
  matched: number
  created: number
  updated: number
  skipped: number
}

function getMatchReasonModel() {
  return process.env.CLAUDE_MATCH_REASON_MODEL?.trim()
    || process.env.CLAUDE_DEFAULT_MODEL?.trim()
    || 'anthropic/claude-sonnet-4.6'
}

function toProfileWithIntention(
  profile: Profile,
  intention: Intention | null,
  traitProfile: TraitProfile | null
): ProfileWithIntention {
  return { ...profile, intention, traitProfile }
}

function getPairKey(maleProfileId: string, femaleProfileId: string) {
  return `${maleProfileId}:${femaleProfileId}`
}

async function generateMatchReason(male: Profile, female: Profile, score: number): Promise<string> {
  try {
    return await generateClaudeText({
      model: getMatchReasonModel(),
      maxTokens: 220,
      messages: [
        {
          role: 'user',
          content: `请用一句话（30-60字）描述为什么这对男女值得继续推进。
男方：${male.age ?? '未知'}岁，${male.city ?? '城市未知'}，${male.occupation ?? male.job_title ?? '职业未知'}，年收入约${male.annual_income ?? '未知'}万元
女方：${female.age ?? '未知'}岁，${female.city ?? '城市未知'}，${female.occupation ?? female.job_title ?? '职业未知'}，年收入约${female.annual_income ?? '未知'}万元
匹配分：${Math.round(score)}/100
只输出一句话，不要任何前缀。`,
        },
      ],
    })
  } catch {
    return ''
  }
}

export async function runMatchingForProfile(profileId: string): Promise<MatchRunResult> {
  const supabase = createServiceRoleClient()
  const matchThreshold = await getMatchThreshold()

  const [{ data: triggerProfile }, { data: triggerIntention }, { data: triggerTraitProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .eq('status', 'active')
      .single(),
    supabase
      .from('intentions')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle(),
    supabase
      .from('trait_profiles')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ])

  if (!triggerProfile) {
    return { matched: 0, created: 0, updated: 0, skipped: 0 }
  }

  const oppositeGender = triggerProfile.gender === 'male' ? 'female' : 'male'
  const { data: candidates } = await supabase
    .from('profiles')
    .select('*')
    .eq('gender', oppositeGender)
    .eq('status', 'active')
    .neq('id', profileId)

  if (!candidates?.length) {
    return { matched: 0, created: 0, updated: 0, skipped: 0 }
  }

  const trigger = toProfileWithIntention(triggerProfile, triggerIntention, triggerTraitProfile)
  const candidateIds = candidates.map((candidate) => candidate.id)

  const [
    { data: candidateIntentions },
    { data: candidateTraitProfiles },
    { data: existingMatches },
  ] = await Promise.all([
    supabase.from('intentions').select('*').in('profile_id', candidateIds),
    supabase.from('trait_profiles').select('*').in('profile_id', candidateIds),
    supabase
      .from('matches')
      .select('*')
      .or(`male_profile_id.eq.${profileId},female_profile_id.eq.${profileId}`),
  ])

  const intentionMap = new Map((candidateIntentions ?? []).map((item) => [item.profile_id, item]))
  const traitProfileMap = new Map((candidateTraitProfiles ?? []).map((item) => [item.profile_id, item]))
  const existingMatchMap = new Map(
    (existingMatches ?? []).map((match) => [getPairKey(match.male_profile_id, match.female_profile_id), match])
  )

  let created = 0
  let updated = 0
  let skipped = 0

  for (const candidateProfile of candidates) {
    const candidate = toProfileWithIntention(
      candidateProfile,
      intentionMap.get(candidateProfile.id) ?? null,
      traitProfileMap.get(candidateProfile.id) ?? null
    )

    const male = trigger.gender === 'male' ? trigger : candidate
    const female = trigger.gender === 'female' ? trigger : candidate

    const evaluation = calculateMatchScore(male, female)
    const pairKey = getPairKey(male.id, female.id)
    const existing = existingMatchMap.get(pairKey)

    if (!evaluation.qualifies || evaluation.total < matchThreshold) {
      if (existing) {
        await supabase
          .from('matches')
          .update({
            match_score: evaluation.total,
            score_breakdown: evaluation.breakdown,
            recommendation_type: 'rejected',
            pending_reasons: evaluation.pendingReasons,
            required_followup_fields: evaluation.requiredFollowupFields,
            suggested_followup_questions: evaluation.suggestedFollowupQuestions,
            match_reason: evaluation.hardConflicts[0] ?? existing.match_reason,
          })
          .eq('id', existing.id)

        await syncFollowupTask({
          supabase,
          matchmakerId: triggerProfile.matchmaker_id,
          profileId: female.id,
          matchId: existing.id,
          fieldKeys: [],
          questions: [],
          rationale: '候选已被排除，关闭待补问任务',
          taskType: 'relationship_followup',
        })
        updated += 1
      } else {
        skipped += 1
      }
      continue
    }

    const matchReason =
      evaluation.recommendationType === 'confirmed' && evaluation.total >= 75
        ? await generateMatchReason(male, female, evaluation.total)
        : evaluation.pendingReasons[0] ?? evaluation.breakdown.directional_notes[0] ?? ''

    const payload = {
      matchmaker_id: triggerProfile.matchmaker_id,
      match_score: evaluation.total,
      score_breakdown: evaluation.breakdown,
      recommendation_type: evaluation.recommendationType,
      pending_reasons: evaluation.pendingReasons,
      required_followup_fields: evaluation.requiredFollowupFields,
      suggested_followup_questions: evaluation.suggestedFollowupQuestions,
      match_reason: matchReason || null,
    }

    let matchId = existing?.id

    if (existing) {
      const { error } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', existing.id)

      if (error) throw new Error(error.message)
      updated += 1
    } else {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          male_profile_id: male.id,
          female_profile_id: female.id,
          status: 'pending',
          ...payload,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      matchId = data?.id
      created += 1
    }

    if (!matchId) continue

    await syncFollowupTask({
      supabase,
      matchmakerId: triggerProfile.matchmaker_id,
      profileId: female.id,
      matchId,
      fieldKeys:
        evaluation.recommendationType === 'pending_confirmation'
          ? evaluation.requiredFollowupFields
          : [],
      questions:
        evaluation.recommendationType === 'pending_confirmation'
          ? evaluation.suggestedFollowupQuestions
          : [],
      rationale:
        evaluation.recommendationType === 'pending_confirmation'
          ? '高分候选仍存在待确认敏感字段，需要线下补问'
          : '候选已确认，关闭待补问任务',
      taskType: 'relationship_followup',
    })
  }

  return {
    matched: created + updated,
    created,
    updated,
    skipped,
  }
}
