/** Profile contact fields used to prefill booking payload (chat + server). */
export type ProfileContactPrefill = {
  name?: string | null
  email?: string | null
}

/** Fill empty booking contact fields from the signed-in user's profile (never overwrite user-entered values). */
export function mergeProfileContactIntoBookingPayload<T extends Record<string, unknown>> (
  payload: T | null | undefined,
  profile: ProfileContactPrefill | null | undefined
): T {
  const base = (payload && typeof payload === 'object' ? { ...payload } : {}) as T
  if (!profile) return base
  const out = { ...base } as T & { name?: string, email?: string }
  const profileName = profile.name != null ? String(profile.name).trim() : ''
  const profileEmail = profile.email != null ? String(profile.email).trim() : ''
  if (profileName && !String(out.name ?? '').trim()) {
    out.name = profileName
  }
  if (profileEmail && !String(out.email ?? '').trim()) {
    out.email = profileEmail
  }
  return out as T
}
