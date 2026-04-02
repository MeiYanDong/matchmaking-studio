import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileCard } from '@/components/client/profile-card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export default async function UserMePage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) redirect('/user/login')

  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border p-10 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">暂未绑定资料卡</h1>
        <p className="text-sm text-gray-500 mt-3 leading-6">
          当前账号还没有和任何客户资料绑定。请联系红娘或管理员，将你的账号关联到对应的资料档案后再回来查看。
        </p>
      </div>
    )
  }

  const { data: intention } = await supabase
    .from('intentions')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">我的信息卡</h1>
          <p className="text-sm text-gray-500 mt-1">这里只展示红娘为你整理后的只读资料卡</p>
        </div>
        <Link href="/user/discover">
          <Button className="bg-rose-500 hover:bg-rose-600 gap-2">
            <Search className="w-4 h-4" />
            去 AI 筛选对象
          </Button>
        </Link>
      </div>

      <ProfileCard profile={profile} intention={intention ?? undefined} printable />
    </div>
  )
}
