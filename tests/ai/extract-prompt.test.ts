import test from 'node:test'
import assert from 'node:assert/strict'
import { MACHINE_READABLE_FIELD_SPEC } from '@/lib/ai/field-spec'
import { buildExtractPrompt } from '@/lib/prompts/extract-profile'

test('buildExtractPrompt 会压缩快照和详细转录，减少 prompt 体积', () => {
  const transcript = '我今年 35 岁，现在长期在上海工作，之前在北京也待过几年。'
  const currentSnapshot = {
    age: 34,
    city: '上海',
    current_base_cities: ['上海', '北京'],
    relationship_mode: null,
    accepts_mode_compensated_dating: 'unknown',
    ai_summary: ' '.repeat(4) + '在金融行业工作，收入稳定。'.repeat(20),
    preference_importance: {
      city: 'important',
      income: 'hard',
      empty_note: '',
    },
  }
  const systemContext = {
    matchmaker_id: 'mm-1',
    matchmaker_name: '测试红娘',
    profile_id: 'profile-1',
    profile_gender: 'male',
    conversation_id: 'conv-1',
    uploaded_at: '2026-04-02T12:00:00.000Z',
    audio_duration: 321,
  }
  const transcriptVerboseJson = {
    language: 'zh',
    duration: 321,
    segments: [
      { start: 0, end: 12.5, text: '这是第一段'.repeat(40) },
      { start: 12.5, end: 321, text: '这是最后一段'.repeat(40) },
    ],
  }

  const naivePrompt = [
    '以下是本次提取任务的输入，请基于这些输入输出严格 JSON。',
    '',
    '# 系统上下文',
    JSON.stringify(systemContext, null, 2),
    '',
    '# 当前客户快照',
    JSON.stringify(currentSnapshot, null, 2),
    '',
    '# 字段说明书',
    JSON.stringify(MACHINE_READABLE_FIELD_SPEC, null, 2),
    '',
    '# 本次转录稿',
    transcript,
    '',
    '# 可选的详细转录结构',
    JSON.stringify(transcriptVerboseJson, null, 2),
  ].join('\n')

  const prompt = buildExtractPrompt({
    transcript,
    currentSnapshot,
    systemContext,
    transcriptVerboseJson,
  })

  assert.ok(prompt.length < naivePrompt.length / 2)
  assert.doesNotMatch(prompt, /"matchmaker_id":/)
  assert.doesNotMatch(prompt, /"matchmaker_name":/)
  assert.doesNotMatch(prompt, /"relationship_mode":null/)
  assert.doesNotMatch(prompt, /"accepts_mode_compensated_dating":"unknown"/)
  assert.doesNotMatch(prompt, /这是第一段这是第一段这是第一段/)
  assert.match(prompt, /segment_count/)
})
