import * as tus from 'tus-js-client'

import { supabaseUrl } from '@/lib/supabase/env'

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
