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
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/matchmaker/matches" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ChevronLeft className="w-4 h-4" />
        返回匹配工作台
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">匹配详情</h1>
      <p className="text-gray-500 text-sm mb-6">
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
