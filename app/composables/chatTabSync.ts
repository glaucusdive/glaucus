import {
  readChatsRoot,
  writeChatsRoot,
  normalizeRoot,
  rootMaxUpdatedAt,
  resetChatsRootForSignOut,
  type ChatsRoot
} from '~/composables/useSearchCache'
import { requestChatRemoteHydrate } from '~/composables/userChatsRemote'
import { notifyChatSidebarUpdated } from '~/composables/useChatSessions'
import {
  dispatchSignOutChatResetEvent,
  isSignOutChatResetActive,
  runWithSignOutChatReset
} from '~/composables/signOutChatReset'

const CHANNEL_NAME = 'glaucus-chats-sync'

let channel: BroadcastChannel | null = null
let applyingBroadcast = false

export function initChatTabSync () {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  if (channel) return

  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (ev) => {
    const data = ev.data as { type?: string; root?: ChatsRoot } | null
    if (!data?.type) return

    if (data.type === 'sign-out-clear') {
      if (isSignOutChatResetActive()) return
      runWithSignOutChatReset(() => {
        applyingBroadcast = true
        try {
          resetChatsRootForSignOut()
          dispatchSignOutChatResetEvent()
          notifyChatSidebarUpdated()
          requestChatRemoteHydrate()
        } finally {
          applyingBroadcast = false
        }
      })
      return
    }

    if (data.type !== 'chats-root' || !data.root) return
    if (isSignOutChatResetActive()) return

    const incoming = normalizeRoot(data.root)
    const local = readChatsRoot()
    if (local && rootMaxUpdatedAt(local) >= rootMaxUpdatedAt(incoming)) return

    applyingBroadcast = true
    try {
      writeChatsRoot(incoming, { skipRemote: true })
    } finally {
      applyingBroadcast = false
    }
    requestChatRemoteHydrate()
  }
}

export function broadcastSignOutClear () {
  if (typeof window === 'undefined' || !channel || applyingBroadcast) return
  try {
    channel.postMessage({ type: 'sign-out-clear' })
  } catch {
    /* ignore */
  }
}

export function broadcastChatsRoot (root: ChatsRoot) {
  if (typeof window === 'undefined' || !channel || applyingBroadcast) return
  try {
    channel.postMessage({ type: 'chats-root', root: normalizeRoot(root) })
  } catch {
    /* ignore */
  }
}
