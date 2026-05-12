import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const userRole = ref<'standard' | 'admin'>('standard')

export const useAuth = () => {
  const { client } = useSupabase()

  const isSignedIn = computed(() => !!user.value)

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
      userRole.value = data?.role === 'admin' ? 'admin' : 'standard'
    } catch {
      userRole.value = 'standard'
    }
  }

  async function init () {
    loading.value = true
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
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const redirectTo = redirectPath ? `${base}${redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath}` : `${base}/`
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) throw error
  }

  async function signUpWithEmail (email: string, password: string, displayName?: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        ...(displayName ? { data: { display_name: displayName } } : {}),
        emailRedirectTo: origin ? `${origin}/` : undefined
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
      options: { emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/` }
    })
    if (error) throw error
    return data
  }

  async function signOut () {
    const { error } = await client.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
    userRole.value = 'standard'
  }

  /** Access token for API calls (Authorization: Bearer <token>) */
  const accessToken = computed(() => session.value?.access_token ?? null)

  /** Matches RLS public.is_app_admin(): set profiles.role = 'admin' in the Supabase Table Editor */
  const isAppAdmin = computed(() => userRole.value === 'admin')

  return {
    user,
    session,
    loading,
    isSignedIn,
    isAppAdmin,
    accessToken,
    init,
    onAuthStateChange,
    refreshUserRole: loadUserRole,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInWithMagicLink,
    signOut
  }
}
