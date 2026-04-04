import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MatchDetailClient } from '@/components/match/match-detail-client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  const [
    { data: maleProfile },
    { data: femaleProfile },
    { data: maleIntention },
    { data: femaleIntention },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', match.male_profile_id).single(),
    supabase.from('profiles').select('*').eq('id', match.female_profile_id).single(),
    supabase.from('intentions').select('*').eq('profile_id', match.male_profile_id).single(),
    supabase.from('intentions').select('*').eq('profile_id', match.female_profile_id).single(),
  ])

  if (!maleProfile || !femaleProfile) notFound()

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href="/matchmaker/matches" className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground dark:text-foreground/58 dark:hover:text-foreground">
        <ChevronLeft className="w-4 h-4" />
        返回匹配工作台
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-foreground">匹配详情</h1>
      <p className="mb-6 text-sm text-muted-foreground dark:text-foreground/60">
        {maleProfile.name} · {femaleProfile.name}
      </p>
      <MatchDetailClient
        match={match}
        maleProfile={maleProfile}
        femaleProfile={femaleProfile}
        maleIntention={maleIntention}
        femaleIntention={femaleIntention}
      />
    </div>
  )
}
