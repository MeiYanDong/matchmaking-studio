import COS from 'cos-nodejs-sdk-v5'
import { sanitizeStorageFileName } from '@/lib/storage/object-key'

let envBootstrapped = false

function bootstrapEnvFiles() {
  if (envBootstrapped) return
  envBootstrapped = true

  if (typeof process.loadEnvFile !== 'function') return

  try {
    process.loadEnvFile('.env')
  } catch {}

  try {
    process.loadEnvFile('.env.local')
  } catch {}
}

function readEnv(name: string) {
  bootstrapEnvFiles()
  return process.env[name]?.trim() || ''
}

function requireEnv(name: string) {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`)
  }
  return value
}

export function getCosBucket() {
  return requireEnv('COS_BUCKET')
}

export function getCosRegion() {
  return requireEnv('COS_REGION')
}

export function createCosClient() {
  return new COS({
    SecretId: requireEnv('COS_SECRET_ID'),
    SecretKey: requireEnv('COS_SECRET_KEY'),
  })
}

export function buildAgentPocAudioObjectKey(params: {
  profileId: string
  conversationId: string
  originalFileName: string
  timestamp?: number
}) {
  const safeFileName = sanitizeStorageFileName(params.originalFileName)
  const timestamp = params.timestamp ?? Date.now()
  return `agent-poc/${params.profileId}/${params.conversationId}/${timestamp}-${safeFileName}`
}

export async function uploadAudioBufferToCos(params: {
  key: string
  body: Buffer
  contentType: string
}) {
  const cos = createCosClient()
  const result = await cos.putObject({
    Bucket: getCosBucket(),
    Region: getCosRegion(),
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  })

  return {
    etag: typeof result.ETag === 'string' ? result.ETag : '',
    location: typeof result.Location === 'string' ? result.Location : '',
  }
}

export function createSignedCosGetUrl(params: {
  key: string
  expiresInSeconds?: number
}) {
  const cos = createCosClient()
  return cos.getObjectUrl({
    Bucket: getCosBucket(),
    Region: getCosRegion(),
    Key: params.key,
    Sign: true,
    Expires: params.expiresInSeconds ?? 1800,
  })
}
