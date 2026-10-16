import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { normalizeAuthRedirect, DEFAULT_AUTH_REDIRECT } from '~/utils/authRedirect'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const userRole = ref<'standard' | 'divemaster' | 'admin'>('standard')
/** After setPassword, identities may lag; keep true until sign-out. */
const passwordAttachedThisSession = ref(false)

const MIN_PASSWORD_LENGTH = 8

function authOrigin (): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function providerLabelsFromUser (u: User | null | undefined): string[] {
  const identities = u?.identities ?? []
  const labels = new Set<string>()
  for (const identity of identities) {
    const p = identity.provider
    if (p === 'email') labels.add('Email')
    else if (p === 'google') labels.add('Google')
    else if (p) labels.add(p.charAt(0).toUpperCase() + p.slice(1))
  }
  const providers = u?.app_metadata?.providers
  if (Array.isArray(providers)) {
    for (const p of providers) {
      if (p === 'email') labels.add('Email')
      else if (p === 'google') labels.add('Google')
    }
  }
  if (passwordAttachedThisSession.value) labels.add('Email')
  return [...labels]
}

export const useAuth = () => {
  const { client } = useSupabase()

  const isSignedIn = computed(() => !!session.value)

  /** True when the user can sign in with email + password (email identity or providers list). */
  const hasEmailPasswordAuth = computed(() => {
    if (passwordAttachedThisSession.value) return true
    const u = user.value
    if (!u) return false
    if ((u.identities ?? []).some(i => i.provider === 'email')) return true
    const providers = u.app_metadata?.providers
    return Array.isArray(providers) && providers.includes('email')
  })

  const linkedProviderLabels = computed(() => providerLabelsFromUser(user.value))

  async function loadUserRole () {
    const id = user.value?.id
    if (!id) {
      userRole.value = 'standard'
      return
    }
    try {
      const { data } = await client
        .from('profiles')
        .select('role')
        .eq('id', id)
        .maybeSingle()
      const role = data?.role
      userRole.value = role === 'admin' || role === 'divemaster' ? role : 'standard'
    } catch {
      userRole.value = 'standard'
    }
  }

  async function refreshUser () {
    const { data, error } = await client.auth.getUser()
    if (error) throw error
    user.value = data.user
    const { data: { session: s } } = await client.auth.getSession()
    session.value = s
    await loadUserRole()
    return data.user
  }

  async function init () {
    try {
      const { data: { session: s } } = await client.auth.getSession()
      session.value = s
      user.value = s?.user ?? null
      await loadUserRole()
    } finally {
      loading.value = false
    }
  }

  function onAuthStateChange (callback: (event: string, s: Session | null) => void) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, s) => {
      session.value = s
      user.value = s?.user ?? null
      void loadUserRole()
      callback(event, s)
    })
    return () => subscription.unsubscribe()
  }

  async function signInWithGoogle (redirectPath?: string) {
    const base = authOrigin()
    const path = normalizeAuthRedirect(redirectPath)
    const redirectTo = `${base}${path}`
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) throw error
  }

  async function signUpWithEmail (email: string, password: string, displayName?: string) {
    const origin = authOrigin()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        ...(displayName ? { data: { display_name: displayName } } : {}),
        emailRedirectTo: origin ? `${origin}${DEFAULT_AUTH_REDIRECT}` : undefined
      }
    })
    if (error) throw error
    /**
     * With "Confirm email" on, GoTrue hides duplicate signups: HTTP 200 and either no user, or a
     * sanitized fake user with empty `identities` (no confirmation email is sent). A real new
     * signup still includes at least one identity (email) before the user confirms.
     */
    const obfuscatedDuplicate =
      !data.user || !Array.isArray(data.user.identities) || data.user.identities.length === 0
    return { ...data, obfuscatedDuplicate }
  }

  async function signInWithEmail (email: string, password: string) {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithMagicLink (email: string) {
    const { data, error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${authOrigin()}${DEFAULT_AUTH_REDIRECT}` }
    })
    if (error) throw error
    return data
  }

  /**
   * Attach or change password on the current user (works for Google-only accounts).
   * Same auth.users row; admin role on profiles is unchanged.
   */
  async function setPassword (password: string) {
    const trimmed = password.trim()
    if (trimmed.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    const { data, error } = await client.auth.updateUser({ password: trimmed })
    if (error) throw error
    passwordAttachedThisSession.value = true
    user.value = data.user
    await refreshUser()
    return data.user
  }

  async function requestPasswordReset (email: string) {
    const origin = authOrigin()
    const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: origin ? `${origin}/auth?reset=1` : undefined
    })
    if (error) throw error
    return data
  }

  async function signOut () {
    const { error } = await client.auth.signOut()
    if (error) {
      const name = (error as { name?: string }).name
      if (name === 'AuthSessionMissingError') {
        await client.auth.signOut({ scope: 'local' }).catch(() => {})
      } else {
        throw error
      }
    }
    user.value = null
    session.value = null
    userRole.value = 'standard'
    passwordAttachedThisSession.value = false
  }

  /** Access token for API calls (Authorization: Bearer <token>) */
  const accessToken = computed(() => session.value?.access_token ?? null)

  /** Matches RLS public.is_app_admin(): set profiles.role = 'admin' in the Supabase Table Editor */
  const isAppAdmin = computed(() => userRole.value === 'admin')
  const isDivemaster = computed(() => userRole.value === 'divemaster')

  return {
    user,
    session,
    loading,
    isSignedIn,
    isAppAdmin,
    isDivemaster,
    accessToken,
    hasEmailPasswordAuth,
    linkedProviderLabels,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    init,
    onAuthStateChange,
    refreshUserRole: loadUserRole,
    refreshUser,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInWithMagicLink,
    setPassword,
    requestPasswordReset,
    signOut
  }
}
