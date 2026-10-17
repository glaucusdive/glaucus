import { describe, expect, it } from 'vitest'
import { isSimpleGreeting } from '../../shared/chatGreeting'

describe('isSimpleGreeting', () => {
  it('recognizes short greetings', () => {
    for (const message of ['hi', 'Hello!', 'hey there', 'Good morning.']) {
      expect(isSimpleGreeting(message)).toBe(true)
    }
  })

  it('does not treat a request as a greeting just because it starts with one', () => {
    expect(isSimpleGreeting('Hi, I want to dive in Bali')).toBe(false)
    expect(isSimpleGreeting('Can I review a dive master?')).toBe(false)
  })
})