import { describe, expect, it, vi } from 'vitest'
import { runWithRetries } from './retryWithBackoff'

describe('runWithRetries', () => {
  it('returns on first success', async () => {
    const fn = vi.fn().mockResolvedValueOnce(42)
    await expect(runWithRetries(fn, { maxAttempts: 3, baseDelayMs: 1 })).resolves.toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('ok')
    await expect(runWithRetries(fn, { maxAttempts: 3, baseDelayMs: 1 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always'))
    await expect(runWithRetries(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow('always')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('skips retry when shouldSkipRetry returns true', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'))
    await expect(
      runWithRetries(fn, {
        maxAttempts: 4,
        baseDelayMs: 1,
        shouldSkipRetry: () => true
      })
    ).rejects.toThrow('nope')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
