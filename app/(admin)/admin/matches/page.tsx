import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">匹配管理</h1>
        <p className="text-sm text-gray-500 mt-1">查看平台全部匹配进度与结果</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const active = (params.status === tab.value || (!params.status && !tab.value)) && !params.recommendation
          return (
            <Link key={tab.value || 'all'} href={tab.value ? `/admin/matches?status=${tab.value}` : '/admin/matches'}>
              <Badge
                variant={active ? 'default' : 'outline'}
                className={`cursor-pointer px-3 py-1 text-sm ${active ? 'bg-rose-500 hover:bg-rose-600' : 'hover:bg-gray-100'}`}
              >
                {tab.label}
              </Badge>
            </Link>
          )
        })}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
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
                variant={active ? 'default' : 'outline'}
                className={`cursor-pointer px-3 py-1 text-sm ${active ? 'bg-[#8f3c32] hover:bg-[#7f342b]' : 'hover:bg-gray-100'}`}
              >
                {tab.label}
              </Badge>
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">双方</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">匹配分</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">状态</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">更新时间</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">管理操作</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">详情</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matchRows.map((match) => (
              <tr key={match.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {match.male_profile.name} / {match.female_profile.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {[match.male_profile.city, match.female_profile.city].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-rose-500">
                  {Math.round(match.match_score)}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={match.status === 'succeeded' ? 'default' : 'outline'} className="text-xs">
                    {MATCH_STATUS_LABELS[match.status]}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
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
                  <Link href={`/matchmaker/matches/${match.id}`} className="text-sm text-rose-600 hover:text-rose-700">
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matchRows.length && (
          <div className="text-center py-10 text-gray-400">暂无匹配记录</div>
        )}
      </div>
    </div>
  )
}
