export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { isSignedIn, loading, init } = useAuth()
  await init()
  if (!loading.value && !isSignedIn.value) {
    return navigateTo({ path: '/auth', query: { redirect: to.fullPath } })
  }
})
