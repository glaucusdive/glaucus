import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

export const useAuth = () => {
  const { client } = useSupabase()

  const isSignedIn = computed(() => !!user.value)

  async function init () {
    loading.value = true
    try {
      const { data: { session: s } } = await client.auth.getSession()
      session.value = s
      user.value = s?.user ?? null
    } finally {
      loading.value = false
    }
  }

  function onAuthStateChange (callback: (event: string, s: Session | null) => void) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, s) => {
      session.value = s
      user.value = s?.user ?? null
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
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined
    })
    if (error) throw error
    return data
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
  }

  /** Access token for API calls (Authorization: Bearer <token>) */
  const accessToken = computed(() => session.value?.access_token ?? null)

  return {
    user,
    session,
    loading,
    isSignedIn,
    accessToken,
    init,
    onAuthStateChange,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInWithMagicLink,
    signOut
  }
}
