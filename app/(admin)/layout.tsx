import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkspaceShell } from '@/components/nav/workspace-shell'

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
    <WorkspaceShell role="admin" displayName={roleData.display_name}>
        {children}
    </WorkspaceShell>
  )
}
