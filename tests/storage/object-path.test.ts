import test from 'node:test'
import assert from 'node:assert/strict'
import { extractBucketObjectPath } from '../../lib/storage/object-path'

test('extractBucketObjectPath 能解析 Supabase public url', () => {
  assert.equal(
    extractBucketObjectPath(
      'https://demo.supabase.co/storage/v1/object/public/profile-photos/mm-1/profile-1/photo.jpg',
      'profile-photos'
    ),
    'mm-1/profile-1/photo.jpg'
  )
})

test('extractBucketObjectPath 能解析直接存储的 bucket/path 写法', () => {
  assert.equal(
    extractBucketObjectPath('audio-files/mm-1/profile-1/demo.mp3', 'audio-files'),
    'mm-1/profile-1/demo.mp3'
  )
})

test('extractBucketObjectPath 遇到外部 url 不会误认成自身 bucket 对象', () => {
  assert.equal(
    extractBucketObjectPath('https://example.com/avatar.jpg', 'profile-photos'),
    null
  )
})
