import { describe, expect, it } from 'vitest'
import { shouldShowChatShell } from '../../app/utils/chatShell'

const base = {
  authResolved: true,
  isSignedIn: false,
  clientReady: true,
  forceChat: false,
  path: '/',
  hash: '',
  queryChat: undefined as unknown
}

describe('shouldShowChatShell', () => {
  it('keeps guests on the marketing page at /', () => {
    expect(shouldShowChatShell(base)).toBe(false)
  })

  it('opens chat for ?chat=1', () => {
    expect(shouldShowChatShell({ ...base, queryChat: '1' })).toBe(true)
  })

  it('opens chat for ?chat=1 even with a landing hash', () => {
    expect(shouldShowChatShell({
      ...base,
      isSignedIn: true,
      queryChat: '1',
      hash: '#whatisglaucus'
    })).toBe(true)
  })

  it('keeps a signed-in section link on the marketing page', () => {
    expect(shouldShowChatShell({
      ...base,
      isSignedIn: true,
      hash: '#whatisglaucus'
    })).toBe(false)
  })

  it('opens chat for a signed-in user on / after the client is ready', () => {
    expect(shouldShowChatShell({ ...base, isSignedIn: true })).toBe(true)
  })

  it('waits until mount before swapping a signed-in / to chat', () => {
    expect(shouldShowChatShell({ ...base, isSignedIn: true, clientReady: false })).toBe(false)
  })

  it('opens chat when Open Chat forces the shell on an unchanged URL', () => {
    expect(shouldShowChatShell({ ...base, forceChat: true, queryChat: '1' })).toBe(true)
  })
})
