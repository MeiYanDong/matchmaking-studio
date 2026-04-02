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
          return {
            eq(column: string, value: unknown) {
              operations.push({
                table,
                action: 'update',
                payload,
                filters: { [column]: value },
              })
              return Promise.resolve({ data: null, error: null })
            },
          }
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
    '请确认是否接受对方有孩子？',
    '请确认最低收入要求？',
  ])
  assert.equal((insertOperation?.payload as { task_type: string }).task_type, 'sensitive_confirmation')
  assert.equal((insertOperation?.payload as { priority: string }).priority, 'high')
})
