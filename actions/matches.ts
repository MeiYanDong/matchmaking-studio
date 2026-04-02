'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MatchStatus } from '@/types/database'

export async function updateMatchStatus(matchId: string, updates: {
  status: MatchStatus
  matchmaker_notes?: string
  meeting_time?: string | null
  meeting_location?: string | null
  outcome_notes?: string | null
  dismissed_reason?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) throw new Error(error.message)
  revalidatePath('/matchmaker/matches')
  revalidatePath(`/matchmaker/matches/${matchId}`)
}

export async function addMatchNote(matchId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single()

  if (matchError || !match) throw new Error(matchError?.message || '匹配记录不存在')

  return updateMatchStatus(matchId, {
    status: match.status,
    matchmaker_notes: note,
  })
}

export async function dismissMatch(matchId: string, reason: string) {
  return updateMatchStatus(matchId, { status: 'dismissed', dismissed_reason: reason })
}
