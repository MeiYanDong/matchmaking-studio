import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'admin') redirect('/matchmaker/clients')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" displayName={roleData.display_name} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
