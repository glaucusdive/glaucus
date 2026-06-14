import { describe, expect, it } from 'vitest'
import {
  formatBaliJulyTripDateRange,
  getChatStarterPrompts
} from '../../shared/chatStarterPrompts'

describe('formatBaliJulyTripDateRange', () => {
  it('uses current year when July 4 is still ahead', () => {
    expect(formatBaliJulyTripDateRange(new Date(2026, 5, 13))).toBe('July 1-4 2026')
  })

  it('uses current year on July 1', () => {
    expect(formatBaliJulyTripDateRange(new Date(2026, 6, 1))).toBe('July 1-4 2026')
  })

  it('bumps to next year after July 4', () => {
    expect(formatBaliJulyTripDateRange(new Date(2026, 6, 5))).toBe('July 1-4 2027')
  })
})

describe('getChatStarterPrompts', () => {
  it('returns three starter prompts with dynamic Bali dates', () => {
    const prompts = getChatStarterPrompts(new Date(2026, 5, 13))
    expect(prompts).toEqual([
      'I want to go diving in Bali July 1-4 2026',
      'I want to get an Open Water Diver scuba diving certification',
      'I want to book a Liveaboard in Fiji'
    ])
  })
})
