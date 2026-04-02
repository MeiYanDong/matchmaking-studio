import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReminderList } from '@/components/reminders/reminder-list'
import { Bell } from 'lucide-react'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('matchmaker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = reminders?.filter(r => !r.is_read).length ?? 0

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-700" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">提醒中心</h1>
          <p className="text-gray-500 text-sm">{unread > 0 ? `${unread} 条未读提醒` : '所有提醒已读'}</p>
        </div>
      </div>
      <ReminderList reminders={reminders ?? []} />
    </div>
  )
}
