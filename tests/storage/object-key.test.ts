import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAudioStorageObjectKey, sanitizeStorageFileName } from '../../lib/storage/object-key'

test('sanitizeStorageFileName 会把中文和特殊字符收敛成安全文件名', () => {
  assert.equal(
    sanitizeStorageFileName('MiniMax_2026-04-03_13_06_14_嚣张小姐.mp3'),
    'minimax-2026-04-03-13-06-14.mp3'
  )
})

test('buildAudioStorageObjectKey 会保留目录层级并使用安全文件名', () => {
  assert.equal(
    buildAudioStorageObjectKey({
      userId: 'user-1',
      profileId: 'profile-1',
      originalFileName: '录音 01（终版）.wav',
      timestamp: 123456,
    }),
    'user-1/profile-1/123456-audio-01.wav'
  )
})
