import { NextResponse } from 'next/server'
import { transcribeAudioDetailedFromUrl } from '@/lib/ai/client'
import { createSignedCosGetUrl } from '@/lib/cos/client'
import {
  getConversationById,
  initializeAgentDatabase,
  openAgentDatabase,
  saveConversationError,
  saveConversationTranscript,
  updateConversationStatus,
} from '@/experiments/agent-worker/db'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let conversationId = ''
  const db = openAgentDatabase()

  try {
    initializeAgentDatabase(db)

    const body = (await request.json().catch(() => null)) as { conversationId?: string } | null
    conversationId = typeof body?.conversationId === 'string' ? body.conversationId : ''

    if (!conversationId) {
      return NextResponse.json({ error: '缺少 conversationId' }, { status: 400 })
    }

    const conversation = getConversationById(db, conversationId)
    if (!conversation) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    if (typeof conversation.transcript === 'string' && conversation.transcript.trim()) {
      return NextResponse.json({
        ok: true,
        conversation: {
          id: conversation.id,
          status: conversation.status,
          transcript: conversation.transcript,
          audioKey: conversation.audio_key,
        },
      })
    }

    if (!conversation.audio_key || typeof conversation.audio_key !== 'string') {
      return NextResponse.json({ error: '会话缺少音频对象 key' }, { status: 400 })
    }

    updateConversationStatus(db, conversationId, 'transcribing')

    const signedUrl = createSignedCosGetUrl({
      key: conversation.audio_key,
      expiresInSeconds: 1800,
    })

    const transcription = await transcribeAudioDetailedFromUrl(signedUrl, 'zh', {
      idempotencyKey: `agent-poc:${conversationId}`,
    })

    saveConversationTranscript(db, {
      conversationId,
      transcript: transcription.text,
      verboseJson: transcription.verboseJson,
      status: 'done',
    })

    return NextResponse.json({
      ok: true,
      conversation: {
        id: conversationId,
        status: 'done',
        transcript: transcription.text,
        audioKey: conversation.audio_key,
        signedUrl,
      },
    })
  } catch (error) {
    if (conversationId) {
      saveConversationError(db, conversationId, error instanceof Error ? error.message : 'Groq 转录失败')
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Groq 转录失败' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}
