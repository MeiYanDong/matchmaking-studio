import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReviewForm } from '@/components/upload/review-form'
import { ReviewLayout } from '@/components/layouts/review-layout'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

export default async function ReviewPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params
  await requireSessionUser()
  const supabase = await createClient()
  const [conversationResult, profileResult] = await Promise.all([
    withSupabaseRetry(() => supabase.from('conversations').select('*').eq('id', cid).single(), { label: 'review page conversation query' }),
    withSupabaseRetry(() => supabase.from('profiles').select('*').eq('id', id).single(), { label: 'review page profile query' }),
  ])

  if (conversationResult.error) {
    throw new Error(`加载录音审核数据失败: ${conversationResult.error.message}`)
  }

  if (profileResult.error) {
    throw new Error(`加载客户信息失败: ${profileResult.error.message}`)
  }

  const { data: conv } = conversationResult
  const { data: profile } = profileResult
  if (!conv || !profile) notFound()

  return (
    <ReviewLayout
      backHref={`/matchmaker/clients/${id}`}
      backLabel="返回客户详情"
      eyebrow="Conversation Review"
      title="差异与异常处理"
      description="AI 已默认自动入库，这里只需要处理冲突、低置信度和敏感待确认字段。"
      content={<ReviewForm conversation={conv} profile={profile} />}
    />
  )
}
