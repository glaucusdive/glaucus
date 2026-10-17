import { describe, expect, it } from 'vitest'
import { parseReviewRequest } from '../../shared/reviewIntent'

describe('parseReviewRequest', () => {
  it('preserves existing named shop requests', () => {
    expect(parseReviewRequest('I want to review Dive Shash'))
      .toEqual({ targetKind: 'shop', targetQuery: 'Dive Shash' })
  })

  it('recognizes a named divemaster', () => {
    expect(parseReviewRequest('I want to review dive master Maya Chen'))
      .toEqual({ targetKind: 'divemaster', targetQuery: 'Maya Chen' })
  })

  it('asks for target type for a generic or mixed request', () => {
    expect(parseReviewRequest('I want to review a dive shop or dive master'))
      .toEqual({ targetKind: null, targetQuery: null, pending: { stage: 'target-type' } })
    expect(parseReviewRequest('Can I leave a review?'))
      .toEqual({ targetKind: null, targetQuery: null, pending: { stage: 'target-type' } })
  })

  it('asks for a name after the user chooses a profile type', () => {
    expect(parseReviewRequest('divemaster', { stage: 'target-type' }))
      .toEqual({
        targetKind: 'divemaster',
        targetQuery: null,
        pending: { stage: 'target-name', targetKind: 'divemaster' }
      })
  })

  it('uses the selected type for the next name and supports cancellation', () => {
    expect(parseReviewRequest('Maya Chen', { stage: 'target-name', targetKind: 'divemaster' }))
      .toEqual({ targetKind: 'divemaster', targetQuery: 'Maya Chen' })
    expect(parseReviewRequest('never mind', { stage: 'target-name', targetKind: 'shop' }))
      .toEqual({ targetKind: null, targetQuery: null, cancelled: true })
  })
})