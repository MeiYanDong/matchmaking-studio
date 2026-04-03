import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isLikelyTruncatedJsonOutput,
  parseJsonFromModelOutput,
  stripJsonCodeFence,
} from '../../lib/ai/model-output'

test('stripJsonCodeFence 会去掉 markdown code fence', () => {
  assert.equal(stripJsonCodeFence('```json\n{"ok":true}\n```'), '{"ok":true}')
})

test('parseJsonFromModelOutput 能解析带 code fence 的 JSON', () => {
  assert.deepEqual(parseJsonFromModelOutput('```json\n{"ok":true}\n```'), { ok: true })
})

test('parseJsonFromModelOutput 能修复字符串里未转义引号导致的坏 JSON', () => {
  const broken = `{
    "review_required": [
      {
        "field_key": "annual_income",
        "reason": "客户说"二十多万"，取20万为中低估，实际可能更高",
        "candidate_value": 20
      }
    ]
  }`

  assert.deepEqual(parseJsonFromModelOutput(broken), {
    review_required: [
      {
        field_key: 'annual_income',
        reason: '客户说"二十多万"，取20万为中低估，实际可能更高',
        candidate_value: 20,
      },
    ],
  })
})

test('parseJsonFromModelOutput 能从说明文字包裹的 JSON 中提取主体并修复', () => {
  const wrapped = `下面是结构化结果：
\`\`\`json
{
  "field_updates": [
    {
      "field_key": "city",
      "value": "杭州"
    }
  ],
  "processing_notes": ["客户说"希望留杭发展"。"]
}
\`\`\`
请按此处理。`

  assert.deepEqual(parseJsonFromModelOutput(wrapped), {
    field_updates: [
      {
        field_key: 'city',
        value: '杭州',
      },
    ],
    processing_notes: ['客户说"希望留杭发展"。'],
  })
})

test('isLikelyTruncatedJsonOutput 能识别因长度截断的 JSON', () => {
  assert.equal(
    isLikelyTruncatedJsonOutput('{"a":"still open"', new SyntaxError('Unterminated string in JSON at position 12'), 'length'),
    true
  )
})

test('isLikelyTruncatedJsonOutput 不会把完整 JSON 误判成截断', () => {
  assert.equal(
    isLikelyTruncatedJsonOutput('{"a":1}', new Error('some other error'), 'stop'),
    false
  )
})
