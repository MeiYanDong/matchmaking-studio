import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import {
  buildClaudeGatewayErrorMessage,
  buildWhisperEmptyTranscriptMessage,
  buildWhisperGatewayErrorMessage,
  inferGatewayProviderName,
  normalizeSecretValue,
  shouldFallbackToOfficialOpenAI,
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

type GatewayRequestOptions = {
  idempotencyKey?: string
}

export type DetailedTranscriptionResult = {
  text: string
  verboseJson: unknown | null
}

let envBootstrapped = false

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

function getGatewayBaseUrl() {
  return (
    readEnv('YUNWU_API_BASE_URL')
    || readEnv('AI_API_BASE_URL')
    || 'https://yunwu.ai'
  ).replace(/\/+$/, '')
}

function getGatewayProviderName() {
  return inferGatewayProviderName(getGatewayBaseUrl())
}

function getWhisperGatewayApiKey() {
  return (
    readEnv('marry_whisper_YUNWU_API_KEY')
    || readEnv('MARRY_WHISPER_API_KEY')
    || readEnv('marry_whisper_TUZI_API_KEY')
    || readEnv('API_KEY')
  )
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

function getOpenAIApiKey() {
  return readEnv('OPENAI_API_KEY')
}

function getAnthropicApiKey() {
  return readEnv('ANTHROPIC_API_KEY')
}

function getOpenAIClient() {
  const gatewayApiKey = getWhisperGatewayApiKey()
  if (gatewayApiKey) {
    return new OpenAI({
      apiKey: gatewayApiKey,
      baseURL: `${getGatewayBaseUrl()}/v1`,
    })
  }

  const openAIApiKey = getOpenAIApiKey()
  if (!openAIApiKey) {
    throw new Error('缺少 OPENAI_API_KEY、marry_whisper_YUNWU_API_KEY、MARRY_WHISPER_API_KEY、marry_whisper_TUZI_API_KEY 或 API_KEY')
  }

  return new OpenAI({ apiKey: openAIApiKey })
}

function getOfficialOpenAIClient() {
  const openAIApiKey = getOpenAIApiKey()
  if (!openAIApiKey) {
    throw new Error('缺少 OPENAI_API_KEY')
  }

  return new OpenAI({ apiKey: openAIApiKey })
}

function getAnthropicClient() {
  const anthropicApiKey = getAnthropicApiKey()
  if (!anthropicApiKey) {
    throw new Error('缺少 ANTHROPIC_API_KEY。注意：当前主链路优先走聚合网关 Claude key（marry_claude_YUNWU_API_KEY / MARRY_CLAUDE_API_KEY / marry_claude_TUZI_API_KEY / API_KEY）；ANTHROPIC_API_KEY 只在你显式启用官方兜底时才需要。')
  }

  return new Anthropic({ apiKey: anthropicApiKey })
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

async function transcribeAudioViaOfficialOpenAI(
  file: File,
  language: string,
  responseFormat: 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt'
) {
  const openai = getOfficialOpenAIClient()
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: responseFormat,
  })

  if (typeof transcription === 'string') return transcription

  const text = (transcription as { text?: string }).text
  if (typeof text === 'string') return text

  throw new Error('音频转录结果缺少 text 字段')
}

async function transcribeAudioDetailedViaOfficialOpenAI(
  file: File,
  language: string
): Promise<DetailedTranscriptionResult> {
  const openai = getOfficialOpenAIClient()
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'verbose_json',
  })

  if (typeof transcription === 'string') {
    return { text: transcription, verboseJson: null }
  }

  const text = (transcription as { text?: string }).text
  if (typeof text !== 'string') {
    throw new Error('音频转录结果缺少 text 字段')
  }

  return {
    text: text.trim(),
    verboseJson: transcription,
  }
}

async function transcribeAudioViaGateway(
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

  const response = await fetch(`${getGatewayBaseUrl()}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      ...(requestOptions?.idempotencyKey
        ? { 'Idempotency-Key': requestOptions.idempotencyKey }
        : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.text()
    const hasOfficialFallback = Boolean(getOpenAIApiKey())
    if (hasOfficialFallback && shouldFallbackToOfficialOpenAI(response.status, body)) {
      try {
        return await transcribeAudioViaOfficialOpenAI(file, language, responseFormat)
      } catch (fallbackError) {
        throw new Error(
          `${buildWhisperGatewayErrorMessage(response.status, body, true, getGatewayProviderName())} 兜底失败原因：${fallbackError instanceof Error ? fallbackError.message : '未知错误'}`
        )
      }
    }
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        hasOfficialFallback,
        getGatewayProviderName()
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
          buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
        )
      }
      return rawText
    }

    if (typeof data === 'string') {
      const text = data.trim()
      if (!text && getOpenAIApiKey()) {
        return transcribeAudioViaOfficialOpenAI(file, language, responseFormat)
      }
      if (!text) {
        throw new Error(
          buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
        )
      }
      return text
    }

    if (data && typeof data === 'object' && 'text' in data && typeof data.text === 'string') {
      const text = data.text.trim()
      if (!text && getOpenAIApiKey()) {
        return transcribeAudioViaOfficialOpenAI(file, language, responseFormat)
      }
      if (!text) {
        throw new Error(
          buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
        )
      }
      return text
    }

    return JSON.stringify(data)
  }

  if (!rawText) {
    throw new Error(
      buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
    )
  }

  return rawText
}

async function transcribeAudioDetailedViaGateway(
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

  const response = await fetch(`${getGatewayBaseUrl()}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      ...(requestOptions?.idempotencyKey
        ? { 'Idempotency-Key': requestOptions.idempotencyKey }
        : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.text()
    const hasOfficialFallback = Boolean(getOpenAIApiKey())
    if (hasOfficialFallback && shouldFallbackToOfficialOpenAI(response.status, body)) {
      try {
        return await transcribeAudioDetailedViaOfficialOpenAI(file, language)
      } catch (fallbackError) {
        throw new Error(
          `${buildWhisperGatewayErrorMessage(response.status, body, true, getGatewayProviderName())} 兜底失败原因：${fallbackError instanceof Error ? fallbackError.message : '未知错误'}`
        )
      }
    }
    throw new Error(
      buildWhisperGatewayErrorMessage(
        response.status,
        body,
        hasOfficialFallback,
        getGatewayProviderName()
      )
    )
  }

  const rawText = (await response.text()).trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    if (!rawText && getOpenAIApiKey()) {
      return transcribeAudioDetailedViaOfficialOpenAI(file, language)
    }
    if (!rawText) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
      )
    }
    return { text: rawText, verboseJson: null }
  }

  if (typeof parsed === 'string') {
    const text = parsed.trim()
    if (!text && getOpenAIApiKey()) {
      return transcribeAudioDetailedViaOfficialOpenAI(file, language)
    }
    if (!text) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
      )
    }
    return { text, verboseJson: null }
  }

  if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string') {
    const text = parsed.text.trim()
    if (!text && getOpenAIApiKey()) {
      return transcribeAudioDetailedViaOfficialOpenAI(file, language)
    }
    if (!text) {
      throw new Error(
        buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
      )
    }
    return { text, verboseJson: parsed }
  }

  if (!rawText) {
    throw new Error(
      buildWhisperEmptyTranscriptMessage(Boolean(getOpenAIApiKey()), getGatewayProviderName())
    )
  }

  return { text: rawText, verboseJson: parsed }
}

async function generateClaudeTextViaGateway(options: GenerateClaudeTextOptions) {
  const gatewayApiKey = getClaudeGatewayApiKey()
  if (!gatewayApiKey) {
    throw new Error('缺少 marry_claude_YUNWU_API_KEY、MARRY_CLAUDE_API_KEY、marry_claude_TUZI_API_KEY、marry_claude_TUZI_API_KET 或 API_KEY')
  }

  const response = await fetch(`${getGatewayBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens,
      ...(options.responseFormat === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {}),
      messages: [
        ...(options.system ? [{ role: 'system' as const, content: options.system.trim() }] : []),
        ...options.messages,
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('Claude gateway upstream error:', response.status, body)
    throw new Error(buildClaudeGatewayErrorMessage(response.status, body, getGatewayProviderName()))
  }

  return extractGatewayText(await response.json())
}

export async function transcribeAudio(
  file: File,
  language = 'zh',
  responseFormat: 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt' = 'text',
  requestOptions?: GatewayRequestOptions
) {
  if (getWhisperGatewayApiKey()) {
    return transcribeAudioViaGateway(file, language, responseFormat, requestOptions)
  }

  return transcribeAudioViaOfficialOpenAI(file, language, responseFormat)
}

export async function transcribeAudioDetailed(
  file: File,
  language = 'zh',
  requestOptions?: GatewayRequestOptions
): Promise<DetailedTranscriptionResult> {
  if (getWhisperGatewayApiKey()) {
    return transcribeAudioDetailedViaGateway(file, language, requestOptions)
  }

  return transcribeAudioDetailedViaOfficialOpenAI(file, language)
}

export async function generateClaudeText(options: GenerateClaudeTextOptions) {
  if (getClaudeGatewayApiKey()) {
    return generateClaudeTextViaGateway(options)
  }

  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: options.model,
    max_tokens: options.maxTokens,
    system: options.system,
    messages: options.messages,
  })

  const content = message.content.find((item) => item.type === 'text')
  if (!content) {
    throw new Error('Claude 返回中缺少文本内容')
  }

  return content.text.trim()
}
