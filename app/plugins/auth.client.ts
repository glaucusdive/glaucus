export default defineNuxtPlugin(() => {
  const { init, onAuthStateChange } = useAuth()
  init()
  onAuthStateChange(() => {})
})
