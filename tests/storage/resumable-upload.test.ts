import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SUPABASE_RESUMABLE_CHUNK_SIZE,
  SUPABASE_RESUMABLE_UPLOAD_THRESHOLD,
  buildSupabaseResumableUploadEndpoint,
  toUserFacingStorageUploadErrorMessage,
} from '../../lib/storage/resumable-upload'

test('buildSupabaseResumableUploadEndpoint 会把项目 URL 转成直连 storage 主机', () => {
  assert.equal(
    buildSupabaseResumableUploadEndpoint('https://abnbwspjlkstknrjbukp.supabase.co'),
    'https://abnbwspjlkstknrjbukp.storage.supabase.co/storage/v1/upload/resumable'
  )
})

test('buildSupabaseResumableUploadEndpoint 遇到已经是 storage 主机时保持不变', () => {
  assert.equal(
    buildSupabaseResumableUploadEndpoint('https://abnbwspjlkstknrjbukp.storage.supabase.co'),
    'https://abnbwspjlkstknrjbukp.storage.supabase.co/storage/v1/upload/resumable'
  )
})

test('resumable upload chunk size 固定为 Supabase 当前要求的 6MB', () => {
  assert.equal(SUPABASE_RESUMABLE_CHUNK_SIZE, 6 * 1024 * 1024)
})

test('大于 6MB 才进入 resumable upload 阈值', () => {
  assert.equal(SUPABASE_RESUMABLE_UPLOAD_THRESHOLD, 6 * 1024 * 1024)
})

test('存储上传网络错误会被翻译成用户可读短句', () => {
  assert.equal(
    toUserFacingStorageUploadErrorMessage(new Error('Failed to fetch')),
    '资料库连接失败，请重试当前上传。'
  )
})

test('非网络错误保持原始信息，方便直接定位', () => {
  assert.equal(
    toUserFacingStorageUploadErrorMessage(new Error('The resource already exists')),
    'The resource already exists'
  )
})
