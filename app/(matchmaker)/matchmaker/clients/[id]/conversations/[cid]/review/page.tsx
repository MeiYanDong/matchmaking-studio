import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReviewForm } from '@/components/upload/review-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
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
    <div className="p-6 max-w-5xl mx-auto">
      <Link href={`/matchmaker/clients/${id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ChevronLeft className="w-4 h-4" />
        返回客户详情
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">差异与异常处理</h1>
      <p className="text-gray-500 text-sm mb-6">AI 已默认自动入库，这里只需要处理冲突、低置信度和敏感待确认字段</p>
      <ReviewForm conversation={conv} profile={profile} />
    </div>
  )
}
