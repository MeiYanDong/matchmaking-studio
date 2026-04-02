import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AudioUploader } from '@/components/upload/audio-uploader'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSessionUser()
  const supabase = await createClient()
  const { data: profile, error: profileError } = await withSupabaseRetry(
    () => supabase.from('profiles').select('name, gender').eq('id', id).single(),
    { label: 'upload page profile query' }
  )

  if (profileError) {
    throw new Error(`加载上传页失败: ${profileError.message}`)
  }

  if (!profile) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link href={`/matchmaker/clients/${id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ChevronLeft className="w-4 h-4" />
        返回客户详情
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">上传录音</h1>
      <p className="text-gray-500 text-sm mb-6">
        为 <span className="font-medium text-gray-700">{profile.name}</span> 上传与红娘的对话录音
      </p>
      <AudioUploader profileId={id} />
    </div>
  )
}
