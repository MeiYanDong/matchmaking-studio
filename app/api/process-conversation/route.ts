import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session-user'
import {
  ConversationFailedStage,
  ConversationProcessingStage,
  getConversationProcessingStage,
  normalizeConversationStatus,
} from '@/lib/conversations/processing'
import { withSupabaseRetry } from '@/lib/supabase/retry'

function buildBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SUPABASE_URL
    ? request.nextUrl.origin
    : 'http://localhost:3000'
}

async function callStageEndpoint(input: {
  request: NextRequest
  conversationId: string
  stage: ConversationProcessingStage
  allowRecovery?: boolean
}) {
  const baseUrl = buildBaseUrl(input.request)
  const endpoint = input.stage === 'transcribe' ? '/api/transcribe' : '/api/extract'

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: input.request.headers.get('cookie') || '',
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      ...(input.allowRecovery ? { allowRecovery: true } : {}),
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `触发${input.stage === 'transcribe' ? '转录' : '提取'}失败`)
  }

  return payload
}

function triggerExtractInBackground(request: NextRequest, conversationId: string) {
  return callStageEndpoint({
    request,
    conversationId,
    stage: 'extract',
  }).catch((error) => {
    console.error('[process-conversation] background extract failed:', error)
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const conversationId = payload.conversationId as string | undefined
    const allowRecovery = Boolean(payload.allowRecovery)

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: conversation, error } = await withSupabaseRetry(
      () => supabase
        .from('conversations')
        .select('id, status, failed_stage')
        .eq('id', conversationId)
        .eq('matchmaker_id', user.id)
        .single(),
      { label: 'process conversation route query' }
    )

    if (error || !conversation) {
      return NextResponse.json({ error: '对话记录不存在' }, { status: 404 })
    }

    const normalizedStatus = normalizeConversationStatus(conversation.status)
    const failedStage = (conversation.failed_stage as ConversationFailedStage | null | undefined) ?? null
    const nextStage = getConversationProcessingStage({
      status: conversation.status,
      failedStage,
      allowRecovery,
    })

    if (!nextStage) {
      if (normalizedStatus === 'failed' && failedStage === 'upload') {
        return NextResponse.json({ error: '音频上传失败，需要重新上传录音。' }, { status: 409 })
      }

      return NextResponse.json({
        success: true,
        accepted: false,
        status: normalizedStatus,
      })
    }

    if (nextStage === 'extract') {
      void triggerExtractInBackground(request, conversationId)
      return NextResponse.json({
        success: true,
        accepted: true,
        status: 'extracting',
      })
    }

    const transcribeResult = await callStageEndpoint({
      request,
      conversationId,
      stage: 'transcribe',
      allowRecovery,
    })

    if (transcribeResult?.status === 'transcribed') {
      void triggerExtractInBackground(request, conversationId)
      return NextResponse.json({
        success: true,
        accepted: true,
        status: 'extracting',
      })
    }

    return NextResponse.json({
      success: true,
      accepted: true,
      status: transcribeResult?.status ?? 'transcribing',
    })
  } catch (error) {
    console.error('[process-conversation] error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : '处理失败',
    }, { status: 500 })
  }
}
