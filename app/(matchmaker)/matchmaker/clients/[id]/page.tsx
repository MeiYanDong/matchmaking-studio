import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClientTabs } from '@/components/client/client-tabs'
import { ProfileCard } from '@/components/client/profile-card'
import Link from 'next/link'
import { ChevronLeft, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSessionUser()
  const supabase = await createClient()
  const [
    profileResult,
    intentionResult,
    traitProfileResult,
    conversationsResult,
    matchesResult,
    followupTasksResult,
  ] = await Promise.all([
    withSupabaseRetry(() => supabase.from('profiles').select('*').eq('id', id).single(), { label: 'client detail profile query' }),
    withSupabaseRetry(() => supabase.from('intentions').select('*').eq('profile_id', id).single(), { label: 'client detail intention query' }),
    withSupabaseRetry(() => supabase.from('trait_profiles').select('*').eq('profile_id', id).maybeSingle(), { label: 'client detail trait profile query' }),
    withSupabaseRetry(() => supabase.from('conversations').select('*').eq('profile_id', id).order('created_at', { ascending: false }), { label: 'client detail conversations query' }),
    withSupabaseRetry(
      () => supabase
        .from('matches')
        .select('*, male_profile:profiles!matches_male_profile_id_fkey(*), female_profile:profiles!matches_female_profile_id_fkey(*)')
        .or(`male_profile_id.eq.${id},female_profile_id.eq.${id}`)
        .order('match_score', { ascending: false }),
      { label: 'client detail matches query' }
    ),
    withSupabaseRetry(() => supabase.from('followup_tasks').select('*').eq('profile_id', id).order('updated_at', { ascending: false }), { label: 'client detail followup tasks query' }),
  ])

  if (profileResult.error) {
    throw new Error(`加载客户详情失败: ${profileResult.error.message}`)
  }

  const { data: profile } = profileResult
  const { data: intention } = intentionResult
  const { data: traitProfile } = traitProfileResult
  const { data: conversations } = conversationsResult
  const { data: matches } = matchesResult
  const { data: followupTasks } = followupTasksResult

  if (!profile) notFound()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/matchmaker/clients" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4">
        <ChevronLeft className="w-4 h-4" />
        返回客户列表
      </Link>

      {/* Profile header */}
      <div className="mb-6">
        <ProfileCard profile={profile} intention={intention} printable />
      </div>

      {/* Upload shortcut */}
      <div className="flex justify-end mb-4">
        <Link href={`/matchmaker/clients/${id}/upload`}>
          <Button variant="outline" size="sm" className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50">
            <Mic className="w-4 h-4" />上传新录音
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <ClientTabs
        profile={profile}
        intention={intention}
        traitProfile={traitProfile}
        conversations={conversations ?? []}
        matches={(matches as any) ?? []}
        followupTasks={followupTasks ?? []}
      />
    </div>
  )
}
