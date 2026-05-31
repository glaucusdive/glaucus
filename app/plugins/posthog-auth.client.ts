import type { Session } from '@supabase/supabase-js'
import { AnalyticsEvents } from '~/composables/useAnalytics'

function authMethodFromSession (session: Session | null): string {
  const provider = session?.user?.app_metadata?.provider
  if (provider === 'google') return 'google'
  return 'email'
}

export default defineNuxtPlugin(() => {
  const { user, onAuthStateChange } = useAuth()
  const { identifyUser, resetUser, capture, isEnabled } = useAnalytics()

  watch(
    user,
    (u) => {
      if (u) identifyUser(u)
      else resetUser()
    },
    { immediate: true }
  )

  onAuthStateChange((event, session) => {
    if (!isEnabled.value) return
    if (event === 'SIGNED_IN' && session?.user) {
      capture(AnalyticsEvents.AUTH_SIGNED_IN, {
        method: authMethodFromSession(session)
      })
    }
    if (event === 'SIGNED_OUT') {
      resetUser()
    }
  })
})
