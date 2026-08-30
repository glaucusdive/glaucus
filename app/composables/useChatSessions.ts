import { ref, computed } from 'vue'
import {
  readChatsRoot,
  ensureChatsRoot,
  archiveActiveAndStartNewChatsRoot,
  setActiveSessionIdChatsRoot,
  persistActiveChatsRoot,
  type SearchCacheState
} from '~/composables/useSearchCache'

const pendingNewChat = ref(false)
const pendingSwitchSessionId = ref<string | null>(null)
const sidebarTick = ref(0)

export function notifyChatSidebarUpdated () {
  sidebarTick.value++
}

export function useChatSessions () {
  const sidebarChats = computed(() => {
    sidebarTick.value
    const root = readChatsRoot()
    if (!root) return [] as Array<{ id: string; title: string; updatedAt: number; isActive: boolean }>
    const activeId = root.activeSessionId
    return root.sessions
      .filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      .map(s => ({
        id: s.id,
        title: s.title || 'Chat',
        updatedAt: s.updatedAt,
        isActive: s.id === activeId
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
  })

  function requestNewChat () {
    pendingNewChat.value = true
  }

  function requestSwitchSession (id: string) {
    pendingSwitchSessionId.value = id
  }

  function consumePendingNewChat (): boolean {
    if (!pendingNewChat.value) return false
    pendingNewChat.value = false
    return true
  }

  function consumePendingSwitch (): string | null {
    const id = pendingSwitchSessionId.value
    pendingSwitchSessionId.value = null
    return id
  }

  /** For index.vue: apply archive + new empty active from current page payload. */
  function applyNewChatFromPage (pageState: Omit<SearchCacheState, 'timestamp'>): ChatsRoot {
    let root = readChatsRoot() ?? ensureChatsRoot()
    root = archiveActiveAndStartNewChatsRoot(root, pageState)
    notifyChatSidebarUpdated()
    return root
  }

  function applySwitchFromPage (sessionId: string, pageState: Omit<SearchCacheState, 'timestamp'>): ChatsRoot | null {
    let root = readChatsRoot() ?? ensureChatsRoot()
    root = persistActiveChatsRoot(root, pageState)
    const switched = setActiveSessionIdChatsRoot(root, sessionId)
    if (!switched) return null
    notifyChatSidebarUpdated()
    return switched
  }

  return {
    sidebarChats,
    pendingNewChat,
    pendingSwitchSessionId,
    requestNewChat,
    requestSwitchSession,
    consumePendingNewChat,
    consumePendingSwitch,
    applyNewChatFromPage,
    applySwitchFromPage
  }
}
