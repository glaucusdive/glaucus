import { describe, it, expect } from 'vitest'
import { sessionNeedsOrchestratorResume } from '../../app/composables/useSearchCache'

describe('sessionNeedsOrchestratorResume', () => {
  it('returns false without pending turn', () => {
    expect(sessionNeedsOrchestratorResume({
      id: 's1',
      title: 'Chat',
      updatedAt: 1,
      timestamp: 1,
      messages: [{ role: 'user', content: 'hi' }],
      userInput: '',
      lastQuery: null
    })).toBe(false)
  })

  it('returns true when pending turn matches last user bubble', () => {
    expect(sessionNeedsOrchestratorResume({
      id: 's1',
      title: 'Chat',
      updatedAt: 1,
      timestamp: 1,
      messages: [{ role: 'user', content: 'I want to dive at Aquatech Divers' }],
      userInput: '',
      lastQuery: null,
      pendingOrchestratorTurn: {
        message: 'I want to dive at Aquatech Divers',
        startedAt: Date.now()
      }
    })).toBe(true)
  })

  it('returns false when assistant already replied', () => {
    expect(sessionNeedsOrchestratorResume({
      id: 's1',
      title: 'Chat',
      updatedAt: 1,
      timestamp: 1,
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'Hello' }
      ],
      userInput: '',
      lastQuery: null,
      pendingOrchestratorTurn: { message: 'hi', startedAt: 1 }
    })).toBe(false)
  })
})
