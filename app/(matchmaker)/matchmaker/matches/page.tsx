import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Heart } from 'lucide-react'
import { RECOMMENDATION_TYPE_LABELS, ScoreBreakdown } from '@/types/app'
import { MatchCard } from '@/components/match/match-card'
import { Match, MatchStatus, Profile, RecommendationType } from '@/types/database'

const FILTER_TABS = [
  { label: '全部', value: '' },
  { label: '已确认', value: 'confirmed' },
  { label: '待确认', value: 'pending_confirmation' },
  { label: '待处理', value: 'pending' },
  { label: '跟进中', value: 'reviewing' },
  { label: '已约谈', value: 'meeting_scheduled,met' },
  { label: '已完成', value: 'succeeded,failed' },
]

const MATCH_STATUS_VALUES: MatchStatus[] = [
  'pending',
  'reviewing',
  'contacted_male',
  'contacted_female',
  'both_agreed',
  'meeting_scheduled',
  'met',
  'succeeded',
  'failed',
  'dismissed',
]

type MatchRow = Match & {
  male_profile: Pick<Profile, 'name' | 'age' | 'city'>
  female_profile: Pick<Profile, 'name' | 'age' | 'city'>
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('matches')
    .select('*, male_profile:profiles!matches_male_profile_id_fkey(*), female_profile:profiles!matches_female_profile_id_fkey(*)')
    .order('match_score', { ascending: false })

  // Status filter
  const isRecommendationFilter =
    params.status === 'confirmed' || params.status === 'pending_confirmation'

  const statuses = params.status && !isRecommendationFilter
    ? params.status.split(',').filter((status): status is MatchStatus => MATCH_STATUS_VALUES.includes(status as MatchStatus))
    : []

  if (isRecommendationFilter) {
    query = query.eq('recommendation_type', params.status as RecommendationType)
  } else if (statuses.length) {
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0])
    } else {
      query = query.in('status', statuses)
    }
  } else {
    // Default: exclude dismissed
    query = query.neq('status', 'dismissed')
  }

  const { data: matches } = await query
  const matchRows = (matches ?? []) as MatchRow[]

  const pendingCount = matchRows.filter(m => m.status === 'pending').length
  const confirmedCount = matchRows.filter((match) => match.recommendation_type === 'confirmed').length
  const pendingConfirmationCount = matchRows.filter((match) => match.recommendation_type === 'pending_confirmation').length
  const confirmedMatches = matchRows.filter((match) => match.recommendation_type === 'confirmed')
  const pendingConfirmationMatches = matchRows.filter((match) => match.recommendation_type === 'pending_confirmation')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">匹配工作台</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingCount > 0 && <span className="text-rose-500 font-medium">{pendingCount} 条待处理 · </span>}
            已确认 {confirmedCount} 条 · 待确认 {pendingConfirmationCount} 条
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/matchmaker/matches?status=${tab.value}` : '/matchmaker/matches'}
          >
            <Badge
              variant={params.status === tab.value || (!params.status && !tab.value) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1 text-sm ${params.status === tab.value || (!params.status && !tab.value) ? 'bg-rose-500 hover:bg-rose-600' : 'hover:bg-gray-100'}`}
            >
              {tab.label}
            </Badge>
          </Link>
        ))}
      </div>

      {!matchRows.length ? (
        <div className="text-center py-20 text-gray-400">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">暂无匹配推荐</p>
          <p className="text-sm mt-1">完善客户信息后，AI 将自动生成匹配推荐</p>
        </div>
      ) : (
        <div className="space-y-8">
          {confirmedMatches.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">已确认候选</h2>
                <p className="text-sm text-gray-500 mt-1">可直接推进的正式候选，前台主显 Top1，后台保留 Top3。</p>
              </div>
              <div className="space-y-3">
                {confirmedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={{
                      ...match,
                      score_breakdown: match.score_breakdown as ScoreBreakdown | null,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {pendingConfirmationMatches.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">待确认候选</h2>
                <p className="text-sm text-gray-500 mt-1">基础条件不错，但仍需线下补问确认敏感字段。</p>
              </div>
              <div className="space-y-3">
                {pendingConfirmationMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={{
                      ...match,
                      score_breakdown: match.score_breakdown as ScoreBreakdown | null,
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
