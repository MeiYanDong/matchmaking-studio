import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AudioUploader } from '@/components/upload/audio-uploader'
import { ReviewLayout } from '@/components/layouts/review-layout'
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
    <ReviewLayout
      backHref={`/matchmaker/clients/${id}`}
      backLabel="返回客户详情"
      eyebrow="Audio Upload"
      title="上传录音"
      description={`为 ${profile.name} 上传与红娘的对话录音。系统会先将音频安全入库，再继续进入转录和提取阶段。`}
      content={<AudioUploader profileId={id} />}
    />
  )
}
