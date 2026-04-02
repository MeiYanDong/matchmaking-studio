import { NextRequest, NextResponse } from 'next/server'
import { generateClaudeText } from '@/lib/ai/client'
import { toUserFacingAIErrorMessage } from '@/lib/ai/provider-errors'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { calculateMatchScore } from '@/lib/matching/score'
import { Intention, Profile, TraitProfile } from '@/types/database'

type CandidateRow = Profile & {
  intentions: Intention[] | null
}

function getDiscoveryModel() {
  return process.env.CLAUDE_DISCOVERY_MODEL?.trim()
    || process.env.CLAUDE_DEFAULT_MODEL?.trim()
    || 'claude-sonnet-4-20250514'
}

async function parseNaturalLanguageQuery(query: string) {
  if (!query) return {}

  try {
    const text = await generateClaudeText({
      model: getDiscoveryModel(),
      maxTokens: 300,
      system: '你是婚恋偏好解析助手。请把自然语言需求解析成 JSON，只输出 JSON。',
      responseFormat: 'json_object',
      messages: [
        {
          role: 'user',
          content: `请从下面的择偶要求中提取结构化筛选条件，输出 JSON：
{
  "city": null,
  "ageMin": null,
  "ageMax": null,
  "minIncome": null,
  "education": null,
  "keywords": []
}

需求：${query}`,
        },
      ],
    })
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { query, ageMin, ageMax, city, intent } = await request.json()
    const parsed = await parseNaturalLanguageQuery(query || '')

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ error: '未绑定资料卡' }, { status: 404 })

    const { data: intentionData } = await supabase.from('intentions').select('*').eq('profile_id', profile.id).maybeSingle()
    const { data: myTraitProfile } = await supabase.from('trait_profiles').select('*').eq('profile_id', profile.id).maybeSingle()
    const oppositeGender = profile.gender === 'male' ? 'female' : 'male'

    let candidateQuery = supabase
      .from('profiles')
      .select('*, intentions(*)')
      .eq('gender', oppositeGender)
      .eq('status', 'active')

    const mergedCity = city || parsed.city
    if (mergedCity) candidateQuery = candidateQuery.eq('city', mergedCity)
    if (intent) candidateQuery = candidateQuery.eq('status', 'active')

    const { data: candidates } = await candidateQuery
    const candidateRows = (candidates ?? []) as CandidateRow[]
    const { data: candidateTraitProfiles } = await supabase
      .from('trait_profiles')
      .select('*')
      .in('profile_id', candidateRows.map((candidate) => candidate.id))
    const candidateTraitProfileMap = new Map(
      ((candidateTraitProfiles ?? []) as TraitProfile[]).map((item) => [item.profile_id, item])
    )

    const filtered = candidateRows
      .filter((candidate) => candidate.id !== profile.id)
      .filter((candidate) => {
        const candidateIntention = candidate.intentions?.[0]
        const candidateAge = candidate.age ?? 0
        const lowerAge = Number(ageMin || parsed.ageMin || 0)
        const upperAge = Number(ageMax || parsed.ageMax || 0)
        const minIncome = Number(parsed.minIncome || 0)
        if (lowerAge && candidateAge && candidateAge < lowerAge) return false
        if (upperAge && candidateAge && candidateAge > upperAge) return false
        if (parsed.education && candidate.education && candidate.education !== parsed.education) return false
        if (minIncome && candidate.annual_income && candidate.annual_income < minIncome) return false
        if (intent && candidateIntention?.primary_intent !== intent) return false
        return true
      })
      .map((candidate) => {
        const candidateIntention = candidate.intentions?.[0] ?? null
        const me = { ...profile, intention: intentionData ?? null, traitProfile: myTraitProfile ?? null }
        const other = {
          ...candidate,
          intention: candidateIntention,
          traitProfile: candidateTraitProfileMap.get(candidate.id) ?? null,
        }
        const evaluation = profile.gender === 'male'
          ? calculateMatchScore(me, other)
          : calculateMatchScore(other, me)

        return {
          ...candidate,
          intentions: candidate.intentions,
          score: evaluation.total,
          passed: evaluation.qualifies,
          recommendation_type: evaluation.recommendationType,
        }
      })
      .filter((candidate) => candidate.passed)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    return NextResponse.json({ candidates: filtered })
  } catch (error) {
    const message = error instanceof Error
      ? toUserFacingAIErrorMessage(error.message, '解析筛选条件失败')
      : '解析筛选条件失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
