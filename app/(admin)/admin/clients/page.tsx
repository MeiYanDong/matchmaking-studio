import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { GENDER_LABELS, STATUS_LABELS, INTENT_LABELS } from '@/types/app'
import { GenderType, Intention, PrimaryIntent, Profile, ProfileStatus } from '@/types/database'
import Link from 'next/link'
import { User } from 'lucide-react'
import { AdminClientActions } from '@/components/admin/admin-client-actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const GENDER_VALUES: GenderType[] = ['male', 'female']
const INTENT_VALUES: PrimaryIntent[] = ['marriage', 'dating', 'fertility']
const STATUS_VALUES: ProfileStatus[] = ['active', 'inactive', 'matched', 'paused']

type ProfileListItem = Profile & {
  intentions: Intention[] | null
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gender?: string; city?: string; intent?: string; status?: string; matchmaker?: string }>
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

  if (roleData?.role !== 'admin') redirect('/matchmaker/clients')

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('profiles')
    .select('*, intentions(*)')
    .order('created_at', { ascending: false })

  const gender = GENDER_VALUES.find((value) => value === params.gender)
  const intent = INTENT_VALUES.find((value) => value === params.intent)
  const status = STATUS_VALUES.find((value) => value === params.status)

  if (params.q) query = query.ilike('name', `%${params.q}%`)
  if (gender) query = query.eq('gender', gender)
  if (params.city) query = query.eq('city', params.city)
  if (status) query = query.eq('status', status)
  if (params.matchmaker) query = query.eq('matchmaker_id', params.matchmaker)

  const [{ data: profiles }, { data: matchmakers }] = await Promise.all([
    query,
    supabase.from('user_roles').select('*').eq('role', 'matchmaker'),
  ])

  const profileRows = (profiles ?? []) as ProfileListItem[]

  const filteredProfiles = profileRows.filter((profile) => {
    if (!intent) return true
    return profile.intentions?.[0]?.primary_intent === intent
  })

  const matchmakerMap = new Map(matchmakers?.map((m) => [m.user_id, m.display_name]) ?? [])
  const cityOptions = Array.from(new Set(profileRows.map((profile) => profile.city).filter(Boolean))) as string[]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

      <form className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Input name="q" placeholder="搜索姓名" defaultValue={params.q ?? ''} />
        <Input name="city" placeholder="城市" defaultValue={params.city ?? ''} list="city-options" />
        <datalist id="city-options">
          {cityOptions.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <select name="gender" defaultValue={gender ?? ''} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">全部性别</option>
          <option value="male">男方</option>
          <option value="female">女方</option>
        </select>
        <select name="intent" defaultValue={intent ?? ''} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">全部意图</option>
          <option value="marriage">结婚</option>
          <option value="dating">恋爱</option>
          <option value="fertility">生育目标</option>
        </select>
        <select name="status" defaultValue={status ?? ''} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="matched">已匹配</option>
          <option value="paused">暂停</option>
          <option value="inactive">停用</option>
        </select>
        <div className="flex gap-2">
          <select name="matchmaker" defaultValue={params.matchmaker ?? ''} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm flex-1">
            <option value="">全部红娘</option>
            {(matchmakers ?? []).map((matchmaker) => (
              <option key={matchmaker.user_id} value={matchmaker.user_id}>
                {matchmaker.display_name}
              </option>
            ))}
          </select>
          <Button type="submit" className="bg-rose-500 hover:bg-rose-600">筛选</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">客户</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">性别/年龄/城市</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">意图</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">状态</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">负责红娘</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProfiles?.map(profile => {
              const intention = profile.intentions?.[0]
              return (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${profile.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                        <User className={`w-3.5 h-3.5 ${profile.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`} />
                      </div>
                      <Link href={`/matchmaker/clients/${profile.id}`} className="font-medium text-sm hover:text-rose-600">
                        {profile.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {GENDER_LABELS[profile.gender as GenderType]} · {profile.age ?? '-'}岁 · {profile.city ?? '-'}
                  </td>
                  <td className="py-3 px-4">
                    {intention?.primary_intent ? (
                      <Badge variant="outline" className="text-xs">{INTENT_LABELS[intention.primary_intent as PrimaryIntent]}</Badge>
                    ) : <span className="text-gray-300 text-xs">未设置</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {STATUS_LABELS[profile.status as ProfileStatus]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {matchmakerMap.get(profile.matchmaker_id) ?? '-'}
                  </td>
                  <td className="py-3 px-4">
                    <AdminClientActions
                      profileId={profile.id}
                      currentMatchmakerId={profile.matchmaker_id}
                      matchmakers={matchmakers?.map(m => ({ id: m.user_id, name: m.display_name })) ?? []}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filteredProfiles?.length && (
          <div className="text-center py-10 text-gray-400">暂无客户</div>
        )}
      </div>
    </div>
  )
}
