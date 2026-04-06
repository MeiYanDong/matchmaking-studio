import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDisplayFollowupQuestions, dedupeFieldKeysByDisplay } from '@/lib/followup/presentation'

test('关键缺口按最终显示文案去重', () => {
  const result = dedupeFieldKeysByDisplay([
    'marital_history_enum',
    'marital_history_enum',
    '婚史',
    'has_children_enum',
  ])

  assert.deepEqual(result, ['marital_history_enum', 'has_children_enum'])
})

test('待补问会优先使用字段标准问法并折叠语义重复问题', () => {
  const result = buildDisplayFollowupQuestions(
    [
      'marital_history_enum',
      'accepts_partner_marital_history',
      'accepts_partner_children',
      'fertility_preference',
    ],
    [
      '你之前有过婚史吗，还是一直是未婚状态？',
      '你能接受对方有过婚史吗？离异的可以考虑吗？',
      '对方如果有孩子，你这边能接受吗？',
      '你自己未来有没有想生孩子的打算？',
    ]
  )

  assert.deepEqual(result, [
    '你之前有过婚史吗，还是一直未婚？',
    '你能接受对方有过婚史吗？离异的可以考虑吗？',
    '对方如果有孩子，你这边能接受吗？',
    '你自己未来有没有想生孩子的打算？',
  ])
})

test('未知字段的补问保留原问题，但仍会去掉完全重复项', () => {
  const result = buildDisplayFollowupQuestions(
    ['preferred_income_min'],
    ['请确认最低收入要求？', '请确认最低收入要求？', '你理想中的年收入下限大概是多少？']
  )

  assert.deepEqual(result, ['请确认最低收入要求？', '你理想中的年收入下限大概是多少？'])
})
