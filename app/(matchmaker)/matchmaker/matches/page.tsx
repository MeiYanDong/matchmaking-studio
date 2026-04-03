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
  const topConfirmed = confirmedMatches[0] ?? null
  const supportingConfirmed = topConfirmed ? confirmedMatches.slice(1, 3) : confirmedMatches.slice(0, 3)
  const topPending = pendingConfirmationMatches[0] ?? null
  const supportingPending = topPending ? pendingConfirmationMatches.slice(1, 3) : pendingConfirmationMatches.slice(0, 3)

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#dfd0c0] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(252,247,241,0.98)_48%,rgba(247,238,229,0.95))] px-6 py-7 shadow-[0_26px_64px_-44px_rgba(35,24,21,0.48)]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6d58]">Matching Desk</p>
          <h2 className="mt-2 font-heading text-4xl text-[#231815]">匹配工作台</h2>
          <p className="mt-3 text-sm leading-7 text-[#6b594c]">
            {pendingCount > 0 && <span className="font-medium text-[#8f3c32]">{pendingCount} 条待处理 · </span>}
            已确认 {confirmedCount} 条 · 待确认 {pendingConfirmationCount} 条
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
        {FILTER_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/matchmaker/matches?status=${tab.value}` : '/matchmaker/matches'}
          >
            <Badge
              variant={params.status === tab.value || (!params.status && !tab.value) ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${params.status === tab.value || (!params.status && !tab.value) ? 'border-[#8f3c32] bg-[#8f3c32] text-white hover:bg-[#7f342b]' : 'border-[#ddcbbb] bg-white/80 text-[#5f4d41] hover:bg-white'}`}
            >
              {tab.label}
            </Badge>
          </Link>
        ))}
        </div>
      </section>

      {!matchRows.length ? (
        <div className="rounded-[28px] border border-dashed border-[#dacbbb] bg-white/70 py-20 text-center text-[#8a776a]">
          <Heart className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">暂无匹配推荐</p>
          <p className="mt-1 text-sm">完善客户信息后，AI 将自动生成匹配推荐</p>
        </div>
      ) : (
        <div className="space-y-8">
          {confirmedMatches.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">已确认候选</h2>
                <p className="text-sm text-gray-500 mt-1">可直接推进的正式候选，主显 Top1，并保留另外 2 条高优先级候补。</p>
              </div>
              <div className="space-y-4">
                {topConfirmed ? (
                  <section className="rounded-[28px] border border-[#d8c1ae] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(251,243,234,0.94)_52%,rgba(246,234,221,0.92))] p-5 shadow-[0_24px_60px_-42px_rgba(35,24,21,0.4)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e6e54]">Top 1 Confirmed</p>
                        <h3 className="mt-2 font-heading text-2xl text-[#231815]">最值得立即推进的候选</h3>
                      </div>
                      <Badge className="border border-[#d8c1ae] bg-white/85 px-3 py-1 text-xs tracking-[0.12em] text-[#7b5f4b]">
                        {RECOMMENDATION_TYPE_LABELS.confirmed}
                      </Badge>
                    </div>
                    <MatchCard
                      match={{
                        ...topConfirmed,
                        score_breakdown: topConfirmed.score_breakdown as ScoreBreakdown | null,
                      }}
                    />
                  </section>
                ) : null}

                {supportingConfirmed.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[#251a14]">Top 3 候补</h3>
                      <span className="text-xs text-[#8b6d58]">保留给红娘继续比对与推进节奏判断</span>
                    </div>
                    <div className="space-y-3">
                      {supportingConfirmed.map((match) => (
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
                ) : null}
              </div>
            </section>
          )}

          {pendingConfirmationMatches.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-900">待确认候选</h2>
                <p className="text-sm text-gray-500 mt-1">基础条件不错，但仍需线下补问确认敏感字段，先看 Top1 再保留最多 2 条候补。</p>
              </div>
              <div className="space-y-4">
                {topPending ? (
                  <section className="rounded-[28px] border border-[#e2c98f] bg-[linear-gradient(145deg,rgba(255,251,243,0.96),rgba(255,246,227,0.94)_55%,rgba(250,238,210,0.92))] p-5 shadow-[0_24px_60px_-42px_rgba(91,63,22,0.28)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e6e54]">Top 1 Pending</p>
                        <h3 className="mt-2 font-heading text-2xl text-[#231815]">最值得优先补问的候选</h3>
                      </div>
                      <Badge className="border border-[#e3cfaa] bg-white/90 px-3 py-1 text-xs tracking-[0.12em] text-[#8f6b2f]">
                        {RECOMMENDATION_TYPE_LABELS.pending_confirmation}
                      </Badge>
                    </div>
                    <MatchCard
                      match={{
                        ...topPending,
                        score_breakdown: topPending.score_breakdown as ScoreBreakdown | null,
                      }}
                    />
                  </section>
                ) : null}

                {supportingPending.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[#251a14]">待确认候补</h3>
                      <span className="text-xs text-[#8b6d58]">优先围绕敏感字段补问，再决定是否升级为已确认候选</span>
                    </div>
                    <div className="space-y-3">
                      {supportingPending.map((match) => (
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
                ) : null}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
