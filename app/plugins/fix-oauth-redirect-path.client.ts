import { normalizeAuthRedirect } from '~/utils/authRedirect'

/**
 * Recover from OAuth return URLs where redirect was double-encoded
 * (e.g. localhost:3000/%2F%3FbookingResume%3D1#access_token=...).
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return
  const { pathname, search, hash } = window.location
  if (!pathname.includes('%')) return

  const target = normalizeAuthRedirect(pathname + search)
  const current = pathname + search
  if (target === current) return

  window.location.replace(`${target}${hash}`)
})
