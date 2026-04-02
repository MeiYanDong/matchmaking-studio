const RETRYABLE_ERROR_PATTERNS = [
  'fetch failed',
  'timeout',
  'timed out',
  'econnreset',
  'socket',
  'network',
  'connect',
  'und_err',
  'etimedout',
]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }

  return String(error ?? '')
}

export function isRetryableSupabaseError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

export async function withSupabaseRetry<T extends { error?: unknown | null }>(
  operation: () => PromiseLike<T>,
  options: {
    attempts?: number
    baseDelayMs?: number
    label?: string
  } = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 200,
    label = 'supabase operation',
  } = options

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation()

      if (!result?.error || !isRetryableSupabaseError(result.error) || attempt === attempts) {
        return result
      }

      console.warn(
        `[supabase] ${label} failed on attempt ${attempt}/${attempts}, retrying: ${getErrorMessage(result.error)}`
      )
    } catch (error) {
      if (!isRetryableSupabaseError(error) || attempt === attempts) {
        throw error
      }

      console.warn(
        `[supabase] ${label} threw on attempt ${attempt}/${attempts}, retrying: ${getErrorMessage(error)}`
      )
    }

    await wait(baseDelayMs * attempt * attempt)
  }

  return operation()
}
