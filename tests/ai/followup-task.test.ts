import test from 'node:test'
import assert from 'node:assert/strict'
import { syncFollowupTask } from '@/lib/followup/tasks'

type Operation =
  | { table: string; action: 'select'; filters: Array<{ type: string; column: string; value: unknown }>; limit?: number }
  | { table: string; action: 'insert'; payload: unknown }
  | { table: string; action: 'update'; payload: unknown; filters: Record<string, unknown> }

function createSelectBuilder(
  table: string,
  operations: Operation[],
  rows: Array<Record<string, unknown>>
) {
  const filters: Array<{ type: string; column: string; value: unknown }> = []

  const builder = {
    data: rows,
    eq(column: string, value: unknown) {
      filters.push({ type: 'eq', column, value })
      return builder
    },
    is(column: string, value: unknown) {
      filters.push({ type: 'is', column, value })
      return builder
    },
    in(column: string, value: unknown) {
      filters.push({ type: 'in', column, value })
      return builder
    },
    limit(value: number) {
      operations.push({ table, action: 'select', filters: [...filters], limit: value })
      return builder
    },
  }

  return builder
}

function createMockSupabase(existingRows: Array<Record<string, unknown>> = []) {
  const operations: Operation[] = []

  const client = {
    from(table: string) {
      return {
        select() {
          return createSelectBuilder(table, operations, existingRows)
        },
        update(payload: unknown) {
          const filters: Record<string, unknown> = {}
          const builder = {
            in(column: string, value: unknown) {
              filters[column] = value
              return builder
            },
            eq(column: string, value: unknown) {
              filters[column] = value
              return builder
            },
            is(column: string, value: unknown) {
              filters[column] = value
              return builder
            },
            then(resolve: (value: { data: null; error: null }) => unknown) {
              operations.push({
                table,
                action: 'update',
                payload,
                filters: { ...filters },
              })
              return Promise.resolve({ data: null, error: null }).then(resolve)
            },
          }

          return builder
        },
        insert(payload: unknown) {
          operations.push({ table, action: 'insert', payload })
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: { id: 'task-1' }, error: null })
                },
              }
            },
          }
        },
      }
    },
  }

  return {
    client,
    operations,
  }
}

test('缺失字段会生成补问任务', async () => {
  const mock = createMockSupabase()

  const taskId = await syncFollowupTask({
    supabase: mock.client as never,
    matchmakerId: 'mm-1',
    profileId: 'profile-1',
    fieldKeys: ['preferred_income_min', 'accepts_partner_children', 'preferred_income_min'],
    questions: ['请确认是否接受对方有孩子？', '请确认最低收入要求？', '请确认最低收入要求？'],
    rationale: '来自最近一次录音的缺口分析',
  })

  assert.equal(taskId, 'task-1')

  const insertOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'insert'
  )

  assert.ok(insertOperation)
  assert.deepEqual((insertOperation?.payload as { field_keys: string[] }).field_keys, [
    'preferred_income_min',
    'accepts_partner_children',
  ])
  assert.deepEqual((insertOperation?.payload as { question_list: string[] }).question_list, [
    '对方如果有孩子，你这边能接受吗？',
    '请确认最低收入要求？',
  ])
  assert.equal((insertOperation?.payload as { task_type: string }).task_type, 'sensitive_confirmation')
  assert.equal((insertOperation?.payload as { priority: string }).priority, 'high')
})

test('同一客户下特殊模式补问不会再自动入库', async () => {
  const mock = createMockSupabase([
    {
      id: 'task-existing',
      match_id: 'match-older',
      task_type: 'relationship_followup',
      field_keys: ['relationship_mode'],
      question_list: ['你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？'],
      updated_at: new Date().toISOString(),
    },
  ])

  const taskId = await syncFollowupTask({
    supabase: mock.client as never,
    matchmakerId: 'mm-1',
    profileId: 'profile-1',
    matchId: 'match-new',
    fieldKeys: ['relationship_mode'],
    questions: ['你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？'],
    rationale: '高分候选仍存在待确认敏感字段，需要线下补问',
    taskType: 'relationship_followup',
  })

  assert.equal(taskId, undefined)

  const insertOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'insert'
  )
  assert.equal(insertOperation, undefined)

  const updateOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'update'
  )
  assert.ok(updateOperation)
  assert.deepEqual((updateOperation?.filters as Record<string, unknown>).profile_id, 'profile-1')
})

test('同一字段的近义补问会在入库前折叠为标准问法', async () => {
  const mock = createMockSupabase([
    {
      id: 'task-existing',
      match_id: null,
      task_type: 'sensitive_confirmation',
      field_keys: ['marital_history', 'accepts_partner_children', 'fertility_preference'],
      question_list: [
        '你之前有过婚史吗，还是一直未婚？',
        '对方如果有孩子，你这边能接受吗？',
        '你自己未来有没有想生孩子的打算？',
      ],
      updated_at: new Date().toISOString(),
    },
  ])

  const taskId = await syncFollowupTask({
    supabase: mock.client as never,
    matchmakerId: 'mm-1',
    profileId: 'profile-1',
    fieldKeys: ['marital_history', 'accepts_partner_children', 'fertility_preference'],
    questions: [
      '你之前有过婚史吗，还是一直是未婚状态？',
      '对方有孩子的话，你这边能考虑吗？',
      '你自己以后想要孩子吗？',
    ],
    rationale: '来自最近一次录音的缺口分析',
  })

  assert.equal(taskId, 'task-existing')

  const insertOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'insert'
  )
  assert.equal(insertOperation, undefined)

  const updateOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'update'
  )
  assert.ok(updateOperation)
  assert.deepEqual(
    (updateOperation?.payload as { question_list: string[] }).question_list,
    [
      '你之前有过婚史吗，还是一直未婚？',
      '对方如果有孩子，你这边能接受吗？',
      '你自己未来有没有想生孩子的打算？',
    ]
  )
})

test('V1 默认后置的特殊模式字段不会自动生成补问任务', async () => {
  const mock = createMockSupabase()

  const taskId = await syncFollowupTask({
    supabase: mock.client as never,
    matchmakerId: 'mm-1',
    profileId: 'profile-1',
    fieldKeys: ['relationship_mode', 'accepts_mode_compensated_dating'],
    questions: [
      '你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？',
      '如果对方是恋爱关系里带明确经济安排，你能接受吗？',
    ],
    rationale: '少数特殊模式改为线下单独确认',
  })

  assert.equal(taskId, undefined)

  const insertOperation = mock.operations.find(
    (operation) => operation.table === 'followup_tasks' && operation.action === 'insert'
  )
  assert.equal(insertOperation, undefined)
})
