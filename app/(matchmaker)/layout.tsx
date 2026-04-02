import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/sidebar'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

export default async function MatchmakerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSessionUser()
  const supabase = await createClient()
  const [roleResult, unreadResult] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('*').eq('user_id', user.id).single(),
      { label: 'matchmaker layout role query' }
    ),
    withSupabaseRetry(
      () => supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('matchmaker_id', user.id).eq('is_read', false),
      { label: 'matchmaker layout unread reminders query' }
    ),
  ])

  if (!roleResult.data && !roleResult.error) redirect('/login')

  const role = roleResult.data?.role === 'admin' ? 'admin' : 'matchmaker'
  const displayName = roleResult.data?.display_name ?? '红娘'
  const unreadCount = unreadResult.error ? 0 : (unreadResult.count ?? 0)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={role}
        displayName={displayName}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
