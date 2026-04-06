import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, User } from 'lucide-react'
import { ClientCard } from '@/components/client/client-card'
import { CollectionPageTemplate } from '@/components/layouts/collection-page-template'
import { MetricCard } from '@/components/app-primitives'
import { GenderType, Intention, PrimaryIntent, Profile, ProfileStatus } from '@/types/database'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

const GENDER_VALUES: GenderType[] = ['male', 'female']
const INTENT_VALUES: PrimaryIntent[] = ['marriage', 'dating', 'fertility']
const STATUS_VALUES: ProfileStatus[] = ['active', 'paused', 'matched_dating', 'matched_married', 'withdrawn']

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
    <CollectionPageTemplate
      eyebrow="Client Desk"
      title="我的客户"
      description={`共 ${profileRows.length} 位客户，当前男方 ${maleCount} 位、女方 ${femaleCount} 位。优先通过最新录音更新字段，再让 AI 继续推进匹配。`}
      actions={
        <Link href="/matchmaker/clients/new">
          <Button>
            <Plus className="h-4 w-4" />
            新增客户
          </Button>
        </Link>
      }
      filters={
        <>
          <FilterLink href="/matchmaker/clients" label="全部" active={!gender && !intent && !status} />
          <FilterLink href="/matchmaker/clients?gender=male" label="男方" active={gender === 'male'} />
          <FilterLink href="/matchmaker/clients?gender=female" label="女方" active={gender === 'female'} />
          <div className="mx-1 my-1 hidden h-5 w-px bg-border sm:block" />
          <FilterLink href="/matchmaker/clients?intent=marriage" label="结婚意向" active={intent === 'marriage'} />
          <FilterLink href="/matchmaker/clients?intent=dating" label="恋爱意向" active={intent === 'dating'} />
          <FilterLink href="/matchmaker/clients?intent=fertility" label="生育目标" active={intent === 'fertility'} />
          <div className="mx-1 my-1 hidden h-5 w-px bg-border sm:block" />
          <FilterLink href="/matchmaker/clients?status=active" label="活跃" active={status === 'active'} />
          <FilterLink href="/matchmaker/clients?status=paused" label="暂停" active={status === 'paused'} />
          <FilterLink href="/matchmaker/clients?status=matched_dating" label="已匹配（恋爱中）" active={status === 'matched_dating'} />
          <FilterLink href="/matchmaker/clients?status=matched_married" label="已匹配（已婚）" active={status === 'matched_married'} />
          <FilterLink href="/matchmaker/clients?status=withdrawn" label="退档" active={status === 'withdrawn'} />
        </>
      }
      heroFooter={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="客户总量" value={String(profileRows.length)} hint="当前由你负责推进的全部客户数。" />
          <MetricCard label="女方数量" value={String(femaleCount)} hint="优先通过最新录音补齐择偶与生活方式信息。" />
          <MetricCard label="男方数量" value={String(maleCount)} hint="先建档，再推进关系模式和后续匹配。" />
        </div>
      }
      emptyState={{
        title: '暂无客户',
        description: '点击右上角“新增客户”，先创建草稿客户，再通过录音让系统自动补全档案。',
        action: (
          <Link href="/matchmaker/clients/new">
            <Button variant="outline">
              <User className="h-4 w-4" />
              去新增客户
            </Button>
          </Link>
        ),
      }}
      isEmpty={!filtered.length}
    >
      <>
        {profilesError ? (
          <p className="rounded-[1.35rem] border border-primary/10 bg-primary/8 px-4 py-3 text-sm text-primary">
            客户列表刚刚加载不完整，页面已经自动兜底。你可以刷新一次再看最新数据。
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((profile) => {
            return <ClientCard key={profile.id} profile={profile} />
          })}
        </div>
      </>
    </CollectionPageTemplate>
  )
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <Badge
        variant={active ? 'secondary' : 'outline'}
        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${active ? 'border-primary/12 bg-primary text-primary-foreground shadow-[0_14px_26px_-18px_rgba(11,99,246,0.52)] hover:bg-[color:var(--primary-strong)] dark:border-primary/14 dark:shadow-[0_16px_34px_-22px_rgba(82,145,243,0.56)]' : 'border-border/80 bg-[color:var(--surface-soft)] text-foreground/68 hover:bg-[color:var(--surface-soft-strong)] hover:text-foreground dark:border-border/70 dark:bg-[color:var(--surface-soft)] dark:text-foreground/62 dark:hover:bg-[color:var(--surface-contrast)] dark:hover:text-foreground'}`}
      >
        {label}
      </Badge>
    </Link>
  )
}
