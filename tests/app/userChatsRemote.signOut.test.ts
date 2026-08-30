import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BOOKING_RESUME_SESSION_KEY } from '../../shared/bookingPreSendTokens'

const STORE_KEY = 'glaucus-chats-v1'
const PENDING_DRAFT_RESUME_KEY = 'glaucus-pending-draft-resume'
const FORCE_NEW_CHAT_KEY = 'glaucus-force-new-chat'

function createSessionStorage () {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    _store: store
  }
}

const sessionStorage = vi.hoisted(() => createSessionStorage())

vi.stubGlobal('window', {
  sessionStorage,
  dispatchEvent: vi.fn()
})

import {
  clearLocalChatsAfterSignOut,
  chatRemoteHydrateTick
} from '../../app/composables/userChatsRemote'
import { readChatsRoot } from '../../app/composables/useSearchCache'

describe('clearLocalChatsAfterSignOut', () => {
  beforeEach(() => {
    sessionStorage._store.clear()
    chatRemoteHydrateTick.value = 0
  })

  it('clears multi-session chat history and related session keys', () => {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({
      version: 1,
      activeSessionId: 's1',
      sessions: [
        {
          id: 's1',
          title: 'Fiji Liveboard Trip',
          updatedAt: 1000,
          timestamp: 1000,
          messages: [{ role: 'user', content: 'Fiji liveaboard' }],
          userInput: '',
          lastQuery: 'Fiji liveaboard',
          selectedShopId: null,
          detailDrawerShopId: null,
          mobileDetailShopId: null,
          drawerOpen: false,
          drawerShopId: null,
          drawerShopName: null
        },
        {
          id: 's2',
          title: 'Older chat',
          updatedAt: 500,
          timestamp: 500,
          messages: [{ role: 'user', content: 'Bali' }],
          userInput: '',
          lastQuery: 'Bali',
          selectedShopId: null,
          detailDrawerShopId: null,
          mobileDetailShopId: null,
          drawerOpen: false,
          drawerShopId: null,
          drawerShopName: null
        }
      ]
    }))
    sessionStorage.setItem(BOOKING_RESUME_SESSION_KEY, '{"v":1,"messages":[]}')
    sessionStorage.setItem(PENDING_DRAFT_RESUME_KEY, '{"draftId":"d1"}')
    sessionStorage.setItem(FORCE_NEW_CHAT_KEY, '1')

    const tickBefore = chatRemoteHydrateTick.value
    clearLocalChatsAfterSignOut()

    expect(sessionStorage.getItem(BOOKING_RESUME_SESSION_KEY)).toBeNull()
    expect(sessionStorage.getItem(PENDING_DRAFT_RESUME_KEY)).toBeNull()
    expect(sessionStorage.getItem(FORCE_NEW_CHAT_KEY)).toBeNull()

    const root = readChatsRoot()
    expect(root?.sessions).toHaveLength(1)
    expect(root?.sessions[0]?.messages).toEqual([])
    expect(chatRemoteHydrateTick.value).toBeGreaterThan(tickBefore)
  })
})
