import { describe, it, expect } from 'vitest'
import { mergeChatsRoots } from '../../app/composables/userChatsRemote'
import type { ChatsRoot } from '../../app/composables/useSearchCache'

function makeRoot (
  id: string,
  updatedAt: number,
  messages: Array<{ role: string; content: string }> = [{ role: 'user', content: 'hi' }]
): ChatsRoot {
  return {
    version: 1,
    activeSessionId: id,
    sessions: [{
      id,
      title: 'Chat',
      updatedAt,
      timestamp: updatedAt,
      messages,
      userInput: '',
      lastQuery: null,
      selectedShopId: null,
      detailDrawerShopId: null,
      mobileDetailShopId: null,
      drawerOpen: false,
      drawerShopId: null,
      drawerShopName: null
    }]
  }
}

describe('mergeChatsRoots', () => {
  it('returns null when neither side has messages', () => {
    expect(mergeChatsRoots(null, null)).toBeNull()
    const empty = makeRoot('e', 0, [])
    expect(mergeChatsRoots(empty, null)).toBeNull()
  })

  it('uses the only side that has messages', () => {
    const local = makeRoot('local', 100)
    expect(mergeChatsRoots(local, null)?.activeSessionId).toBe('local')
    const remote = makeRoot('remote', 200)
    expect(mergeChatsRoots(null, remote)?.activeSessionId).toBe('remote')
  })

  it('prefers local when local updatedAt is newer', () => {
    const local = makeRoot('local', 500)
    const remote = makeRoot('remote', 100)
    expect(mergeChatsRoots(local, remote)?.activeSessionId).toBe('local')
  })

  it('prefers remote when remote updatedAt is newer', () => {
    const local = makeRoot('local', 100)
    const remote = makeRoot('remote', 500)
    expect(mergeChatsRoots(local, remote)?.activeSessionId).toBe('remote')
  })

  it('prefers local on tie', () => {
    const local = makeRoot('local', 300)
    const remote = makeRoot('remote', 300)
    expect(mergeChatsRoots(local, remote)?.activeSessionId).toBe('local')
  })
})
