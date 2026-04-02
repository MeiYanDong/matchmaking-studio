import { createServiceRoleClient } from '@/lib/supabase/server'
import { Match, Profile } from '@/types/database'

const NO_FOLLOWUP_DAYS = 7
const NO_NEW_INFO_DAYS = 30
const MEETING_REMINDER_HOURS = 24

type ReminderMatchRow = Match & {
  male_profile: Pick<Profile, 'name'>
  female_profile: Pick<Profile, 'name'>
}

type ReminderProfileRow = Pick<Profile, 'id' | 'name' | 'matchmaker_id'>

export async function checkNoFollowup() {
  const supabase = createServiceRoleClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NO_FOLLOWUP_DAYS)

  // 查询超过7天未更新的活跃匹配
  const { data: staleMatches } = await supabase
    .from('matches')
    .select('*, male_profile:profiles!matches_male_profile_id_fkey(name), female_profile:profiles!matches_female_profile_id_fkey(name)')
    .not('status', 'in', '("succeeded","failed","dismissed")')
    .lt('updated_at', cutoff.toISOString())

  const staleMatchRows = (staleMatches ?? []) as ReminderMatchRow[]

  for (const match of staleMatchRows) {
    // 检查是否已有同类未读提醒
    const { count } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('type', 'no_followup')
      .eq('is_read', false)

    if ((count ?? 0) > 0) continue

    await supabase.from('reminders').insert({
      matchmaker_id: match.matchmaker_id,
      match_id: match.id,
      type: 'no_followup',
      message: `${(match.male_profile as any).name} 与 ${(match.female_profile as any).name} 的匹配已超过 ${NO_FOLLOWUP_DAYS} 天未跟进，是否需要联系？`,
    })
  }
}

export async function checkNoNewInfo() {
  const supabase = createServiceRoleClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NO_NEW_INFO_DAYS)

  // 查询超过30天无新录音的客户
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, matchmaker_id')
    .eq('status', 'active')

  const profileRows = (profiles ?? []) as ReminderProfileRow[]

  for (const profile of profileRows) {
    // 检查最新录音时间
    const { data: latestConv } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastDate = latestConv?.created_at ?? null
    if (lastDate && new Date(lastDate) > cutoff) continue

    // 检查是否已有未读提醒
    const { count } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('type', 'no_new_info')
      .eq('is_read', false)

    if ((count ?? 0) > 0) continue

    await supabase.from('reminders').insert({
      matchmaker_id: profile.matchmaker_id,
      profile_id: profile.id,
      type: 'no_new_info',
      message: `${profile.name} 的信息已超过 ${NO_NEW_INFO_DAYS} 天未更新，是否需要安排约谈？`,
    })
  }
}

export async function checkMeetingReminder() {
  const supabase = createServiceRoleClient()

  const now = new Date()
  const future = new Date()
  future.setHours(future.getHours() + MEETING_REMINDER_HOURS)

  const { data: upcomingMeetings } = await supabase
    .from('matches')
    .select('*, male_profile:profiles!matches_male_profile_id_fkey(name), female_profile:profiles!matches_female_profile_id_fkey(name)')
    .eq('status', 'meeting_scheduled')
    .gte('meeting_time', now.toISOString())
    .lte('meeting_time', future.toISOString())

  const upcomingMeetingRows = (upcomingMeetings ?? []) as ReminderMatchRow[]

  for (const match of upcomingMeetingRows) {
    const { count } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('type', 'meeting_reminder')
      .eq('is_read', false)

    if ((count ?? 0) > 0) continue

    const meetingTime = new Date(match.meeting_time!).toLocaleString('zh-CN')
    await supabase.from('reminders').insert({
      matchmaker_id: match.matchmaker_id,
      match_id: match.id,
      type: 'meeting_reminder',
      message: `提醒：${(match.male_profile as any).name} 与 ${(match.female_profile as any).name} 的约谈时间为 ${meetingTime}`,
    })
  }
}

export async function checkPendingConfirmation() {
  const supabase = createServiceRoleClient()

  const { data: openTasks } = await supabase
    .from('followup_tasks')
    .select('id, matchmaker_id, profile_id, match_id, task_type, priority, question_list, rationale, updated_at')
    .in('status', ['open', 'in_progress'])
    .order('updated_at', { ascending: false })

  for (const task of openTasks ?? []) {
    let existingReminderQuery = supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'pending_confirmation')
      .eq('matchmaker_id', task.matchmaker_id)
      .eq('is_read', false)

    existingReminderQuery = task.profile_id
      ? existingReminderQuery.eq('profile_id', task.profile_id)
      : existingReminderQuery.is('profile_id', null)

    existingReminderQuery = task.match_id
      ? existingReminderQuery.eq('match_id', task.match_id)
      : existingReminderQuery.is('match_id', null)

    const { count } = await existingReminderQuery

    if ((count ?? 0) > 0) continue

    const leadQuestion = task.question_list?.[0]
    const message = leadQuestion
      ? `有待确认字段尚未补问：${leadQuestion}`
      : task.rationale || '有待确认字段需要继续线下补问，请及时处理。'

    await supabase.from('reminders').insert({
      matchmaker_id: task.matchmaker_id,
      profile_id: task.profile_id,
      match_id: task.match_id,
      type: 'pending_confirmation',
      message,
    })
  }
}
