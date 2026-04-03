export function stripJsonCodeFence(text: string) {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
}

export function parseJsonFromModelOutput(text: string) {
  return JSON.parse(stripJsonCodeFence(text))
}

export function isLikelyTruncatedJsonOutput(text: string, error: unknown, finishReason?: string | null) {
  const normalizedText = stripJsonCodeFence(text)
  const normalizedReason = String(finishReason ?? '').trim().toLowerCase()
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase()

  if (normalizedReason === 'length' || normalizedReason === 'max_tokens') {
    return true
  }

  if (message.includes('unterminated string') || message.includes('unexpected end of json input')) {
    return true
  }

  if (!normalizedText.startsWith('{')) {
    return false
  }

  return !normalizedText.endsWith('}')
}
