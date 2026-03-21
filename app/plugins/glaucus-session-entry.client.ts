/**
 * Captures pathname at first client load of this document (before any in-app navigation).
 * Used so the chat boot loader only runs on cold entry to `/`, not when returning from profile/auth.
 */
export default defineNuxtPlugin({
  name: 'glaucus-session-entry',
  enforce: 'pre',
  setup () {
    const sessionEntryPath = useState('glaucus-session-entry-path', () => '')
    if (typeof window !== 'undefined' && sessionEntryPath.value === '') {
      sessionEntryPath.value = window.location.pathname || '/'
    }
  }
})
