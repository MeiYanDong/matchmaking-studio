import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReminderList, getReminderPriority, type ReminderPriority } from '@/components/reminders/reminder-list'
import { Bell } from 'lucide-react'
import { CollectionPageTemplate } from '@/components/layouts/collection-page-template'
import type { ReminderType } from '@/types/database'

const REMINDER_TYPE_VALUES: ReminderType[] = [
  'no_followup',
  'no_new_info',
  'meeting_reminder',
  'pending_confirmation',
]

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; priority?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('matchmaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const reminderRows = reminders ?? []
  const unread = reminderRows.filter(r => !r.is_read).length
  const activeType = REMINDER_TYPE_VALUES.find((value) => value === params.type)
  const activePriority = ['high', 'medium', 'low'].includes(params.priority ?? '') ? (params.priority as ReminderPriority) : null
  const activeStatus = ['unread', 'read'].includes(params.status ?? '') ? params.status : null

  const filteredReminders = reminderRows.filter((reminder) => {
    if (activeType && reminder.type !== activeType) return false
    if (activePriority && getReminderPriority(reminder.type) !== activePriority) return false
    if (activeStatus === 'unread' && reminder.is_read) return false
    if (activeStatus === 'read' && !reminder.is_read) return false
    return true
  })

  const filterPill = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary/10 bg-primary text-white dark:border-primary/20 dark:bg-primary-foreground dark:text-primary'
          : 'border-border/80 bg-white/80 text-foreground/70 hover:bg-white hover:text-foreground dark:border-border/70 dark:bg-[color:var(--surface-soft)] dark:text-foreground/68 dark:hover:bg-[color:var(--surface-soft-strong)] dark:hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <CollectionPageTemplate
      eyebrow="Follow-up Queue"
      title="提醒中心"
      description={unread > 0 ? `${unread} 条未读提醒，优先处理待补问与待确认事项。` : '当前所有提醒已读，可以回到客户与匹配继续推进。'}
      filters={
        <>
          {filterPill('/matchmaker/reminders', '全部', !activeType && !activePriority && !activeStatus)}
          {filterPill('/matchmaker/reminders?status=unread', '未读', activeStatus === 'unread')}
          {filterPill('/matchmaker/reminders?status=read', '已读', activeStatus === 'read')}
          {filterPill('/matchmaker/reminders?priority=high', '高优先级', activePriority === 'high')}
          {filterPill('/matchmaker/reminders?priority=medium', '中优先级', activePriority === 'medium')}
          {filterPill('/matchmaker/reminders?type=pending_confirmation', '待补问', activeType === 'pending_confirmation')}
          {filterPill('/matchmaker/reminders?type=no_followup', '久未跟进', activeType === 'no_followup')}
          {filterPill('/matchmaker/reminders?type=no_new_info', '久未更新', activeType === 'no_new_info')}
          {filterPill('/matchmaker/reminders?type=meeting_reminder', '约谈提醒', activeType === 'meeting_reminder')}
        </>
      }
    >
      <ReminderList reminders={filteredReminders} />
    </CollectionPageTemplate>
  )
}
