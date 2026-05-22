import { describe, it, expect } from 'vitest'
import { mergeProfileContactIntoBookingPayload } from '../../shared/mergeProfileContactIntoBookingPayload'
import { advanceStaleContactPromptsAfterProfileMerge } from '../../app/utils/advanceBookingChatAfterProfileMerge'

describe('mergeProfileContactIntoBookingPayload', () => {
  it('fills empty name and email from profile', () => {
    const out = mergeProfileContactIntoBookingPayload(
      { shopId: 's1', name: '', email: '' },
      { name: 'Chris Porter', email: 'chris@example.com' }
    )
    expect(out.name).toBe('Chris Porter')
    expect(out.email).toBe('chris@example.com')
  })

  it('does not overwrite user-entered contact fields', () => {
    const out = mergeProfileContactIntoBookingPayload(
      { shopId: 's1', name: 'Guest Name', email: 'guest@example.com' },
      { name: 'Chris Porter', email: 'chris@example.com' }
    )
    expect(out.name).toBe('Guest Name')
    expect(out.email).toBe('guest@example.com')
  })
})

describe('advanceStaleContactPromptsAfterProfileMerge', () => {
  it('replaces email prompt with dates when profile supplies contact info', () => {
    const msgs = [
      { role: 'assistant', intent: 'booking', content: "What's the best email address for the booking?", shopId: 's1' }
    ]
    advanceStaleContactPromptsAfterProfileMerge(
      msgs,
      { shopId: 's1', name: 'Chris Porter', email: 'chris@example.com' },
      's1'
    )
    expect((msgs[0] as { content: string }).content).toMatch(/start and end dates/i)
  })
})
