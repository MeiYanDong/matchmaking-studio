import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

process.loadEnvFile('.env')
process.loadEnvFile('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const BUSINESS_TABLES = [
  'profiles',
  'intentions',
  'trait_profiles',
  'conversations',
  'matches',
  'followup_tasks',
  'reminders',
  'field_observations',
] as const

const STORAGE_BUCKETS = ['audio-files', 'profile-photos'] as const
const BATCH_SIZE = 100
const MAX_RETRIES = 4

type BusinessTable = (typeof BUSINESS_TABLES)[number]
type StorageBucket = (typeof STORAGE_BUCKETS)[number]

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(label: string, task: () => PromiseLike<T>): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await task()
    } catch (error) {
      attempt += 1
      const message = error instanceof Error ? error.message : String(error)
      const isRetryable =
        message.includes('fetch failed') ||
        message.includes('ECONNRESET') ||
        message.includes('network socket disconnected')

      if (!isRetryable || attempt >= MAX_RETRIES) {
        throw error
      }

      console.warn(`${label} 失败，${attempt}/${MAX_RETRIES} 次重试中：${message}`)
      await wait(500 * attempt)
    }
  }
}

async function countTable(table: BusinessTable) {
  const result = (await withRetry(`${table} count`, () =>
    supabase.from(table).select('*', { count: 'exact', head: true })
  )) as { count: number | null; error: { code?: string; message?: string } | null }
  const { count, error } = result
  if (error) {
    if (error.code === 'PGRST205') return 0
    throw error
  }
  return count ?? 0
}

async function listBucketFiles(bucket: StorageBucket) {
  const files: string[] = []

  async function walk(prefix = ''): Promise<void> {
    const { data, error } = await withRetry(`${bucket} list ${prefix || '/'}`, () =>
      supabase.storage.from(bucket).list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })
    )

    if (error) throw error

    for (const item of data ?? []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        await walk(fullPath)
      } else {
        files.push(fullPath)
      }
    }
  }

  await walk('')
  return files
}

async function buildSnapshot() {
  const counts = Object.fromEntries(
    await Promise.all(BUSINESS_TABLES.map(async (table) => [table, await countTable(table)] as const))
  )

  const storage = Object.fromEntries(
    await Promise.all(
      STORAGE_BUCKETS.map(async (bucket) => {
        const paths = await listBucketFiles(bucket)
        return [
          bucket,
          {
            count: paths.length,
            paths,
          },
        ] as const
      })
    )
  )

  const snapshot = {
    createdAt: new Date().toISOString(),
    counts,
    storage,
  }

  const outDir = path.join(process.cwd(), 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `cleanup-snapshot-${Date.now()}.json`)
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2))

  return { outFile, snapshot }
}

async function clearTable(table: BusinessTable) {
  const result = (await withRetry(`${table} delete`, () =>
    supabase.from(table).delete().not('id', 'is', null)
  )) as { error: { code?: string; message?: string } | null }
  const { error } = result
  if (error) {
    if (error.code === 'PGRST205') return
    throw error
  }
}

async function clearBucket(bucket: StorageBucket) {
  const files = await listBucketFiles(bucket)
  for (const batch of chunk(files, BATCH_SIZE)) {
    const result = (await withRetry(`${bucket} remove`, () =>
      supabase.storage.from(bucket).remove(batch)
    )) as { error: { code?: string; message?: string } | null }
    const { error } = result
    if (error) throw error
  }
  return files.length
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { outFile, snapshot } = await buildSnapshot()

  console.log('清理前快照：')
  console.log(JSON.stringify({ outFile, snapshot }, null, 2))

  if (dryRun) {
    console.log('dry-run 模式，未执行删除。')
    return
  }

  for (const table of ['reminders', 'field_observations', 'followup_tasks', 'matches', 'conversations', 'trait_profiles', 'intentions', 'profiles'] as const) {
    await clearTable(table)
  }

  const removedFiles = Object.fromEntries(
    await Promise.all(STORAGE_BUCKETS.map(async (bucket) => [bucket, await clearBucket(bucket)] as const))
  )

  const afterCounts = Object.fromEntries(
    await Promise.all(BUSINESS_TABLES.map(async (table) => [table, await countTable(table)] as const))
  )

  console.log('清理完成：')
  console.log(
    JSON.stringify(
      {
        removedFiles,
        afterCounts,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('重置业务数据失败：', error)
  process.exit(1)
})
