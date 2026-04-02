import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddMatchmakerForm } from '@/components/admin/add-matchmaker-form'
import { Badge } from '@/components/ui/badge'
import { UserCog } from 'lucide-react'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { ToggleMatchmakerStatus } from '@/components/admin/toggle-matchmaker-status'
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/supabase/env'

export default async function AdminMatchmakersPage() {
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

  const { data: matchmakers } = await supabase
    .from('user_roles')
    .select('*')
    .eq('role', 'matchmaker')

  const adminSupabase = createSupabaseAdmin(
    supabaseUrl,
    supabaseServiceRoleKey
  )
  const { data: authUsersData } = await adminSupabase.auth.admin.listUsers()
  const authUserMap = new Map(
    (authUsersData?.users ?? []).map((authUser) => [
      authUser.id,
      {
        email: authUser.email ?? '',
        disabled: Boolean(authUser.banned_until && new Date(authUser.banned_until) > new Date()),
      },
    ])
  )

  // Get client counts per matchmaker
  const matchmakerIds = matchmakers?.map(m => m.user_id) ?? []
  const { data: profileCounts } = await supabase
    .from('profiles')
    .select('matchmaker_id')
    .in('matchmaker_id', matchmakerIds)

  const { data: matchCounts } = await supabase
    .from('matches')
    .select('matchmaker_id, status, updated_at')
    .in('matchmaker_id', matchmakerIds)

  const clientCountMap = profileCounts?.reduce((acc, p) => {
    acc[p.matchmaker_id] = (acc[p.matchmaker_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const activeMatchMap = matchCounts?.reduce((acc, m) => {
    if (!['failed', 'dismissed', 'succeeded'].includes(m.status)) {
      acc[m.matchmaker_id] = (acc[m.matchmaker_id] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>) ?? {}

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const successMap = matchCounts?.reduce((acc, m) => {
    if (m.status === 'succeeded' && new Date(m.updated_at) >= monthStart) {
      acc[m.matchmaker_id] = (acc[m.matchmaker_id] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>) ?? {}

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">红娘管理</h1>
        <AddMatchmakerForm />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">红娘</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">邮箱</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">客户数</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">活跃匹配</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">本月成功数</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">加入时间</th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matchmakers?.map(m => {
              const authInfo = authUserMap.get(m.user_id)
              return (
              <tr key={m.user_id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <UserCog className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="font-medium text-sm">{m.display_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">{authInfo?.email || '-'}</td>
                <td className="py-3 px-4 text-sm text-gray-700 font-medium">{clientCountMap[m.user_id] ?? 0} 位</td>
                <td className="py-3 px-4 text-sm text-gray-700">{activeMatchMap[m.user_id] ?? 0} 条</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 text-xs">
                    {successMap[m.user_id] ?? 0} 对
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={authInfo?.disabled ? 'secondary' : 'default'} className="text-xs">
                      {authInfo?.disabled ? '已禁用' : '启用中'}
                    </Badge>
                    <ToggleMatchmakerStatus userId={m.user_id} disabled={Boolean(authInfo?.disabled)} />
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {!matchmakers?.length && (
          <div className="text-center py-10 text-gray-400">暂无红娘</div>
        )}
      </div>
    </div>
  )
}
