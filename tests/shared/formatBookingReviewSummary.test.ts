import { describe, expect, it } from 'vitest'
import { formatBookingReviewSummary } from '../../shared/formatBookingReviewSummary'

describe('formatBookingReviewSummary', () => {
  it('includes shop name in preamble and key trip fields', () => {
    const { messagePreamble, message } = formatBookingReviewSummary('Dive Porter', {
      name: 'Chris P',
      email: 'c@example.com',
      startDate: '2026-04-01',
      endDate: '2026-04-05',
      numberOfDivers: 1,
      desiredCourses: ['OW'],
      desiredDiveSites: ['Blue Hole'],
      divers: [{
        name: 'Chris P',
        certificationNumber: '123',
        numberOfDives: '50',
        height: "5'10\"",
        heightUnit: 'ft-in',
        weight: '180',
        weightUnit: 'lbs',
        gear: [{ gearType: 'Regulator' }],
        gearAsked: true
      }]
    })
    expect(messagePreamble.toLowerCase()).toContain('dive porter')
    expect(messagePreamble.toLowerCase()).toContain('booking summary')
    expect(message).toContain('Contact: Chris P')
    expect(message).toContain('c@example.com')
    expect(message).toContain('2026-04-01')
    expect(message).toContain('Regulator')
  })
})
