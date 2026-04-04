import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getConversationProcessingStage,
  normalizeConversationStatus,
} from '../../lib/conversations/processing'

test('normalizeConversationStatus 会把 legacy pending 归一成 uploaded', () => {
  assert.equal(normalizeConversationStatus('pending'), 'uploaded')
  assert.equal(normalizeConversationStatus('transcribing'), 'transcribing')
})

test('getConversationProcessingStage 会把 uploaded 和 transcribed 映射到对应阶段', () => {
  assert.equal(getConversationProcessingStage({ status: 'uploaded' }), 'transcribe')
  assert.equal(getConversationProcessingStage({ status: 'transcribed' }), 'extract')
})

test('getConversationProcessingStage 在允许恢复时支持处理中间态重试', () => {
  assert.equal(getConversationProcessingStage({ status: 'transcribing', allowRecovery: true }), 'transcribe')
  assert.equal(getConversationProcessingStage({ status: 'extracting', allowRecovery: true }), 'extract')
})

test('getConversationProcessingStage 会根据失败阶段决定恢复方向', () => {
  assert.equal(
    getConversationProcessingStage({ status: 'failed', failedStage: 'transcribe', allowRecovery: true }),
    'transcribe'
  )
  assert.equal(
    getConversationProcessingStage({ status: 'failed', failedStage: 'extract', allowRecovery: true }),
    'extract'
  )
  assert.equal(
    getConversationProcessingStage({ status: 'failed', failedStage: 'upload', allowRecovery: true }),
    null
  )
})
