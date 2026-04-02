import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { transcribeAudioDetailed } from '@/lib/ai/client'
import { toUserFacingAIErrorMessage } from '@/lib/ai/provider-errors'
import { Json } from '@/types/database'
import { getSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

const STORAGE_DOWNLOAD_ATTEMPTS = 3

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error
    ? toUserFacingAIErrorMessage(error.message, fallback)
    : fallback
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMissingStorageObject(message: string) {
  const lower = message.toLowerCase()
  return lower.includes('not found') || lower.includes('does not exist') || lower.includes('404')
}

function isRetryableStorageDownloadError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('fetch failed')
    || lower.includes('timeout')
    || lower.includes('timed out')
    || lower.includes('econnreset')
    || lower.includes('socket')
    || lower.includes('network')
    || lower.includes('connect')
    || lower.includes('und_err')
  )
}

function buildStorageDownloadErrorMessage(rawMessage: string) {
  return isMissingStorageObject(rawMessage)
    ? '音频文件不存在或已失效，请重新上传。'
    : '音频文件下载失败，请稍后重试。'
}

async function downloadAudioWithRetry(
  supabase = createServiceRoleClient(),
  audioPath: string
) {
  let lastErrorMessage = 'unknown storage error'

  for (let attempt = 1; attempt <= STORAGE_DOWNLOAD_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.storage.from('audio-files').download(audioPath)

    if (!error && data) {
      return data
    }

    lastErrorMessage = error?.message || 'empty storage response'
    console.error(
      `[transcribe] audio download attempt ${attempt}/${STORAGE_DOWNLOAD_ATTEMPTS} failed for ${audioPath}: ${lastErrorMessage}`
    )

    if (
      attempt < STORAGE_DOWNLOAD_ATTEMPTS
      && !isMissingStorageObject(lastErrorMessage)
      && isRetryableStorageDownloadError(lastErrorMessage)
    ) {
      await wait(250 * attempt * attempt)
      continue
    }

    break
  }

  throw new Error(buildStorageDownloadErrorMessage(lastErrorMessage))
}

function triggerExtract(request: NextRequest, conversationId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? request.nextUrl.origin
    : 'http://localhost:3000'

  return fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ conversationId }),
  }).catch(console.error)
}

export async function POST(request: NextRequest) {
  let conversationId: string | undefined

  try {
    const payload = await request.json()
    conversationId = payload.conversationId
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }
    const targetConversationId = conversationId

    const supabase = await createClient()
    const serviceRoleClient = createServiceRoleClient()
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取对话记录
    const { data: conv, error: convError } = await withSupabaseRetry(
      () => supabase.from('conversations').select('*').eq('id', targetConversationId).eq('matchmaker_id', user.id).single(),
      { label: 'transcribe route conversation query' }
    )

    if (convError || !conv) {
      return NextResponse.json({ error: '对话记录不存在' }, { status: 404 })
    }

    if (conv.status === 'transcribing') {
      return NextResponse.json({ error: '录音正在转录中，请勿重复提交' }, { status: 409 })
    }

    if (typeof conv.transcript === 'string' && conv.transcript.trim()) {
      if (conv.status !== 'done' && conv.status !== 'extracting') {
        await supabase
          .from('conversations')
          .update({ status: 'extracting', error_message: null })
          .eq('id', targetConversationId)

        triggerExtract(request, targetConversationId)

        return NextResponse.json({
          success: true,
          transcript: conv.transcript,
          reused: true,
          status: 'extracting',
        })
      }

      return NextResponse.json({
        success: true,
        transcript: conv.transcript,
        reused: true,
        status: conv.status,
      })
    }

    // 更新状态为转录中
    await supabase
      .from('conversations')
      .update({ status: 'transcribing', error_message: null })
      .eq('id', targetConversationId)

    // 从 Storage 下载音频文件
    const audioPath = conv.audio_url
    if (!audioPath) {
      await supabase.from('conversations').update({ status: 'failed', error_message: '音频文件路径为空' }).eq('id', targetConversationId)
      return NextResponse.json({ error: '音频文件路径为空' }, { status: 400 })
    }

    const audioData = await downloadAudioWithRetry(serviceRoleClient, audioPath)

    // 调用 Whisper API
    const audioFile = new File([audioData], 'audio.mp3', { type: audioData.type || 'audio/mpeg' })

    const transcription = await transcribeAudioDetailed(audioFile, 'zh', {
      idempotencyKey: `conversation:${targetConversationId}:whisper-1`,
    })

    if (!transcription.text?.trim()) {
      throw new Error('Whisper 返回空文本，请重试或更换更清晰、更短的音频。')
    }

    // 更新转录结果，并触发提取
    await supabase
      .from('conversations')
      .update({
        transcript: transcription.text,
        transcript_verbose_json: transcription.verboseJson as Json | null,
        status: 'extracting',
        error_message: null,
      })
      .eq('id', targetConversationId)

    // 触发 Claude 提取（异步）
    triggerExtract(request, targetConversationId)

    return NextResponse.json({ success: true, transcript: transcription.text })
  } catch (error) {
    console.error('Transcribe error:', error)
    const errorMessage = getErrorMessage(error, '转录失败')
    if (conversationId) {
      const serviceRoleClient = createServiceRoleClient()
      await serviceRoleClient
        .from('conversations')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', conversationId)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
