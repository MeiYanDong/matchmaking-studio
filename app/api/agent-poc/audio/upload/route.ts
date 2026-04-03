import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  buildAgentPocAudioObjectKey,
  createSignedCosGetUrl,
  getCosBucket,
  getCosRegion,
  uploadAudioBufferToCos,
} from '@/lib/cos/client'
import {
  getProfileSummary,
  initializeAgentDatabase,
  insertConversation,
  openAgentDatabase,
} from '@/experiments/agent-worker/db'

export const runtime = 'nodejs'

const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024
const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg']

function hasSupportedAudioExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  return ACCEPTED_AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const profileIdRaw = formData.get('profileId')
    const profileId = typeof profileIdRaw === 'string' ? profileIdRaw.trim() : ''

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少音频文件' }, { status: 400 })
    }

    if (!profileId) {
      return NextResponse.json({ error: '缺少 profileId' }, { status: 400 })
    }

    if (!hasSupportedAudioExtension(file.name)) {
      return NextResponse.json({ error: '仅支持 MP3、M4A、WAV、OGG 音频文件' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: '音频文件大小需在 0 到 100MB 之间' }, { status: 400 })
    }

    const conversationId = randomUUID()
    const objectKey = buildAgentPocAudioObjectKey({
      profileId,
      conversationId,
      originalFileName: file.name,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadAudioBufferToCos({
      key: objectKey,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    })

    const db = openAgentDatabase()
    try {
      initializeAgentDatabase(db)
      const profile = getProfileSummary(db, profileId)
      if (!profile) {
        return NextResponse.json({ error: '客户不存在，请先创建草稿客户' }, { status: 404 })
      }
      insertConversation(db, {
        conversationId,
        profileId,
        status: 'uploaded',
        audio: {
          bucket: getCosBucket(),
          region: getCosRegion(),
          key: objectKey,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          etag: uploadResult.etag,
        },
      })
    } finally {
      db.close()
    }

    const signedUrl = createSignedCosGetUrl({
      key: objectKey,
      expiresInSeconds: 1800,
    })

    return NextResponse.json({
      ok: true,
      conversation: {
        id: conversationId,
        profileId,
        status: 'uploaded',
      },
      audio: {
        bucket: getCosBucket(),
        region: getCosRegion(),
        key: objectKey,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        etag: uploadResult.etag,
        signedUrl,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传音频到 COS 失败' },
      { status: 500 }
    )
  }
}
