import { describe, expect, it } from 'vitest'
import { shouldRouteMessageToGuidedFlow } from '../../app/utils/chatGuidedFlowRouting'

const base = {
  useGuidedSearch: true,
  useAiSearchFirst: false,
  preferGuidedThisSession: false,
  inBookingFlow: false,
  pendingEntityClarifyPhrase: undefined,
  startsWithGuidedPrefix: false,
  midGuidedWizard: false,
  guidedStep: null as string | null
}

describe('shouldRouteMessageToGuidedFlow', () => {
  it('returns false for pagination when guided state is not on results (orchestrator paginates)', () => {
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        messageTrimmed: 'Show more',
        guidedStep: 'choose_branch'
      })
    ).toBe(false)
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        messageTrimmed: 'Load next 5',
        guidedStep: null
      })
    ).toBe(false)
  })

  it('returns true for pagination when guided flow is already on results', () => {
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        messageTrimmed: 'Show more',
        guidedStep: 'results'
      })
    ).toBe(true)
  })

  it('returns true for guided prefix or mid-wizard when not pagination', () => {
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        messageTrimmed: 'guided:dest:bali',
        startsWithGuidedPrefix: true,
        guidedStep: 'choose_branch'
      })
    ).toBe(true)
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        messageTrimmed: 'Bali',
        midGuidedWizard: true,
        guidedStep: 'location_destination'
      })
    ).toBe(true)
  })

  it('returns false when AI-first without prefer guided', () => {
    expect(
      shouldRouteMessageToGuidedFlow({
        ...base,
        useAiSearchFirst: true,
        preferGuidedThisSession: false,
        messageTrimmed: 'guided:reset',
        startsWithGuidedPrefix: true
      })
    ).toBe(false)
  })
})
