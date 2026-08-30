/**
 * True when the request carries a Supabase session cookie (signed-in or stale session).
 * Used on SSR for `/` so guests get marketing HTML while likely-authenticated users keep the bootstrap shell.
 */
export function hasSupabaseAuthCookie (cookieHeader: string | undefined | null): boolean {
  if (!cookieHeader) return false
  return /(?:^|;\s*)sb-[^=]+-auth-token=/.test(cookieHeader)
}
