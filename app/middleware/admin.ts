/** Signed-in app admins only (profiles.role = 'admin'). */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { isSignedIn, isAppAdmin, loading, init } = useAuth()
  await init()
  if (!loading.value && !isSignedIn.value) {
    return navigateTo({ path: '/auth', query: { redirect: to.fullPath } })
  }
  if (!loading.value && !isAppAdmin.value) {
    return navigateTo('/')
  }
})
