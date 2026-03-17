interface SearchCacheState {
  messages: any[]
  userInput: string
  lastQuery: string | null
  timestamp: number
  /** Restore selected shop (detail panel) on load */
  selectedShopId?: string | null
  mobileDetailShopId?: string | null
  /** Restore booking form drawer if it was open */
  drawerOpen?: boolean
  drawerShopId?: string | null
  drawerShopName?: string | null
}

const STORAGE_KEY = 'glaucus-ai-search-cache'

const readCache = (): SearchCacheState | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as SearchCacheState
    if (!parsed || typeof parsed !== 'object') return null

    return parsed
  } catch (error) {
    console.warn('[SearchCache] Failed to read cache', error)
    return null
  }
}

const writeCache = (state: SearchCacheState) => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('[SearchCache] Failed to write cache', error)
  }
}

const removeCache = () => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[SearchCache] Failed to clear cache', error)
  }
}

export const useSearchCache = () => {
  const getCache = () => readCache()

  const setCache = (state: Omit<SearchCacheState, 'timestamp'>) => {
    writeCache({
      messages: state.messages ?? [],
      userInput: state.userInput ?? '',
      lastQuery: state.lastQuery ?? null,
      timestamp: Date.now(),
      selectedShopId: state.selectedShopId ?? null,
      mobileDetailShopId: state.mobileDetailShopId ?? null,
      drawerOpen: state.drawerOpen ?? false,
      drawerShopId: state.drawerShopId ?? null,
      drawerShopName: state.drawerShopName ?? null
    })
  }

  const clearCache = () => {
    removeCache()
  }

  return {
    getCache,
    setCache,
    clearCache
  }
}

