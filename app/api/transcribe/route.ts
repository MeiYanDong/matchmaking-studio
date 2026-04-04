import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  transcribeAudioDetailedFromUrl,
  transcribeAudioDetailedViaBackupProvider,
} from '@/lib/ai/client'
import { toUserFacingAIErrorMessage } from '@/lib/ai/provider-errors'
import { Json } from '@/types/database'
import { getSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { normalizeConversationStatus } from '@/lib/conversations/processing'

const STORAGE_DOWNLOAD_ATTEMPTS = 3
const SIGNED_AUDIO_URL_EXPIRES_IN = 60 * 60
const MIN_STALE_TRANSCRIBING_MS = 120_000
const MAX_STALE_TRANSCRIBING_MS = 8 * 60_000

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

function getStaleTranscribingThreshold(audioDurationSeconds?: number | null) {
  if (!audioDurationSeconds || !Number.isFinite(audioDurationSeconds)) {
    return MIN_STALE_TRANSCRIBING_MS
  }

  return Math.min(
    MAX_STALE_TRANSCRIBING_MS,
    Math.max(MIN_STALE_TRANSCRIBING_MS, Math.round(audioDurationSeconds * 1500))
  )
}

function isStaleTranscribing(createdAt: string | null | undefined, audioDurationSeconds?: number | null) {
  if (!createdAt) return false
  const createdTime = new Date(createdAt).getTime()
  if (!Number.isFinite(createdTime)) return false
  return Date.now() - createdTime >= getStaleTranscribingThreshold(audioDurationSeconds)
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

async function createSignedAudioUrlWithRetry(
  supabase = createServiceRoleClient(),
  audioPath: string
) {
  let lastErrorMessage = 'unknown storage error'

  for (let attempt = 1; attempt <= STORAGE_DOWNLOAD_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(audioPath, SIGNED_AUDIO_URL_EXPIRES_IN)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    lastErrorMessage = error?.message || 'empty signed url response'
    console.error(
      `[transcribe] create signed url attempt ${attempt}/${STORAGE_DOWNLOAD_ATTEMPTS} failed for ${audioPath}: ${lastErrorMessage}`
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

export async function POST(request: NextRequest) {
  let conversationId: string | undefined

  try {
    const payload = await request.json()
    conversationId = payload.conversationId
    const allowRecovery = Boolean(payload.allowRecovery)
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

    const normalizedStatus = normalizeConversationStatus(conv.status)
    const transcriptReady = typeof conv.transcript === 'string' && conv.transcript.trim().length > 0
    const allowTranscribeRecovery =
      allowRecovery
      && (
        (normalizedStatus === 'transcribing' && !transcriptReady && isStaleTranscribing(conv.created_at, conv.audio_duration))
        || (normalizedStatus === 'failed' && conv.failed_stage === 'transcribe')
      )

    if (
      normalizedStatus === 'transcribing'
      && !allowTranscribeRecovery
    ) {
      return NextResponse.json({ error: '录音正在转录中，请勿重复提交' }, { status: 409 })
    }

    if (transcriptReady) {
      return NextResponse.json({
        success: true,
        transcript: conv.transcript,
        reused: true,
        status:
          normalizedStatus === 'done'
            ? 'done'
            : normalizedStatus === 'extracting'
              ? 'extracting'
              : 'transcribed',
      })
    }

    if (
      normalizedStatus !== 'uploaded'
      && normalizedStatus !== 'transcribing'
      && !allowTranscribeRecovery
    ) {
      return NextResponse.json({ error: '当前录音不处于可转录状态' }, { status: 409 })
    }

    // 更新状态为转录中
    await supabase
      .from('conversations')
      .update({ status: 'transcribing', failed_stage: null, error_message: null })
      .eq('id', targetConversationId)

    // 先生成签名 URL，优先让 Groq 直接拉取 Storage 中的原始音频
    const audioPath = conv.audio_url
    if (!audioPath) {
      await supabase
        .from('conversations')
        .update({
          status: 'failed',
          failed_stage: 'transcribe',
          error_message: '音频文件路径为空',
        })
        .eq('id', targetConversationId)
      return NextResponse.json({ error: '音频文件路径为空' }, { status: 400 })
    }

    const signedAudioUrl = await createSignedAudioUrlWithRetry(serviceRoleClient, audioPath)

    let transcription
    try {
      transcription = await transcribeAudioDetailedFromUrl(signedAudioUrl, 'zh', {
        idempotencyKey: `conversation:${targetConversationId}:whisper-primary`,
      })
    } catch (primaryError) {
      console.error('Primary URL transcription failed, attempting backup provider:', primaryError)

      const audioData = await downloadAudioWithRetry(serviceRoleClient, audioPath)
      const audioFile = new File([audioData], 'audio.mp3', { type: audioData.type || 'audio/mpeg' })

      transcription = await transcribeAudioDetailedViaBackupProvider(audioFile, 'zh', {
        idempotencyKey: `conversation:${targetConversationId}:whisper-backup`,
      })
    }

    if (!transcription.text?.trim()) {
      throw new Error('Whisper 返回空文本，请重试或更换更清晰、更短的音频。')
    }

    // 更新转录结果，仅推进到“已转录”
    await supabase
      .from('conversations')
      .update({
        transcript: transcription.text,
        transcript_verbose_json: transcription.verboseJson as Json | null,
        status: 'transcribed',
        failed_stage: null,
        error_message: null,
      })
      .eq('id', targetConversationId)

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      status: 'transcribed',
    })
  } catch (error) {
    console.error('Transcribe error:', error)
    const errorMessage = getErrorMessage(error, '转录失败')
    if (conversationId) {
      const serviceRoleClient = createServiceRoleClient()
      await serviceRoleClient
        .from('conversations')
        .update({
          status: 'failed',
          failed_stage: 'transcribe',
          error_message: errorMessage,
        })
        .eq('id', conversationId)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
