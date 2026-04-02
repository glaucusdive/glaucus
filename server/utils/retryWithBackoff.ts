/**
 * Bounded retries with exponential backoff. Retries on any thrown error unless
 * `shouldSkipRetry` returns true (e.g. validation / missing config).
 */
export interface RunWithRetriesOptions {
  maxAttempts: number
  baseDelayMs: number
  /** 0–1 fraction of delay to randomize (default 0.2) */
  jitterRatio?: number
  shouldSkipRetry?: (error: unknown) => boolean
  onRetry?: (info: { attempt: number; maxAttempts: number; error: unknown }) => void
}

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function delayForAttempt (attemptIndex: number, baseDelayMs: number, jitterRatio: number): number {
  const exp = baseDelayMs * Math.pow(2, attemptIndex)
  const jitter = exp * jitterRatio * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(exp + jitter))
}

export async function runWithRetries<T> (
  fn: () => Promise<T>,
  options: RunWithRetriesOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    jitterRatio = 0.2,
    shouldSkipRetry,
    onRetry
  } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (shouldSkipRetry?.(error)) {
        throw error
      }
      if (attempt >= maxAttempts) {
        throw error
      }
      onRetry?.({ attempt, maxAttempts, error })
      await sleep(delayForAttempt(attempt - 1, baseDelayMs, jitterRatio))
    }
  }
  throw lastError
}
