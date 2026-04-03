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
