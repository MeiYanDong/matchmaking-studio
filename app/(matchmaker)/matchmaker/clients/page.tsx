import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, User } from 'lucide-react'
import { ClientCard } from '@/components/client/client-card'
import { GenderType, Intention, PrimaryIntent, Profile, ProfileStatus } from '@/types/database'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

const GENDER_VALUES: GenderType[] = ['male', 'female']
const INTENT_VALUES: PrimaryIntent[] = ['marriage', 'dating', 'fertility']
const STATUS_VALUES: ProfileStatus[] = ['active', 'inactive', 'matched', 'paused']

type ProfileListItem = Profile & {
  intentions: Intention[] | null
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; intent?: string; status?: string }>
}) {
  const user = await requireSessionUser()
  const supabase = await createClient()
  const params = await searchParams
  const gender = GENDER_VALUES.find((value) => value === params.gender)
  const intent = INTENT_VALUES.find((value) => value === params.intent)
  const status = STATUS_VALUES.find((value) => value === params.status)

  const { data: profiles, error: profilesError } = await withSupabaseRetry(() => {
    let query = supabase
      .from('profiles')
      .select('*, intentions(*)')
      .eq('matchmaker_id', user.id)
      .order('created_at', { ascending: false })

    if (gender) query = query.eq('gender', gender)
    if (status) query = query.eq('status', status)

    return query
  }, { label: 'matchmaker clients list query' })
  const profileRows = (profiles ?? []) as ProfileListItem[]

  // Filter by intent in JS (since it's a join)
  const filtered = profileRows.filter(p => {
    if (!intent) return true
    return p.intentions?.[0]?.primary_intent === intent
  })

  const maleCount = profileRows.filter(p => p.gender === 'male').length
  const femaleCount = profileRows.filter(p => p.gender === 'female').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的客户</h1>
          <p className="text-gray-500 text-sm mt-1">
            共 {profileRows.length} 位客户 · 男方 {maleCount} 位 · 女方 {femaleCount} 位
          </p>
          {profilesError ? (
            <p className="text-amber-600 text-sm mt-2">
              客户列表刚刚加载不完整，页面已经自动兜底。你可以刷新一次再看最新数据。
            </p>
          ) : null}
        </div>
        <Link href="/matchmaker/clients/new">
          <Button className="bg-rose-500 hover:bg-rose-600 gap-2">
            <Plus className="w-4 h-4" />
            新增客户
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterLink href="/matchmaker/clients" label="全部" active={!gender && !intent && !status} />
        <FilterLink href="/matchmaker/clients?gender=male" label="男方" active={gender === 'male'} />
        <FilterLink href="/matchmaker/clients?gender=female" label="女方" active={gender === 'female'} />
        <div className="w-px bg-gray-200 mx-1" />
        <FilterLink href="/matchmaker/clients?intent=marriage" label="结婚意向" active={intent === 'marriage'} />
        <FilterLink href="/matchmaker/clients?intent=dating" label="恋爱意向" active={intent === 'dating'} />
        <FilterLink href="/matchmaker/clients?intent=fertility" label="生育目标" active={intent === 'fertility'} />
        <div className="w-px bg-gray-200 mx-1" />
        <FilterLink href="/matchmaker/clients?status=active" label="活跃" active={status === 'active'} />
        <FilterLink href="/matchmaker/clients?status=matched" label="已匹配" active={status === 'matched'} />
        <FilterLink href="/matchmaker/clients?status=paused" label="暂停" active={status === 'paused'} />
      </div>

      {/* Client grid */}
      {!filtered.length ? (
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">暂无客户</p>
          <p className="text-sm mt-1">点击右上角"新增客户"添加第一位客户</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => {
            return <ClientCard key={profile.id} profile={profile} />
          })}
        </div>
      )}
    </div>
  )
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <Badge
        variant={active ? 'default' : 'outline'}
        className={`cursor-pointer px-3 py-1 text-sm ${active ? 'bg-rose-500 hover:bg-rose-600' : 'hover:bg-gray-100'}`}
      >
        {label}
      </Badge>
    </Link>
  )
}
