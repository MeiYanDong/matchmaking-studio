import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReminderList, getReminderPriority, type ReminderPriority } from '@/components/reminders/reminder-list'
import { Bell } from 'lucide-react'
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
          ? 'border-[#8f3c32] bg-[#8f3c32] text-white'
          : 'border-[#ddcbbb] bg-white/80 text-[#5f4d41] hover:bg-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#dfd0c0] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(252,247,241,0.98)_48%,rgba(247,238,229,0.95))] px-6 py-7 shadow-[0_26px_64px_-44px_rgba(35,24,21,0.48)]">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#ead8c7] bg-white/80">
            <Bell className="h-5 w-5 text-[#8f3c32]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8f3c32] px-1.5 text-xs text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6d58]">Follow-up Queue</p>
            <h2 className="mt-2 font-heading text-4xl text-[#231815]">提醒中心</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b594c]">{unread > 0 ? `${unread} 条未读提醒，优先处理待补问与待确认事项。` : '当前所有提醒已读，可以回到客户与匹配继续推进。'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[#e5d7c8] bg-white/78 p-4 shadow-[0_20px_44px_-34px_rgba(35,24,21,0.3)]">
        <div className="flex flex-wrap items-center gap-2">
          {filterPill('/matchmaker/reminders', '全部', !activeType && !activePriority && !activeStatus)}
          {filterPill('/matchmaker/reminders?status=unread', '未读', activeStatus === 'unread')}
          {filterPill('/matchmaker/reminders?status=read', '已读', activeStatus === 'read')}
          {filterPill('/matchmaker/reminders?priority=high', '高优先级', activePriority === 'high')}
          {filterPill('/matchmaker/reminders?priority=medium', '中优先级', activePriority === 'medium')}
          {filterPill('/matchmaker/reminders?type=pending_confirmation', '待补问', activeType === 'pending_confirmation')}
          {filterPill('/matchmaker/reminders?type=no_followup', '久未跟进', activeType === 'no_followup')}
          {filterPill('/matchmaker/reminders?type=no_new_info', '久未更新', activeType === 'no_new_info')}
          {filterPill('/matchmaker/reminders?type=meeting_reminder', '约谈提醒', activeType === 'meeting_reminder')}
        </div>
      </section>

      <ReminderList reminders={filteredReminders} />
    </div>
  )
}
