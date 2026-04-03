import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createFollowupTasks,
  getProfileBundle,
  initializeAgentDatabase,
  insertConversation,
  openAgentDatabase,
  saveConversationSummary,
  updateRowByProfileId,
  upsertProfileSkeleton,
} from '../../experiments/agent-worker/db'
import { executeAgentTool } from '../../experiments/agent-worker/tools'

function createTempDbPath(name: string) {
  return path.join(os.tmpdir(), `matchmaking-agent-poc-${name}-${Date.now()}.sqlite`)
}

test('agent poc db can initialize and update local tables', () => {
  const dbPath = createTempDbPath('init')
  const db = openAgentDatabase(dbPath)
  initializeAgentDatabase(db)
  upsertProfileSkeleton(db, 'profile-1', '测试客户')
  insertConversation(db, {
    conversationId: 'conversation-1',
    profileId: 'profile-1',
    transcript: '我28岁，现在在杭州，本科，收入三十万。',
  })

  updateRowByProfileId(db, 'profiles', 'profile-1', {
    age: 28,
    city: '杭州',
    education: 'bachelor',
  })

  updateRowByProfileId(db, 'intentions', 'profile-1', {
    primary_intent: 'marriage',
    relationship_mode: 'marriage_standard',
  })

  updateRowByProfileId(db, 'trait_profiles', 'profile-1', {
    hobbies: ['健身', '看电影'],
    communication_style: '慢热',
  })

  const bundle = getProfileBundle(db, 'profile-1', 'conversation-1')

  assert.equal(bundle.profile?.age, 28)
  assert.equal(bundle.profile?.city, '杭州')
  assert.equal(bundle.intention?.primary_intent, 'marriage')
  assert.deepEqual(bundle.traitProfile?.hobbies, ['健身', '看电影'])

  db.close()
  fs.rmSync(dbPath, { force: true })
})

test('agent poc tools can save summary, create followups and run sql', () => {
  const dbPath = createTempDbPath('tools')
  const db = openAgentDatabase(dbPath)
  initializeAgentDatabase(db)
  upsertProfileSkeleton(db, 'profile-2', '测试客户2')
  insertConversation(db, {
    conversationId: 'conversation-2',
    profileId: 'profile-2',
    transcript: '我想认真结婚。',
  })

  const summaryResult = saveConversationSummary(db, 'conversation-2', '认真找对象，明确以结婚为目标。')
  assert.equal(summaryResult.aiSummary, '认真找对象，明确以结婚为目标。')

  const followupResult = createFollowupTasks(db, {
    profileId: 'profile-2',
    conversationId: 'conversation-2',
    tasks: [
      {
        title: '确认婚史',
        question: '你之前有结过婚吗？',
      },
      {
        question: '如果对方需要定居杭州，你会接受吗？',
      },
    ],
  })
  assert.equal(followupResult.count, 2)

  const sqlResult = executeAgentTool(db, {
    tool: 'run_sql',
    input: {
      sql: 'SELECT COUNT(*) AS count FROM followup_tasks WHERE profile_id = ?',
      params: ['profile-2'],
    },
  })

  assert.equal(Array.isArray(sqlResult), true)
  assert.equal((sqlResult as Array<{ count: number }>)[0]?.count, 2)

  db.close()
  fs.rmSync(dbPath, { force: true })
})
