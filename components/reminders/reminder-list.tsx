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
  no_followup: 'border-l-rose-300 bg-rose-50',
  no_new_info: 'border-l-blue-300 bg-blue-50',
  meeting_reminder: 'border-l-orange-300 bg-orange-50',
  pending_confirmation: 'border-l-amber-300 bg-amber-50',
}

const priorityTone: Record<ReminderPriority, string> = {
  high: 'border-[#e8c89a] bg-[#fff7ea] text-[#8f642d]',
  medium: 'border-[#ddd1c3] bg-white/85 text-[#6f5849]',
  low: 'border-[#e8dfd6] bg-[#fbf7f2] text-[#877362]',
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
      <div className="text-center py-16 text-gray-400">
        <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">暂无提醒</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-gray-500">
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
              className={`border-l-4 rounded-r-xl p-4 flex items-start gap-3 transition-opacity ${typeBg[reminder.type]} ${isRead ? 'opacity-60' : ''}`}
            >
              <div className="mt-0.5">{typeIcon[reminder.type]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs px-2 py-0">{REMINDER_TYPE_LABELS[reminder.type]}</Badge>
                  <Badge variant="outline" className={`text-[11px] ${priorityTone[priority]}`}>
                    {priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}
                  </Badge>
                  {!isRead && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                </div>
                <p className="text-sm text-gray-700">{reminder.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(reminder.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {href && (
                  <Link href={href}>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">查看</Button>
                  </Link>
                )}
                {!isRead && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-gray-400" onClick={() => markAsRead(reminder.id)}>
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
