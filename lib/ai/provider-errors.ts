export type WhisperGatewayFailureCode =
  | 'quota_exceeded'
  | 'provider_unavailable'
  | 'request_failed'
  | 'empty_transcript'

export type ClaudeGatewayFailureCode =
  | 'quota_exceeded'
  | 'request_failed'

export type GatewayProviderName = '云雾' | '兔子' | 'OpenRouter' | 'Groq' | '第三方'

export function normalizeSecretValue(value?: string | null) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()
  const placeholderMarkers = ['your_', 'placeholder', '<redacted>', 'replace_me']

  if (placeholderMarkers.some((marker) => lower.includes(marker))) {
    return ''
  }

  return trimmed
}

export function classifyWhisperGatewayFailure(
  status: number,
  body: string
): WhisperGatewayFailureCode {
  const haystack = `${status} ${body}`.toLowerCase()

  if (
    haystack.includes('insufficient_user_quota')
    || haystack.includes('预扣费额度失败')
    || haystack.includes('quota')
    || haystack.includes('billing')
  ) {
    return 'quota_exceeded'
  }

  if (
    status >= 500
    || haystack.includes('没有可用渠道')
    || haystack.includes('no available channel')
    || haystack.includes('available channel')
    || haystack.includes('service unavailable')
  ) {
    return 'provider_unavailable'
  }

  return 'request_failed'
}

export function shouldFallbackToBackupWhisperProvider(status: number, body: string) {
  const code = classifyWhisperGatewayFailure(status, body)
  return code === 'quota_exceeded' || code === 'provider_unavailable'
}

export function inferGatewayProviderName(baseUrl: string): GatewayProviderName {
  const normalized = baseUrl.trim().toLowerCase()

  if (
    normalized.includes('yunwu.ai')
    || normalized.includes('yunwu.zeabur.app')
    || normalized.includes('api.apiplus.org')
    || normalized.includes('wlai.vip')
    || normalized.includes('zhongzhuan.chat')
  ) {
    return '云雾'
  }

  if (normalized.includes('tu-zi.com')) {
    return '兔子'
  }

  if (normalized.includes('openrouter.ai')) {
    return 'OpenRouter'
  }

  if (normalized.includes('groq.com')) {
    return 'Groq'
  }

  return '第三方'
}

export function buildWhisperGatewayErrorMessage(
  status: number,
  body: string,
  hasBackupProvider: boolean,
  providerName: GatewayProviderName = '第三方'
) {
  const failureCode = classifyWhisperGatewayFailure(status, body)

  if (failureCode === 'quota_exceeded') {
    return hasBackupProvider
      ? `${providerName} Whisper 网关额度不足，且备选转录服务也失败，请检查主备供应商余额与权限。`
      : `${providerName} Whisper 网关额度不足，请先处理该供应商的余额或权限。`
  }

  if (failureCode === 'provider_unavailable') {
    return hasBackupProvider
      ? `${providerName} Whisper 网关当前没有可用渠道，且备选转录服务也失败，请稍后重试。`
      : `${providerName} Whisper 网关当前没有可用渠道，请稍后重试。`
  }

  return `${providerName} Whisper 网关请求失败: ${status} ${body}`
}

export function buildWhisperEmptyTranscriptMessage(
  hasBackupProvider: boolean,
  providerName: GatewayProviderName = '第三方'
) {
  return hasBackupProvider
    ? `${providerName} Whisper 返回空文本，且备选转录服务也未产生有效文本，请重试或更换更清晰的音频。`
    : `${providerName} Whisper 返回空文本，请重试或更换更清晰、更短的音频；若持续出现，请检查供应商状态。`
}

export function classifyClaudeGatewayFailure(
  status: number,
  body: string
): ClaudeGatewayFailureCode {
  const haystack = `${status} ${body}`.toLowerCase()

  if (
    haystack.includes('quota is not enough')
    || haystack.includes('token remain quota')
    || haystack.includes('need quota')
    || haystack.includes('insufficient_user_quota')
    || haystack.includes('quota')
    || haystack.includes('billing')
  ) {
    return 'quota_exceeded'
  }

  return 'request_failed'
}

function extractQuotaAmount(body: string, label: 'remain' | 'need') {
  const patterns = {
    remain: /remain quota:\s*[＄$]?([0-9.]+)/i,
    need: /need quota:\s*[＄$]?([0-9.]+)/i,
  } as const

  const matched = body.match(patterns[label])
  return matched?.[1] ?? null
}

export function buildClaudeGatewayErrorMessage(
  status: number,
  body: string,
  providerName: GatewayProviderName = '第三方'
) {
  const failureCode = classifyClaudeGatewayFailure(status, body)

  if (failureCode === 'quota_exceeded') {
    return 'Claude 余额不足，请充值后重试。'
  }

  return `${providerName} Claude 网关请求失败: ${status} ${body}`
}

export function toUserFacingAIErrorMessage(message: string, fallback: string) {
  const trimmed = message.trim()
  if (!trimmed) return fallback

  const lower = trimmed.toLowerCase()

  if (
    lower.includes('claude 网关请求失败')
    || lower.includes('claude 余额不足')
    || lower.includes('token quota is not enough')
    || lower.includes('token remain quota')
    || lower.includes('need quota')
    || lower.includes('insufficient credits')
    || lower.includes('credit balance')
    || lower.includes('payment required')
  ) {
    return 'Claude 余额不足，请充值后重试。'
  }

  if (
    lower.includes('whisper 网关额度不足')
    || lower.includes('insufficient_user_quota')
    || lower.includes('预扣费额度失败')
  ) {
    return 'Whisper 余额不足，请充值后重试。'
  }

  if (
    lower.includes('没有可用渠道')
    || lower.includes('no available channel')
    || lower.includes('service unavailable')
  ) {
    return 'AI 服务暂时不可用，请稍后重试。'
  }

  if (
    lower.includes('aborterror')
    || lower.includes('timed out')
    || lower.includes('timeout')
    || lower.includes('signal is aborted')
    || lower.includes('fetch failed')
    || lower.includes('econnreset')
    || lower.includes('network')
  ) {
    return 'AI 服务连接失败，请重试当前操作。'
  }

  if (
    lower.includes('unknown field key')
    || (lower.includes('field_updates') && lower.includes('path'))
    || (lower.includes('"code"') && lower.includes('"custom"') && lower.includes('"message"'))
  ) {
    return 'AI 返回了无法识别的字段，请重试。'
  }

  return trimmed
}
