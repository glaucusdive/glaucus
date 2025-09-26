export const useScrollPosition = () => {
  const saveScrollPosition = (key: string) => {
    if (process.client) {
      try {
        const scrollContainer = document.querySelector('.overflow-scroll')
        if (scrollContainer) {
          sessionStorage.setItem(`scroll-${key}`, scrollContainer.scrollTop.toString())
        }
      } catch (error) {
        console.warn('Failed to save scroll position:', error)
      }
    }
  }

  const restoreScrollPosition = (key: string) => {
    if (process.client) {
      try {
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
      } catch (error) {
        console.warn('Failed to restore scroll position:', error)
      }
    }
  }

  const clearScrollPosition = (key: string) => {
    if (process.client) {
      try {
        sessionStorage.removeItem(`scroll-${key}`)
      } catch (error) {
        console.warn('Failed to clear scroll position:', error)
      }
    }
  }

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  }
}
