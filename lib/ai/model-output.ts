import { jsonrepair } from 'jsonrepair'

export function stripJsonCodeFence(text: string) {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
}

function findBalancedJsonCandidate(text: string) {
  const normalized = stripJsonCodeFence(text)
  const startIndex = normalized.search(/[{[]/)

  if (startIndex === -1) {
    return ''
  }

  const opening = normalized[startIndex]
  const closing = opening === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = startIndex; index < normalized.length; index += 1) {
    const char = normalized[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === '"') {
        inString = false
      }

      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === opening) {
      depth += 1
      continue
    }

    if (char === closing) {
      depth -= 1
      if (depth === 0) {
        return normalized.slice(startIndex, index + 1)
      }
    }
  }

  return normalized.slice(startIndex)
}

function tryParseCandidate(candidate: string) {
  return JSON.parse(candidate)
}

export function parseJsonFromModelOutput(text: string) {
  const stripped = stripJsonCodeFence(text)
  const candidate = findBalancedJsonCandidate(stripped)
  const parseCandidates = Array.from(new Set([stripped, candidate].filter(Boolean)))
  const repairCandidates = Array.from(new Set([candidate, stripped].filter(Boolean)))
  let lastError: unknown

  for (const item of parseCandidates) {
    try {
      return tryParseCandidate(item)
    } catch (error) {
      lastError = error
    }
  }

  for (const item of repairCandidates) {
    try {
      return tryParseCandidate(jsonrepair(item))
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new SyntaxError('Unable to parse model output as JSON')
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
