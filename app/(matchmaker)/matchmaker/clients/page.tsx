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
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#dfd0c0] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(252,247,241,0.98)_48%,rgba(247,238,229,0.95))] px-6 py-7 shadow-[0_26px_64px_-44px_rgba(35,24,21,0.48)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6d58]">Client Desk</p>
            <h2 className="mt-2 font-heading text-4xl text-[#231815]">我的客户</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b594c]">
              共 {profileRows.length} 位客户，当前男方 {maleCount} 位、女方 {femaleCount} 位。优先通过最新录音更新字段，再让 AI 继续推进匹配。
            </p>
          </div>

          <Link href="/matchmaker/clients/new">
            <Button className="h-11 rounded-[18px] px-4 shadow-[0_20px_40px_-28px_rgba(143,60,50,0.75)]">
              <Plus className="w-4 h-4" />
              新增客户
            </Button>
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterLink href="/matchmaker/clients" label="全部" active={!gender && !intent && !status} />
          <FilterLink href="/matchmaker/clients?gender=male" label="男方" active={gender === 'male'} />
          <FilterLink href="/matchmaker/clients?gender=female" label="女方" active={gender === 'female'} />
          <div className="mx-1 w-px bg-[#e6d7c8]" />
          <FilterLink href="/matchmaker/clients?intent=marriage" label="结婚意向" active={intent === 'marriage'} />
          <FilterLink href="/matchmaker/clients?intent=dating" label="恋爱意向" active={intent === 'dating'} />
          <FilterLink href="/matchmaker/clients?intent=fertility" label="生育目标" active={intent === 'fertility'} />
          <div className="mx-1 w-px bg-[#e6d7c8]" />
          <FilterLink href="/matchmaker/clients?status=active" label="活跃" active={status === 'active'} />
          <FilterLink href="/matchmaker/clients?status=matched" label="已匹配" active={status === 'matched'} />
          <FilterLink href="/matchmaker/clients?status=paused" label="暂停" active={status === 'paused'} />
        </div>

        {profilesError ? (
          <p className="mt-4 rounded-[18px] border border-[#ecd7c1] bg-[#fff7ef] px-4 py-3 text-sm text-[#9d6b42]">
            客户列表刚刚加载不完整，页面已经自动兜底。你可以刷新一次再看最新数据。
          </p>
        ) : null}
      </section>

      {!filtered.length ? (
        <div className="rounded-[28px] border border-dashed border-[#dacbbb] bg-white/70 py-20 text-center text-[#8a776a]">
          <User className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">暂无客户</p>
          <p className="mt-1 text-sm">点击右上角“新增客户”添加第一位客户</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${active ? 'border-[#8f3c32] bg-[#8f3c32] text-white hover:bg-[#7f342b]' : 'border-[#ddcbbb] bg-white/80 text-[#5f4d41] hover:bg-white'}`}
      >
        {label}
      </Badge>
    </Link>
  )
}
