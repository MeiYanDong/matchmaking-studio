'use client'

import { useState } from 'react'
import { Reminder } from '@/types/database'
import { REMINDER_TYPE_LABELS } from '@/types/app'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Bell, BellOff, Heart, User, Calendar, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export type ReminderPriority = 'high' | 'medium' | 'low'

const typeIcon: Record<string, React.ReactNode> = {
  no_followup: <Heart className="w-4 h-4 text-rose-400" />,
  no_new_info: <User className="w-4 h-4 text-blue-400" />,
  meeting_reminder: <Calendar className="w-4 h-4 text-orange-400" />,
  pending_confirmation: <ClipboardCheck className="w-4 h-4 text-amber-500" />,
}

const typeBg: Record<string, string> = {
  no_followup: 'border-l-rose-200 bg-white dark:border-l-rose-400/40 dark:bg-[linear-gradient(145deg,rgba(28,19,25,0.96),rgba(15,12,17,0.98))]',
  no_new_info: 'border-l-sky-200 bg-white dark:border-l-sky-400/40 dark:bg-[linear-gradient(145deg,rgba(19,26,34,0.96),rgba(12,16,22,0.98))]',
  meeting_reminder: 'border-l-orange-200 bg-white dark:border-l-orange-400/40 dark:bg-[linear-gradient(145deg,rgba(29,23,17,0.96),rgba(16,13,10,0.98))]',
  pending_confirmation: 'border-l-primary/25 bg-white dark:border-l-primary/40 dark:bg-[linear-gradient(145deg,rgba(20,28,39,0.96),rgba(11,16,24,0.98))]',
}

const priorityTone: Record<ReminderPriority, string> = {
  high: 'border-primary/10 bg-primary/8 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-primary-foreground',
  medium: 'border-border/80 bg-white/85 text-foreground/70 dark:border-border/70 dark:bg-[color:var(--surface-soft-strong)] dark:text-foreground/70',
  low: 'border-border/80 bg-muted/60 text-muted-foreground dark:border-border/70 dark:bg-[color:var(--surface-soft)] dark:text-foreground/52',
}

export function getReminderPriority(type: Reminder['type']): ReminderPriority {
  if (type === 'pending_confirmation') return 'high'
  if (type === 'meeting_reminder' || type === 'no_followup') return 'medium'
  return 'low'
}

interface ReminderListProps {
  reminders: Reminder[]
}

export function ReminderList({ reminders }: ReminderListProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  async function markAsRead(id: string) {
    const supabase = createClient()
    await supabase.from('reminders').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setReadIds(prev => new Set([...prev, id]))
    router.refresh()
  }

  async function markAllRead() {
    const supabase = createClient()
    const unreadIds = reminders.filter(r => !r.is_read).map(r => r.id)
    if (!unreadIds.length) return
    await supabase.from('reminders').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds)
    setReadIds(new Set(reminders.map(r => r.id)))
    toast.success('已全部标记为已读')
    router.refresh()
  }

  const unread = reminders.filter(r => !r.is_read && !readIds.has(r.id))

  if (!reminders.length) {
    return (
      <div className="py-16 text-center text-muted-foreground dark:text-foreground/54">
        <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">暂无提醒</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-muted-foreground dark:text-foreground/66 dark:border-white/10 dark:bg-[color:var(--surface-soft)] dark:hover:bg-[color:var(--surface-soft-strong)]">
            <BellOff className="w-4 h-4 mr-1.5" />全部标为已读
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {reminders.map(reminder => {
          const isRead = reminder.is_read || readIds.has(reminder.id)
          const priority = getReminderPriority(reminder.type)
          const href = reminder.match_id
            ? `/matchmaker/matches/${reminder.match_id}`
            : reminder.profile_id
            ? `/matchmaker/clients/${reminder.profile_id}`
            : null

          return (
            <div
              key={reminder.id}
              className={`flex items-start gap-3 rounded-[24px] border border-border/80 border-l-4 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)] transition-opacity dark:border-border/70 dark:shadow-[0_26px_64px_-46px_rgba(0,0,0,0.6)] ${typeBg[reminder.type]} ${isRead ? 'opacity-60' : ''}`}
            >
              <div className="mt-0.5">{typeIcon[reminder.type]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs px-2 py-0 dark:border-border/70 dark:bg-[color:var(--surface-soft-strong)] dark:text-foreground/72">{REMINDER_TYPE_LABELS[reminder.type]}</Badge>
                  <Badge variant="outline" className={`text-[11px] ${priorityTone[priority]}`}>
                    {priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}
                  </Badge>
                  {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="text-sm text-foreground/80 dark:text-foreground/78">{reminder.message}</p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-foreground/50">
                  {format(new Date(reminder.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {href && (
                  <Link href={href}>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2 dark:border-white/10 dark:bg-[color:var(--surface-soft)] dark:hover:bg-[color:var(--surface-soft-strong)]">查看</Button>
                  </Link>
                )}
                {!isRead && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-muted-foreground dark:text-foreground/58 dark:hover:bg-[color:var(--surface-soft)]" onClick={() => markAsRead(reminder.id)}>
                    已读
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
