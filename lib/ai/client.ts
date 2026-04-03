import Anthropic from '@anthropic-ai/sdk'
import {
  buildClaudeGatewayErrorMessage,
  buildWhisperEmptyTranscriptMessage,
  buildWhisperGatewayErrorMessage,
  inferGatewayProviderName,
  normalizeSecretValue,
} from '@/lib/ai/provider-errors'

type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

type GenerateClaudeTextOptions = {
  model: string
  maxTokens: number
  system?: string
  messages: ClaudeMessage[]
  idempotencyKey?: string
  responseFormat?: 'text' | 'json_object'
}

export type GenerateClaudeTextResult = {
  text: string
  finishReason: string | null
  provider: 'openrouter' | 'yunwu' | 'anthropic'
}

type GatewayRequestOptions = {
  idempotencyKey?: string
}

type WhisperResponseFormat = 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt'

export type DetailedTranscriptionResult = {
  text: string
  verboseJson: unknown | null
}

let envBootstrapped = false
const WHISPER_GATEWAY_TIMEOUT_MS = 180_000
const CLAUDE_GATEWAY_TIMEOUT_MS = 90_000
const GATEWAY_FETCH_ATTEMPTS = 3

function bootstrapEnvFiles() {
  if (envBootstrapped) return
  envBootstrapped = true

  if (typeof process.loadEnvFile !== 'function') return

  try {
    process.loadEnvFile('.env')
  } catch {}

  try {
    process.loadEnvFile('.env.local')
  } catch {}
}

function readEnv(name: string) {
  bootstrapEnvFiles()
  return normalizeSecretValue(process.env[name]?.trim() || '')
}

function getYunwuBaseUrl() {
  return (
    readEnv('YUNWU_API_BASE_URL')
    || readEnv('AI_API_BASE_URL')
    || 'https://yunwu.ai'
  ).replace(/\/+$/, '')
}

function getYunwuProviderName() {
  return inferGatewayProviderName(getYunwuBaseUrl())
}

function getGroqBaseUrl() {
  return (
    readEnv('GROQ_API_BASE_URL')
    || 'https://api.groq.com/openai/v1'
  ).replace(/\/+$/, '')
}

function getOpenRouterBaseUrl() {
  return (
    readEnv('OPENROUTER_API_BASE_URL')
    || 'https://openrouter.ai/api/v1'
  ).replace(/\/+$/, '')
}

function getOpenRouterProviderName() {
  return inferGatewayProviderName(getOpenRouterBaseUrl())
}

function getGroqProviderName() {
  return inferGatewayProviderName(getGroqBaseUrl())
}

function getGroqWhisperModel() {
  return readEnv('GROQ_WHISPER_MODEL') || 'whisper-large-v3-turbo'
}

function buildGatewayTimeoutSignal(timeoutMs: number) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  return undefined
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGatewayFetchError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase()

  return (
    message.includes('fetch failed')
    || message.includes('aborterror')
    || message.includes('timed out')
    || message.includes('timeout')
    || message.includes('econnreset')
    || message.includes('socket')
    || message.includes('network')
    || message.includes('connect')
    || message.includes('und_err')
    || message.includes('signal is aborted')
  )
}

async function fetchGatewayWithRetry(input: string, init: RequestInit, label: string) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= GATEWAY_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(input, init)
    } catch (error) {
      lastError = error

      if (!isRetryableGatewayFetchError(error) || attempt === GATEWAY_FETCH_ATTEMPTS) {
        throw error
      }

      console.warn(
        `[ai] ${label} request failed on attempt ${attempt}/${GATEWAY_FETCH_ATTEMPTS}, retrying: ${error instanceof Error ? error.message : String(error)}`
      )
      await wait(250 * attempt * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} request failed`)
}

function getGroqApiKey() {
  return readEnv('GROQ_API_KEY')
}

function getWhisperGatewayApiKey() {
  return (
    readEnv('marry_whisper_YUNWU_API_KEY')
    || readEnv('MARRY_WHISPER_API_KEY')
    || readEnv('marry_whisper_TUZI_API_KEY')
    || readEnv('API_KEY')
  )
}

function getOpenRouterApiKey() {
  return readEnv('OPENROUTER_API_KEY')
}

function getClaudeGatewayApiKey() {
  return (
    readEnv('marry_claude_YUNWU_API_KEY') ||
    readEnv('MARRY_CLAUDE_API_KEY') ||
    readEnv('marry_claude_TUZI_API_KEY') ||
    readEnv('marry_claude_TUZI_API_KET') ||
    readEnv('API_KEY')
  )
}

function getAnthropicApiKey() {
  return readEnv('ANTHROPIC_API_KEY')
}

function getAnthropicClient() {
  const anthropicApiKey = getAnthropicApiKey()
  if (!anthropicApiKey) {
    throw new Error('缺少 ANTHROPIC_API_KEY。注意：当前 Claude 主链路优先走 OpenRouter，其次走云雾；ANTHROPIC_API_KEY 只作为可选的最终兜底。')
  }

  return new Anthropic({ apiKey: anthropicApiKey })
}

function normalizeClaudeModelForOpenRouter(model: string) {
  const trimmed = model.trim()
  if (!trimmed) return 'anthropic/claude-sonnet-4.6'
  if (trimmed.startsWith('anthropic/')) return trimmed
  return `anthropic/${trimmed}`
}

function normalizeClaudeModelForGateway(model: string) {
  const trimmed = model.trim()
  if (!trimmed) return 'claude-sonnet-4.6'
  if (trimmed.startsWith('anthropic/')) {
    return trimmed.slice('anthropic/'.length)
  }
  return trimmed
}

function extractGatewayText(payload: unknown) {
  const data = payload as {
    text?: unknown
    content?: Array<{ type?: unknown; text?: unknown }>
    choices?: Array<{
      message?: {
        content?: unknown
      }
    }>
  }

  const textBlock = data.content?.find((item) => item?.type === 'text' && typeof item.text === 'string')
  if (typeof textBlock?.text === 'string') return textBlock.text.trim()

  if (typeof data.text === 'string') return data.text.trim()

  const messageContent = data.choices?.[0]?.message?.content
  if (typeof messageContent === 'string') return messageContent.trim()

  if (Array.isArray(messageContent)) {
    const joined = messageContent
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()

    if (joined) return joined
  }

  throw new Error('AI 返回中缺少可解析文本')
}

function extractGatewayResult(
  payload: unknown,
  provider: GenerateClaudeTextResult['provider']
): GenerateClaudeTextResult {
  const data = payload as {
    choices?: Array<{
      finish_reason?: unknown
    }>
  }

  return {
    text: extractGatewayText(payload),
    finishReason: typeof data.choices?.[0]?.finish_reason === 'string'
      ? data.choices[0].finish_reason
      : null,
    provider,
  }
}

async function parseWhisperResponse(
  response: Response,
  responseFormat: WhisperResponseFormat,
  hasBackupProvider: boolean,
  providerName: ReturnType<typeof inferGatewayProviderName>
) {
  const contentType = response.headers.get('content-type') || ''
  const rawText = (await response.text()).trim()

  if (contentType.includes('application/json')) {
    let data: unknown
    try {
      data = JSON.parse(rawText)
    } catch {
      if (!rawText) {
        throw new Error(buildWhisperEmptyTranscriptMessage(hasBackupProvider, providerName))
      }
      return responseFormat === 'verbose_json'
        ? { text: rawText, verboseJson: null }
        : rawText
    }

    if (typeof data === 'string') {
      const text = data.trim()
      if (!text) {
        throw new Error(buildWhisperEmptyTranscriptMessage(hasBackupProvider, providerName))
      }
      return responseFormat === 'verbose_json'
        ? { text, verboseJson: null }
        : text
    }

    if (data && typeof data === 'object' && 'text' in data && typeof data.text === 'string') {
      const text = data.text.trim()
      if (!text) {
        throw new Error(buildWhisperEmptyTranscriptMessage(hasBackupProvider, providerName))
      }
      return responseFormat === 'verbose_json'
        ? { text, verboseJson: data }
        : text
    }

    if (!rawText) {
      throw new Error(buildWhisperEmptyTranscriptMessage(hasBackupProvider, providerName))
    }

    return responseFormat === 'verbose_json'
      ? { text: rawText, verboseJson: data }
      : JSON.stringify(data)
  }

  if (!rawText) {
    throw new Error(buildWhisperEmptyTranscriptMessage(hasBackupProvider, providerName))
  }

  return responseFormat === 'verbose_json'
    ? { text: rawText, verboseJson: null }
    : rawText
}

async function transcribeAudioViaGroq(
  file: File,
  language: string,
  responseFormat: WhisperResponseFormat
) {
  const groqApiKey = getGroqApiKey()
  if (!groqApiKey) {
    throw new Error('缺少 GROQ_API_KEY')
  }

  const formData = new FormData()
  formData.append('file', file, file.name || 'audio')
  formData.append('model', getGroqWhisperModel())
  formData.append('language', language)
  formData.append('response_format', responseFormat)

  const response = await fetchGatewayWithRetry(`${getGroqBaseUrl()}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
    signal: buildGatewayTimeoutSignal(WHISPER_GATEWAY_TIMEOUT_MS),
  }, 'whisper-groq')

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        Boolean(getWhisperGatewayApiKey()),
        getGroqProviderName()
      )
    )
  }

  return parseWhisperResponse(
    response,
    responseFormat,
    Boolean(getWhisperGatewayApiKey()),
    getGroqProviderName()
  )
}

async function transcribeAudioViaGroqUrl(
  sourceUrl: string,
  language: string,
  responseFormat: WhisperResponseFormat,
  requestOptions?: GatewayRequestOptions
) {
  const groqApiKey = getGroqApiKey()
  if (!groqApiKey) {
    throw new Error('缺少 GROQ_API_KEY')
  }

  const formData = new FormData()
  formData.append('url', sourceUrl)
  formData.append('model', getGroqWhisperModel())
  formData.append('language', language)
  formData.append('response_format', responseFormat)

  const response = await fetchGatewayWithRetry(`${getGroqBaseUrl()}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      ...(requestOptions?.idempotencyKey
        ? { 'Idempotency-Key': requestOptions.idempotencyKey }
        : {}),
    },
    body: formData,
    signal: buildGatewayTimeoutSignal(WHISPER_GATEWAY_TIMEOUT_MS),
  }, 'whisper-groq-url')

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        Boolean(getWhisperGatewayApiKey()),
        getGroqProviderName()
      )
    )
  }

  return parseWhisperResponse(
    response,
    responseFormat,
    Boolean(getWhisperGatewayApiKey()),
    getGroqProviderName()
  )
}

async function transcribeAudioDetailedViaGroq(
  file: File,
  language: string
): Promise<DetailedTranscriptionResult> {
  const result = await transcribeAudioViaGroq(file, language, 'verbose_json')
  return result as DetailedTranscriptionResult
}

async function transcribeAudioDetailedViaGroqUrl(
  sourceUrl: string,
  language: string,
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  const result = await transcribeAudioViaGroqUrl(sourceUrl, language, 'verbose_json', requestOptions)
  return result as DetailedTranscriptionResult
}

async function transcribeAudioViaYunwu(
  file: File,
  language: string,
  responseFormat: 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt',
  requestOptions?: GatewayRequestOptions
) {
  const gatewayApiKey = getWhisperGatewayApiKey()
  if (!gatewayApiKey) {
    throw new Error('缺少 marry_whisper_YUNWU_API_KEY、MARRY_WHISPER_API_KEY、marry_whisper_TUZI_API_KEY 或 API_KEY')
  }

  const formData = new FormData()
  formData.append('file', file, file.name || 'audio')
  formData.append('model', 'whisper-1')
  formData.append('language', language)
  formData.append('response_format', responseFormat)

  const response = await fetchGatewayWithRetry(`${getYunwuBaseUrl()}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      ...(requestOptions?.idempotencyKey
        ? { 'Idempotency-Key': requestOptions.idempotencyKey }
        : {}),
    },
    body: formData,
    signal: buildGatewayTimeoutSignal(WHISPER_GATEWAY_TIMEOUT_MS),
  }, 'whisper-yunwu')

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        false,
        getYunwuProviderName()
      )
    )
  }

  const contentType = response.headers.get('content-type') || ''
  const rawText = (await response.text()).trim()

  if (contentType.includes('application/json')) {
    let data: unknown
    try {
      data = JSON.parse(rawText)
    } catch {
      if (!rawText) {
        throw new Error(
          buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
        )
      }
      return rawText
    }

    if (typeof data === 'string') {
      const text = data.trim()
      if (!text) {
        throw new Error(
          buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
        )
      }
      return text
    }

    if (data && typeof data === 'object' && 'text' in data && typeof data.text === 'string') {
      const text = data.text.trim()
      if (!text) {
        throw new Error(
          buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
        )
      }
      return text
    }

    return JSON.stringify(data)
  }

  if (!rawText) {
    throw new Error(
      buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
    )
  }

  return rawText
}

async function transcribeAudioDetailedViaYunwu(
  file: File,
  language: string,
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  const gatewayApiKey = getWhisperGatewayApiKey()
  if (!gatewayApiKey) {
    throw new Error('缺少 marry_whisper_YUNWU_API_KEY、MARRY_WHISPER_API_KEY、marry_whisper_TUZI_API_KEY 或 API_KEY')
  }

  const formData = new FormData()
  formData.append('file', file, file.name || 'audio')
  formData.append('model', 'whisper-1')
  formData.append('language', language)
  formData.append('response_format', 'verbose_json')

  const response = await fetchGatewayWithRetry(`${getYunwuBaseUrl()}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      ...(requestOptions?.idempotencyKey
        ? { 'Idempotency-Key': requestOptions.idempotencyKey }
        : {}),
    },
    body: formData,
    signal: buildGatewayTimeoutSignal(WHISPER_GATEWAY_TIMEOUT_MS),
  }, 'whisper-yunwu')

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        false,
        getYunwuProviderName()
      )
    )
  }

  const rawText = (await response.text()).trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    if (!rawText) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
      )
    }
    return { text: rawText, verboseJson: null }
  }

  if (typeof parsed === 'string') {
    const text = parsed.trim()
    if (!text) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
      )
    }
    return { text, verboseJson: null }
  }

  if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string') {
    const text = parsed.text.trim()
    if (!text) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
      )
    }
    return { text, verboseJson: parsed }
  }

  if (!rawText) {
    throw new Error(
      buildWhisperEmptyTranscriptMessage(false, getYunwuProviderName())
    )
  }

  return { text: rawText, verboseJson: parsed }
}

async function generateClaudeTextViaYunwu(options: GenerateClaudeTextOptions) {
  const gatewayApiKey = getClaudeGatewayApiKey()
  if (!gatewayApiKey) {
    throw new Error('缺少 marry_claude_YUNWU_API_KEY、MARRY_CLAUDE_API_KEY、marry_claude_TUZI_API_KEY、marry_claude_TUZI_API_KET 或 API_KEY')
  }

  const response = await fetchGatewayWithRetry(`${getYunwuBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: normalizeClaudeModelForGateway(options.model),
      max_tokens: options.maxTokens,
      ...(options.responseFormat === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {}),
      messages: [
        ...(options.system ? [{ role: 'system' as const, content: options.system.trim() }] : []),
        ...options.messages,
      ],
    }),
    signal: buildGatewayTimeoutSignal(CLAUDE_GATEWAY_TIMEOUT_MS),
  }, 'claude-yunwu')

  if (!response.ok) {
    const body = await response.text()
    console.error('Claude gateway upstream error:', response.status, body)
    throw new Error(buildClaudeGatewayErrorMessage(response.status, body, getYunwuProviderName()))
  }

  return extractGatewayResult(await response.json(), 'yunwu')
}

async function generateClaudeTextViaOpenRouter(options: GenerateClaudeTextOptions) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) {
    throw new Error('缺少 OPENROUTER_API_KEY')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': 'Matchmaking Studio',
  }

  const siteUrl = readEnv('NEXT_PUBLIC_APP_URL') || readEnv('VERCEL_PROJECT_PRODUCTION_URL')
  if (siteUrl) {
    headers['HTTP-Referer'] = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  }

  const response = await fetchGatewayWithRetry(`${getOpenRouterBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: normalizeClaudeModelForOpenRouter(options.model),
      max_tokens: options.maxTokens,
      ...(options.responseFormat === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {}),
      messages: [
        ...(options.system ? [{ role: 'system' as const, content: options.system.trim() }] : []),
        ...options.messages,
      ],
    }),
    signal: buildGatewayTimeoutSignal(CLAUDE_GATEWAY_TIMEOUT_MS),
  }, 'claude-openrouter')

  if (!response.ok) {
    const body = await response.text()
    console.error('OpenRouter upstream error:', response.status, body)
    throw new Error(buildClaudeGatewayErrorMessage(response.status, body, getOpenRouterProviderName()))
  }

  return extractGatewayResult(await response.json(), 'openrouter')
}

export async function transcribeAudio(
  file: File,
  language = 'zh',
  responseFormat: 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt' = 'text',
  requestOptions?: GatewayRequestOptions
) {
  if (getGroqApiKey()) {
    try {
      return await transcribeAudioViaGroq(file, language, responseFormat)
    } catch (primaryError) {
      if (getWhisperGatewayApiKey()) {
        try {
          return await transcribeAudioViaYunwu(file, language, responseFormat, requestOptions)
        } catch (fallbackError) {
          throw new Error(`Groq Whisper 请求失败，且云雾兜底也失败。兜底失败原因：${fallbackError instanceof Error ? fallbackError.message : '未知错误'}`)
        }
      }
      throw primaryError
    }
  }

  return transcribeAudioViaYunwu(file, language, responseFormat, requestOptions)
}

export async function transcribeAudioDetailed(
  file: File,
  language = 'zh',
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  if (getGroqApiKey()) {
    try {
      return await transcribeAudioDetailedViaGroq(file, language)
    } catch (primaryError) {
      if (getWhisperGatewayApiKey()) {
        try {
          return await transcribeAudioDetailedViaYunwu(file, language, requestOptions)
        } catch (fallbackError) {
          throw new Error(`Groq Whisper 请求失败，且云雾兜底也失败。兜底失败原因：${fallbackError instanceof Error ? fallbackError.message : '未知错误'}`)
        }
      }
      throw primaryError
    }
  }

  return transcribeAudioDetailedViaYunwu(file, language, requestOptions)
}

export async function transcribeAudioDetailedFromUrl(
  sourceUrl: string,
  language = 'zh',
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  return transcribeAudioDetailedViaGroqUrl(sourceUrl, language, requestOptions)
}

export async function transcribeAudioDetailedViaBackupProvider(
  file: File,
  language = 'zh',
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  if (getWhisperGatewayApiKey()) {
    return transcribeAudioDetailedViaYunwu(file, language, requestOptions)
  }

  return transcribeAudioDetailedViaGroq(file, language)
}

export async function generateClaudeTextDetailed(options: GenerateClaudeTextOptions): Promise<GenerateClaudeTextResult> {
  if (getOpenRouterApiKey()) {
    try {
      return await generateClaudeTextViaOpenRouter(options)
    } catch (primaryError) {
      if (getClaudeGatewayApiKey()) {
        try {
          return await generateClaudeTextViaYunwu(options)
        } catch (fallbackError) {
          throw new Error(`OpenRouter Claude 请求失败，且云雾兜底也失败。兜底失败原因：${fallbackError instanceof Error ? fallbackError.message : '未知错误'}`)
        }
      }
      throw primaryError
    }
  }

  if (getClaudeGatewayApiKey()) {
    return generateClaudeTextViaYunwu(options)
  }

  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: normalizeClaudeModelForGateway(options.model),
    max_tokens: options.maxTokens,
    system: options.system,
    messages: options.messages,
  })

  const content = message.content.find((item) => item.type === 'text')
  if (!content) {
    throw new Error('Claude 返回中缺少文本内容')
  }

  return {
    text: content.text.trim(),
    finishReason: typeof message.stop_reason === 'string' ? message.stop_reason : null,
    provider: 'anthropic',
  }
}

export async function generateClaudeText(options: GenerateClaudeTextOptions) {
  const result = await generateClaudeTextDetailed(options)
  return result.text
}
