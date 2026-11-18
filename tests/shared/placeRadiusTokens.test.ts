import { describe, expect, it } from 'vitest'
import {
  isPlaceRadiusExpandMessage,
  PLACE_RADIUS_EXPAND,
  placeRadiusExpandSelectableOption
} from '../../shared/placeRadiusTokens'

describe('placeRadiusTokens', () => {
  it('recognizes the stable chip token', () => {
    expect(isPlaceRadiusExpandMessage(PLACE_RADIUS_EXPAND)).toBe(true)
  })

  it('recognizes natural language expand phrases', () => {
    expect(isPlaceRadiusExpandMessage('Expand beyond 50 miles')).toBe(true)
    expect(isPlaceRadiusExpandMessage('search outside the 50-mile radius')).toBe(true)
  })

  it('builds the selectable chip', () => {
    expect(placeRadiusExpandSelectableOption()).toEqual({
      label: 'Expand beyond 50 miles',
      value: PLACE_RADIUS_EXPAND
    })
  })
})
