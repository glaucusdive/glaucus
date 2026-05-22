/**
 * Normalize `?redirect=` from /auth (and OAuth return URLs).
 * Callers must not pre-encode — vue-router encodes query values.
 */
export function normalizeAuthRedirect (
  raw: string | null | undefined,
  fallback = '/'
): string {
  if (!raw || typeof raw !== 'string') return fallback
  let s = raw.trim()
  if (!s) return fallback

  // Reject off-site redirects (allow `//?query` from legacy double-encoded paths)
  if (s.includes('://')) return fallback
  if (/^\/\/[^/?#]/.test(s)) return fallback

  try {
    while (s.includes('%')) {
      const decoded = decodeURIComponent(s)
      if (decoded === s) break
      s = decoded
    }
  } catch {
    return fallback
  }

  if (!s.startsWith('/')) {
    s = s.startsWith('?') ? `/${s}` : `/${s}`
  }

  // OAuth typo: decoded `//?query` → `/?query`
  if (s.startsWith('//')) {
    s = s.replace(/^\/+/, '/')
  }

  return s
}
