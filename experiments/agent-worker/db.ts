import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
// @ts-expect-error node:sqlite types are not available in the current @types/node package
import { DatabaseSync } from 'node:sqlite'

const ROOT_DIR = path.resolve(process.cwd(), 'experiments/agent-worker')
const DEFAULT_DB_PATH = path.join(ROOT_DIR, 'data', 'agent-poc.sqlite')
const SCHEMA_PATH = path.join(ROOT_DIR, 'schema.sql')
const DEMO_TRANSCRIPT_PATH = path.join(ROOT_DIR, 'fixtures', 'demo-transcript.txt')

export type AgentDatabase = InstanceType<typeof DatabaseSync>

export function getAgentDatabasePath() {
  return process.env.AGENT_POC_DB_PATH || DEFAULT_DB_PATH
}

export function ensureAgentDataDir(dbPath = getAgentDatabasePath()) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
}

export function openAgentDatabase(dbPath = getAgentDatabasePath()) {
  ensureAgentDataDir(dbPath)
  return new DatabaseSync(dbPath)
}

export function initializeAgentDatabase(db: AgentDatabase) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  db.exec(schema)
}

export function resetAgentDatabase(dbPath = getAgentDatabasePath()) {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath)
  }
}

export function nowIso() {
  return new Date().toISOString()
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function normalizeScalarValue(key: string, value: unknown) {
  if (typeof value === 'boolean') {
    if (key === 'has_children' || key.startsWith('accepts_')) {
      return value ? 'yes' : 'no'
    }
    return value ? 1 : 0
  }

  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return stringifyJson(value)
  }

  return value
}

function normalizeJsonFieldValue(value: unknown) {
  if (typeof value === 'string') {
    const parts = value
      .split(/[、，,]/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (parts.length > 1) {
      return stringifyJson(parts)
    }
  }

  return stringifyJson(value)
}

export function upsertProfileSkeleton(db: AgentDatabase, profileId: string, name = 'POC 客户') {
  const now = nowIso()
  db.prepare(`
    INSERT INTO profiles (id, name, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
  `).run(profileId, name, 'male', now, now)

  db.prepare(`
    INSERT INTO intentions (profile_id, created_at, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(profile_id) DO NOTHING
  `).run(profileId, now, now)

  db.prepare(`
    INSERT INTO trait_profiles (profile_id, created_at, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(profile_id) DO NOTHING
  `).run(profileId, now, now)
}

export function insertConversation(
  db: AgentDatabase,
  params: {
    conversationId: string
    profileId: string
    transcript: string
    talkedAt?: string
    status?: string
  }
) {
  const now = nowIso()
  db.prepare(`
    INSERT INTO conversations (
      id, profile_id, transcript, talked_at, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.conversationId,
    params.profileId,
    params.transcript,
    params.talkedAt || now,
    params.status || 'transcribed',
    now,
    now
  )
}

export function seedDemoConversation(db: AgentDatabase) {
  const profileId = 'poc-profile-001'
  const conversationId = 'poc-conversation-001'
  upsertProfileSkeleton(db, profileId, 'POC 男嘉宾')
  const transcript = fs.readFileSync(DEMO_TRANSCRIPT_PATH, 'utf8').trim()

  db.prepare('DELETE FROM followup_tasks WHERE profile_id = ?').run(profileId)
  db.prepare('DELETE FROM agent_run_events').run()
  db.prepare('DELETE FROM agent_runs').run()
  db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId)

  insertConversation(db, {
    conversationId,
    profileId,
    transcript,
    status: 'transcribed',
  })

  return { profileId, conversationId, transcript }
}

function parseJsonCell(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function getTableColumns(db: AgentDatabase, table: 'profiles' | 'intentions' | 'trait_profiles') {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}

export function getProfileBundle(db: AgentDatabase, profileId: string, conversationId?: string) {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as Record<string, unknown> | undefined
  const intention = db.prepare('SELECT * FROM intentions WHERE profile_id = ?').get(profileId) as Record<string, unknown> | undefined
  const traitProfile = db.prepare('SELECT * FROM trait_profiles WHERE profile_id = ?').get(profileId) as Record<string, unknown> | undefined
  const recentConversations = db.prepare(`
    SELECT id, talked_at, ai_summary, status
    FROM conversations
    WHERE profile_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(profileId) as Array<Record<string, unknown>>

  const currentConversation = conversationId
    ? (db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as Record<string, unknown> | undefined)
    : undefined

  return {
    profile: profile
      ? {
          ...profile,
          current_base_cities: parseJsonCell(profile.current_base_cities),
          extra_data: parseJsonCell(profile.extra_data),
        }
      : null,
    intention: intention
      ? {
          ...intention,
          acceptable_education: parseJsonCell(intention.acceptable_education),
          extra_data: parseJsonCell(intention.extra_data),
        }
      : null,
    traitProfile: traitProfile
      ? {
          ...traitProfile,
          hobbies: parseJsonCell(traitProfile.hobbies),
          extra_data: parseJsonCell(traitProfile.extra_data),
        }
      : null,
    recentConversations,
    currentConversation,
  }
}

function buildAssignments(updates: Record<string, unknown>) {
  return Object.keys(updates).map((key) => `${key} = @${key}`).join(', ')
}

function normalizeTableUpdates(table: 'profiles' | 'intentions' | 'trait_profiles', updates: Record<string, unknown>) {
  const jsonFieldsByTable: Record<string, string[]> = {
    profiles: ['current_base_cities'],
    intentions: ['acceptable_education'],
    trait_profiles: ['hobbies'],
  }

  const jsonFields = new Set(jsonFieldsByTable[table] || [])
  return Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      jsonFields.has(key) ? normalizeJsonFieldValue(value) : normalizeScalarValue(key, value),
    ])
  )
}

export function updateRowByProfileId(
  db: AgentDatabase,
  table: 'profiles' | 'intentions' | 'trait_profiles',
  profileId: string,
  updates: Record<string, unknown>
) {
  if (Object.keys(updates).length === 0) {
    return { ok: true, skipped: true }
  }

  const columns = getTableColumns(db, table)
  const rawEntries = Object.entries(updates)
  const knownUpdates = Object.fromEntries(rawEntries.filter(([key]) => columns.has(key)))
  const unknownUpdates = Object.fromEntries(rawEntries.filter(([key]) => !columns.has(key)))
  const normalized = normalizeTableUpdates(table, knownUpdates)
  const now = nowIso()

  if (Object.keys(unknownUpdates).length > 0 && columns.has('extra_data')) {
    const keyColumn = table === 'profiles' ? 'id' : 'profile_id'
    const row = db.prepare(`SELECT extra_data FROM ${table} WHERE ${keyColumn} = ?`).get(profileId) as { extra_data?: string } | undefined
    const existing = parseJsonCell(row?.extra_data) as Record<string, unknown> | null
    normalized.extra_data = stringifyJson({
      ...(existing && typeof existing === 'object' ? existing : {}),
      ...unknownUpdates,
    })
  }

  if (Object.keys(normalized).length === 0) {
    return { ok: true, skipped: true, ignored: Object.keys(unknownUpdates) }
  }

  if (table === 'profiles') {
    const assignments = buildAssignments({
      ...normalized,
      updated_at: now,
    })
    db.prepare(`UPDATE profiles SET ${assignments} WHERE id = @id`).run({
      id: profileId,
      updated_at: now,
      ...normalized,
    })
    return {
      ok: true,
      updated: normalized,
      ignored: Object.keys(unknownUpdates),
    }
  }

  const assignments = buildAssignments({
    ...normalized,
    updated_at: now,
  })
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE profile_id = @profile_id`).run({
    profile_id: profileId,
    updated_at: now,
    ...normalized,
  })
  return {
    ok: true,
    updated: normalized,
    ignored: Object.keys(unknownUpdates),
  }
}

export function saveConversationSummary(db: AgentDatabase, conversationId: string, aiSummary: string) {
  const now = nowIso()
  db.prepare('UPDATE conversations SET ai_summary = ?, updated_at = ? WHERE id = ?').run(aiSummary, now, conversationId)
  return { ok: true, aiSummary }
}

export function createFollowupTasks(
  db: AgentDatabase,
  params: {
    profileId: string
    conversationId?: string
    tasks: Array<{ title?: string; question: string; priority?: 'high' | 'medium' | 'low' }>
  }
) {
  const now = nowIso()
  const createdIds: string[] = []
  const buildTaskTitle = (question: string) => {
    const compact = question.replace(/\s+/g, '').replace(/[？?。！!]+$/g, '')
    if (!compact) return '待补问'
    return compact.length <= 14 ? compact : `${compact.slice(0, 14)}...`
  }
  const normalizedTasks = params.tasks
    .map((task) => {
      const question = typeof task.question === 'string' ? task.question.trim() : String(task.question ?? '').trim()
      const titleInput = typeof task.title === 'string' ? task.title.trim() : String(task.title ?? '').trim()
      const title = titleInput || buildTaskTitle(question)
      const priority = task.priority === 'medium' || task.priority === 'low' ? task.priority : 'high'
      return { title, question, priority }
    })
    .filter((task) => task.title && task.question)

  for (const task of normalizedTasks) {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO followup_tasks (
        id, profile_id, conversation_id, title, question, priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      params.profileId,
      params.conversationId || null,
      task.title,
      task.question,
      task.priority || 'high',
      now,
      now
    )
    createdIds.push(id)
  }

  return { ok: true, createdIds, count: createdIds.length }
}

export function createAgentRun(
  db: AgentDatabase,
  params: {
    profileId: string
    conversationId: string
    mode: string
    status: string
  }
) {
  const id = randomUUID()
  const now = nowIso()
  db.prepare(`
    INSERT INTO agent_runs (
      id, profile_id, conversation_id, mode, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, params.profileId, params.conversationId, params.mode, params.status, now, now)
  return id
}

export function updateAgentRun(
  db: AgentDatabase,
  runId: string,
  params: {
    status?: string
    finalSummary?: string
    stepCount?: number
  }
) {
  const updates: Record<string, unknown> = { updated_at: nowIso() }
  if (params.status) updates.status = params.status
  if (typeof params.finalSummary === 'string') updates.final_summary = params.finalSummary
  if (typeof params.stepCount === 'number') updates.step_count = params.stepCount

  const assignments = Object.keys(updates).map((key) => `${key} = @${key}`).join(', ')
  db.prepare(`UPDATE agent_runs SET ${assignments} WHERE id = @id`).run({
    id: runId,
    ...updates,
  })
}

export function insertAgentRunEvent(
  db: AgentDatabase,
  params: {
    runId: string
    stepIndex: number
    toolName: string
    toolInput: unknown
    toolResult: unknown
  }
) {
  db.prepare(`
    INSERT INTO agent_run_events (
      run_id, step_index, tool_name, tool_input, tool_result, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    params.runId,
    params.stepIndex,
    params.toolName,
    stringifyJson(params.toolInput),
    stringifyJson(params.toolResult),
    nowIso()
  )
}

export function inspectDatabase(db: AgentDatabase) {
  return {
    profiles: db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all(),
    intentions: db.prepare('SELECT * FROM intentions ORDER BY created_at DESC').all(),
    traitProfiles: db.prepare('SELECT * FROM trait_profiles ORDER BY created_at DESC').all(),
    conversations: db.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all(),
    followupTasks: db.prepare('SELECT * FROM followup_tasks ORDER BY created_at DESC').all(),
    agentRuns: db.prepare('SELECT * FROM agent_runs ORDER BY created_at DESC').all(),
    agentRunEvents: db.prepare('SELECT * FROM agent_run_events ORDER BY id ASC').all(),
  }
}
