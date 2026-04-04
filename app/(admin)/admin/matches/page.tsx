import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CollectionPageTemplate } from '@/components/layouts/collection-page-template'
import { MATCH_STATUS_LABELS } from '@/types/app'
import { Match, MatchStatus, Profile, RecommendationType } from '@/types/database'
import { AdminMatchActions } from '@/components/admin/admin-match-actions'

const FILTER_TABS = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '跟进中', value: 'reviewing,contacted_male,contacted_female,both_agreed' },
  { label: '已约谈', value: 'meeting_scheduled,met' },
  { label: '已完成', value: 'succeeded,failed,dismissed' },
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
  male_profile: Pick<Profile, 'name' | 'city' | 'age'>
  female_profile: Pick<Profile, 'name' | 'city' | 'age'>
}

const RECOMMENDATION_VALUES: RecommendationType[] = ['confirmed', 'pending_confirmation', 'rejected']

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; recommendation?: string }>
}) {
  const params = await searchParams
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await authClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') {
    redirect('/matchmaker/matches')
  }

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('matches')
    .select('*, male_profile:profiles!matches_male_profile_id_fkey(name, city, age), female_profile:profiles!matches_female_profile_id_fkey(name, city, age)')
    .order('updated_at', { ascending: false })

  const statuses = params.status
    ? params.status.split(',').filter((status): status is MatchStatus => MATCH_STATUS_VALUES.includes(status as MatchStatus))
    : []
  const recommendation = RECOMMENDATION_VALUES.find((value) => value === params.recommendation)

  if (statuses.length) {
    query = statuses.length === 1 ? query.eq('status', statuses[0]) : query.in('status', statuses)
  }
  if (recommendation) {
    query = query.eq('recommendation_type', recommendation)
  }

  const [{ data: matches }, { data: matchmakers }] = await Promise.all([
    query,
    supabase.from('user_roles').select('user_id, display_name').eq('role', 'matchmaker'),
  ])

  const matchRows = (matches ?? []) as MatchRow[]

  return (
    <CollectionPageTemplate
      eyebrow="Governance"
      title="匹配管理"
      description="查看平台全部匹配进度与结果，并对管理动作进行统一治理。"
      filters={
        <>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => {
              const active = (params.status === tab.value || (!params.status && !tab.value)) && !params.recommendation
              return (
                <Link key={tab.value || 'all'} href={tab.value ? `/admin/matches?status=${tab.value}` : '/admin/matches'}>
                  <Badge
                    variant={active ? 'secondary' : 'outline'}
                    className={`cursor-pointer px-3 py-1 text-sm ${active ? 'bg-primary text-white hover:bg-primary/92' : 'hover:bg-muted'}`}
                  >
                    {tab.label}
                  </Badge>
                </Link>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '全部候选', value: '' },
              { label: '已确认候选', value: 'confirmed' },
              { label: '待确认候选', value: 'pending_confirmation' },
              { label: '已排除', value: 'rejected' },
            ].map((tab) => {
              const active = params.recommendation === tab.value || (!params.recommendation && !tab.value)
              const href = tab.value
                ? `/admin/matches?recommendation=${tab.value}${params.status ? `&status=${params.status}` : ''}`
                : `/admin/matches${params.status ? `?status=${params.status}` : ''}`
              return (
                <Link key={tab.value || 'all-recommendations'} href={href}>
                  <Badge
                    variant={active ? 'secondary' : 'outline'}
                    className={`cursor-pointer px-3 py-1 text-sm ${active ? 'bg-primary text-white hover:bg-primary/92' : 'hover:bg-muted'}`}
                  >
                    {tab.label}
                  </Badge>
                </Link>
              )
            })}
          </div>
        </>
      }
    >
      <div className="overflow-hidden rounded-[28px] border border-border/80 bg-white shadow-[0_24px_56px_-44px_rgba(15,23,42,0.16)]">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">双方</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">匹配分</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">更新时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">管理操作</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">详情</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {matchRows.map((match) => (
              <tr key={match.id} className="hover:bg-muted/35">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-foreground">
                    {match.male_profile.name} / {match.female_profile.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[match.male_profile.city, match.female_profile.city].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-primary">
                  {Math.round(match.match_score)}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={match.status === 'succeeded' ? 'secondary' : 'outline'} className="text-xs">
                    {MATCH_STATUS_LABELS[match.status]}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {new Date(match.updated_at).toLocaleString('zh-CN')}
                </td>
                <td className="py-3 px-4">
                  <AdminMatchActions
                    matchId={match.id}
                    currentStatus={match.status}
                    currentMatchmakerId={match.matchmaker_id}
                    matchmakers={(matchmakers ?? []).map((matchmaker) => ({
                      id: matchmaker.user_id,
                      name: matchmaker.display_name,
                    }))}
                  />
                </td>
                <td className="py-3 px-4">
                  <Link href={`/matchmaker/matches/${match.id}`} className="text-sm text-primary hover:text-primary/80">
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matchRows.length && (
          <div className="py-10 text-center text-muted-foreground">暂无匹配记录</div>
        )}
      </div>
    </CollectionPageTemplate>
  )
}
