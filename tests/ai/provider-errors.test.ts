import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClaudeGatewayErrorMessage,
  buildWhisperEmptyTranscriptMessage,
  buildWhisperGatewayErrorMessage,
  classifyClaudeGatewayFailure,
  classifyWhisperGatewayFailure,
  inferGatewayProviderName,
  normalizeSecretValue,
  shouldFallbackToBackupWhisperProvider,
  toUserFacingAIErrorMessage,
} from '@/lib/ai/provider-errors'

test('normalizeSecretValue 会过滤占位密钥', () => {
  assert.equal(normalizeSecretValue('your_openai_api_key'), '')
  assert.equal(normalizeSecretValue('<redacted>'), '')
  assert.equal(normalizeSecretValue(' real-key-value '), 'real-key-value')
})

test('classifyWhisperGatewayFailure 能识别额度不足', () => {
  const body = '{"error":{"message":"预扣费额度失败","code":"insufficient_user_quota"}}'
  assert.equal(classifyWhisperGatewayFailure(403, body), 'quota_exceeded')
  assert.equal(shouldFallbackToBackupWhisperProvider(403, body), true)
})

test('classifyWhisperGatewayFailure 能识别上游无可用渠道', () => {
  const body = '{"error":{"message":"default 分组下 whisper-1 没有可用渠道"}}'
  assert.equal(classifyWhisperGatewayFailure(503, body), 'provider_unavailable')
  assert.equal(shouldFallbackToBackupWhisperProvider(503, body), true)
})

test('inferGatewayProviderName 能识别云雾主站', () => {
  assert.equal(inferGatewayProviderName('https://yunwu.ai'), '云雾')
  assert.equal(inferGatewayProviderName('https://yunwu.zeabur.app'), '云雾')
  assert.equal(inferGatewayProviderName('https://api.tu-zi.com'), '兔子')
  assert.equal(inferGatewayProviderName('https://openrouter.ai/api/v1'), 'OpenRouter')
  assert.equal(inferGatewayProviderName('https://api.groq.com/openai/v1'), 'Groq')
})

test('buildWhisperGatewayErrorMessage 会给出可执行指引', () => {
  const quotaMessage = buildWhisperGatewayErrorMessage(
    403,
    '{"error":{"message":"预扣费额度失败","code":"insufficient_user_quota"}}',
    false
  )

  const unavailableMessage = buildWhisperGatewayErrorMessage(
    503,
    '{"error":{"message":"没有可用渠道"}}',
    false
  )

  assert.match(quotaMessage, /余额或权限/)
  assert.match(unavailableMessage, /没有可用渠道/)
  assert.match(buildWhisperEmptyTranscriptMessage(false), /空文本/)
})

test('classifyClaudeGatewayFailure 能识别 token 配额不足', () => {
  const body = '{"error":{"type":"rix_api_error","message":"token quota is not enough, token remain quota: ＄0.346812, need quota: ＄0.902178"}}'
  assert.equal(classifyClaudeGatewayFailure(403, body), 'quota_exceeded')
})

test('buildClaudeGatewayErrorMessage 会带出剩余额度与修复指引', () => {
  const body = '{"error":{"type":"rix_api_error","message":"token quota is not enough, token remain quota: ＄0.346812, need quota: ＄0.902178"}}'
  const message = buildClaudeGatewayErrorMessage(403, body)

  assert.equal(message, 'Claude 余额不足，请充值后重试。')
})

test('toUserFacingAIErrorMessage 会把原始 Claude JSON 错误压成短句', () => {
  const raw = 'Claude 网关请求失败: 403 {"error":{"type":"rix_api_error","message":"token quota is not enough, token remain quota: ＄0.346812, need quota: ＄0.902178"}}'
  assert.equal(toUserFacingAIErrorMessage(raw, '提取失败'), 'Claude 余额不足，请充值后重试。')
})

test('toUserFacingAIErrorMessage 会把 Whisper 配额问题压成短句', () => {
  const raw = '兔子 Whisper 网关请求失败: 403 {"error":{"message":"预扣费额度失败","code":"insufficient_user_quota"}}'
  assert.equal(toUserFacingAIErrorMessage(raw, '转录失败'), 'Whisper 余额不足，请充值后重试。')
})

test('toUserFacingAIErrorMessage 会把字段校验数组错误压成短句', () => {
  const raw = '[{"code":"custom","path":["field_updates",0,"field_key"],"message":"unknown field key"}]'
  assert.equal(toUserFacingAIErrorMessage(raw, '提取失败'), 'AI 返回了无法识别的字段，请重试。')
})

test('toUserFacingAIErrorMessage 会把网络层 fetch failed 压成短句', () => {
  assert.equal(
    toUserFacingAIErrorMessage('TypeError: fetch failed', '提取失败'),
    'AI 服务连接失败，请重试当前操作。'
  )
})
