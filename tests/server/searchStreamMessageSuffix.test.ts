import { describe, expect, it } from 'vitest'
import {
  extractVisibleMessageSuffixAfterMessageTag,
  visibleSuffixDelta
} from '../../server/utils/searchStreamMessageSuffix'

describe('searchStreamMessageSuffix', () => {
  it('returns empty until MESSAGE: appears', () => {
    expect(extractVisibleMessageSuffixAfterMessageTag('FILTERS: {"country":null}')).toBe('')
  })

  it('returns body after MESSAGE:', () => {
    const s = 'FILTERS: {}\nMESSAGE: Hello there'
    expect(extractVisibleMessageSuffixAfterMessageTag(s)).toBe('Hello there')
  })

  it('visibleSuffixDelta appends only new suffix tail', () => {
    expect(visibleSuffixDelta('', 'Hello')).toBe('Hello')
    expect(visibleSuffixDelta('Hello', 'Hello world')).toBe(' world')
    expect(visibleSuffixDelta('Hello', 'Hell')).toBe('')
  })
})
