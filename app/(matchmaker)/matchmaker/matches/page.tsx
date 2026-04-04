import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { CollectionPageTemplate } from '@/components/layouts/collection-page-template'
import { EmptyState } from '@/components/app-primitives'
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
    <CollectionPageTemplate
      eyebrow="Matching Desk"
      title="匹配工作台"
      description={`${pendingCount > 0 ? `${pendingCount} 条待处理 · ` : ''}已确认 ${confirmedCount} 条 · 待确认 ${pendingConfirmationCount} 条`}
      filters={
        <>
          {FILTER_TABS.map(tab => (
            <Link
              key={tab.value}
              href={tab.value ? `/matchmaker/matches?status=${tab.value}` : '/matchmaker/matches'}
            >
              <Badge
                variant={params.status === tab.value || (!params.status && !tab.value) ? 'secondary' : 'outline'}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${params.status === tab.value || (!params.status && !tab.value) ? 'border-primary/10 bg-primary text-white hover:bg-primary/92' : 'border-border/80 bg-[color:var(--surface-soft-strong)] text-foreground/70 hover:bg-[color:var(--surface-contrast)] hover:text-foreground'}`}
              >
                {tab.label}
              </Badge>
            </Link>
          ))}
        </>
      }
      isEmpty={!matchRows.length}
      emptyState={{
        title: '暂无匹配推荐',
        description: '完善客户信息后，AI 会自动补齐字段、生成候选并给出推进建议。',
        action: (
          <Link href="/matchmaker/clients">
            <Button variant="outline">
              <Heart className="h-4 w-4" />
              去查看客户
            </Button>
          </Link>
        ),
      }}
    >
      <div className="space-y-8">
          {confirmedMatches.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-foreground">已确认候选</h2>
                <p className="mt-1 text-sm text-muted-foreground">可直接推进的正式候选，主显 Top1，并保留另外 2 条高优先级候补。</p>
              </div>
              <div className="space-y-4">
                {topConfirmed ? (
                  <section className="rounded-[28px] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,250,255,0.95)_52%,rgba(241,246,252,0.93))] p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.16)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Top 1 Confirmed</p>
                        <h3 className="mt-2 font-heading text-2xl text-foreground">最值得立即推进的候选</h3>
                      </div>
                      <Badge className="border border-border/80 bg-white/85 px-3 py-1 text-xs tracking-[0.12em] text-muted-foreground">
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
                      <h3 className="text-sm font-medium text-foreground">Top 3 候补</h3>
                      <span className="text-xs text-muted-foreground">保留给红娘继续比对与推进节奏判断</span>
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
                <h2 className="font-semibold text-foreground">待确认候选</h2>
                <p className="mt-1 text-sm text-muted-foreground">基础条件不错，但仍需线下补问确认敏感字段，先看 Top1 再保留最多 2 条候补。</p>
              </div>
              <div className="space-y-4">
                {topPending ? (
                  <section className="rounded-[28px] border border-primary/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(243,247,255,0.94)_55%,rgba(236,243,255,0.92))] p-5 shadow-[0_24px_60px_-42px_rgba(59,130,246,0.12)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Top 1 Pending</p>
                        <h3 className="mt-2 font-heading text-2xl text-foreground">最值得优先补问的候选</h3>
                      </div>
                      <Badge className="border border-primary/10 bg-white/90 px-3 py-1 text-xs tracking-[0.12em] text-primary">
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
                      <h3 className="text-sm font-medium text-foreground">待确认候补</h3>
                      <span className="text-xs text-muted-foreground">优先围绕敏感字段补问，再决定是否升级为已确认候选</span>
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
    </CollectionPageTemplate>
  )
}
