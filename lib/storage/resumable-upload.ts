import type { SupabaseClient } from '@supabase/supabase-js'
import * as tus from 'tus-js-client'

import { supabaseUrl } from '@/lib/supabase/env'
import { isRetryableSupabaseError, withSupabaseRetry } from '@/lib/supabase/retry'
import type { Database } from '@/types/database'

export const SUPABASE_RESUMABLE_CHUNK_SIZE = 6 * 1024 * 1024
export const SUPABASE_RESUMABLE_UPLOAD_THRESHOLD = SUPABASE_RESUMABLE_CHUNK_SIZE

interface UploadAudioToStorageOptions {
  accessToken: string
  bucketName: string
  objectName: string
  file: File
  cacheControl?: string
  onProgress?: (progress: number) => void
}

interface UploadAudioToStorageWithFallbackOptions extends UploadAudioToStorageOptions {
  supabase: SupabaseClient<Database>
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }

  return String(error ?? '')
}

export function toUserFacingStorageUploadErrorMessage(error: unknown) {
  const message = toErrorMessage(error).trim()
  const lower = message.toLowerCase()

  if (
    lower.includes('failed to fetch')
    || lower.includes('fetch failed')
    || lower.includes('network')
    || lower.includes('econnreset')
    || lower.includes('timeout')
    || lower.includes('socket')
  ) {
    return '资料库连接失败，请重试当前上传。'
  }

  return message || '文件上传失败，请重试当前上传。'
}

export function buildSupabaseResumableUploadEndpoint(projectUrl: string) {
  if (!projectUrl) return null

  try {
    const parsed = new URL(projectUrl)

    if (parsed.hostname.includes('.storage.supabase.co')) {
      return `${parsed.origin}/storage/v1/upload/resumable`
    }

    if (parsed.hostname.endsWith('.supabase.co')) {
      const storageHost = parsed.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co')
      return `${parsed.protocol}//${storageHost}/storage/v1/upload/resumable`
    }

    return `${parsed.origin}/storage/v1/upload/resumable`
  } catch {
    return null
  }
}

export async function uploadAudioToStorageViaResumable({
  accessToken,
  bucketName,
  objectName,
  file,
  cacheControl = '3600',
  onProgress,
}: UploadAudioToStorageOptions) {
  const endpoint = buildSupabaseResumableUploadEndpoint(supabaseUrl)

  if (!endpoint) {
    throw new Error('资料库上传地址不可用，请检查 Supabase 配置。')
  }

  return new Promise<{ path: string; uploadUrl: string | null }>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName,
        objectName,
        contentType: file.type || 'application/octet-stream',
        cacheControl,
      },
      chunkSize: SUPABASE_RESUMABLE_CHUNK_SIZE,
      onError(error) {
        reject(error)
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal) {
          onProgress?.(0)
          return
        }

        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100))
      },
      onSuccess() {
        onProgress?.(100)
        resolve({
          path: objectName,
          uploadUrl: upload.url ?? null,
        })
      },
    })

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }

        upload.start()
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export async function uploadAudioToStorageWithFallback({
  supabase,
  accessToken,
  bucketName,
  objectName,
  file,
  cacheControl = '3600',
  onProgress,
}: UploadAudioToStorageWithFallbackOptions) {
  const shouldUseResumable = file.size > SUPABASE_RESUMABLE_UPLOAD_THRESHOLD

  if (shouldUseResumable) {
    try {
      return await uploadAudioToStorageViaResumable({
        accessToken,
        bucketName,
        objectName,
        file,
        cacheControl,
        onProgress,
      })
    } catch (error) {
      throw new Error(`文件上传失败: ${toUserFacingStorageUploadErrorMessage(error)}`)
    }
  }

  onProgress?.(10)

  const result = await withSupabaseRetry(
    () =>
      supabase.storage.from(bucketName).upload(objectName, file, {
        cacheControl,
        upsert: true,
      }),
    {
      attempts: 3,
      baseDelayMs: 300,
      label: 'storage direct upload',
    }
  )

  if (!result.error) {
    onProgress?.(100)
    return {
      path: objectName,
      uploadUrl: null,
      mode: 'standard' as const,
    }
  }

  if (!isRetryableSupabaseError(result.error)) {
    throw new Error(`文件上传失败: ${toUserFacingStorageUploadErrorMessage(result.error)}`)
  }

  try {
    return {
      ...(await uploadAudioToStorageViaResumable({
        accessToken,
        bucketName,
        objectName,
        file,
        cacheControl,
        onProgress,
      })),
      mode: 'resumable-fallback' as const,
    }
  } catch (error) {
    throw new Error(`文件上传失败: ${toUserFacingStorageUploadErrorMessage(error)}`)
  }
}
