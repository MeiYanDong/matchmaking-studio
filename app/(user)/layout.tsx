import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Heart, Search, User } from 'lucide-react'

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/user/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleData?.role === 'admin') redirect('/admin/dashboard')
  if (roleData?.role === 'matchmaker') redirect('/matchmaker/clients')

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">婚恋信息卡</h1>
              <p className="text-xs text-gray-400">查看资料并筛选推荐对象</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/user/me">
              <Button variant="ghost" className="gap-2">
                <User className="w-4 h-4" />
                我的信息卡
              </Button>
            </Link>
            <Link href="/user/discover">
              <Button variant="ghost" className="gap-2">
                <Search className="w-4 h-4" />
                AI筛选
              </Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline">退出登录</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
