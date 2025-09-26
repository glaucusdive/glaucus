export const useScrollPosition = () => {
  const saveScrollPosition = (key: string) => {
    if (process.client) {
      const scrollContainer = document.querySelector('.overflow-scroll')
      if (scrollContainer) {
        sessionStorage.setItem(`scroll-${key}`, scrollContainer.scrollTop.toString())
      }
    }
  }

  const restoreScrollPosition = (key: string) => {
    if (process.client) {
      const savedPosition = sessionStorage.getItem(`scroll-${key}`)
      if (savedPosition) {
        // Use nextTick to ensure DOM is ready
        nextTick(() => {
          const scrollContainer = document.querySelector('.overflow-scroll')
          if (scrollContainer) {
            scrollContainer.scrollTop = parseInt(savedPosition, 10)
          }
        })
      }
    }
  }

  const clearScrollPosition = (key: string) => {
    if (process.client) {
      sessionStorage.removeItem(`scroll-${key}`)
    }
  }

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  }
}
