import { describe, expect, it } from 'vitest'
import { isCourseDiscoveryFollowUpMessage } from '../../server/utils/courseDiscoveryFromSearch'

describe('isCourseDiscoveryFollowUpMessage', () => {
  it('detects beginner course questions', () => {
    expect(
      isCourseDiscoveryFollowUpMessage(
        'What are some typical beginner courses most of these places offer?'
      )
    ).toBe(true)
  })
  it('rejects pagination', () => {
    expect(isCourseDiscoveryFollowUpMessage('show more')).toBe(false)
    expect(isCourseDiscoveryFollowUpMessage('Load next 5')).toBe(false)
    expect(isCourseDiscoveryFollowUpMessage('Load next 3')).toBe(false)
  })
})
