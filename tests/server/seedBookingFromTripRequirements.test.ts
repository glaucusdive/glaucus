import { describe, expect, it } from 'vitest'
import { mergeTripRequirements, tripRequirementsFromSearchFilters } from '../../shared/tripRequirements'
import { seedBookingFromTripRequirements } from '../../server/utils/seedBookingFromTripRequirements'
import { mapCourseNamesFromTripRequirements } from '../../server/utils/mapCourseNamesFromTripRequirements'

const shopCourses = [
  { name: 'Open Water Diver' },
  { name: 'Advanced Open Water Diver' },
  { name: 'Wreck Diver' }
]

const shopDiveSites = [
  { name: 'Liberty Wreck' },
  { name: 'Coral Garden' }
]

describe('mapCourseNamesFromTripRequirements', () => {
  it('maps advanced certificationLevel to shop advanced course', () => {
    const names = mapCourseNamesFromTripRequirements(
      { certificationLevel: 'advanced' },
      shopCourses
    )
    expect(names).toEqual(['Advanced Open Water Diver'])
  })
})

describe('seedBookingFromTripRequirements', () => {
  it('Case 3: golden transcript — advanced + wreck seeds without chat history', async () => {
    let req = tripRequirementsFromSearchFilters({
      certificationCourseHint: 'Advanced',
      place: 'Bali',
      country: 'Indonesia'
    })
    req = mergeTripRequirements(req, tripRequirementsFromSearchFilters({
      activityTokens: ['wreck'],
      place: 'Bali',
      certificationCourseHint: 'Advanced'
    }))
    req = mergeTripRequirements(req, { selectedShopId: 'shop-ceningan' })

    expect(req.certificationLevel).toBe('advanced')
    expect(req.diveTypes).toContain('wreck')
    expect(req.location).toBe('Bali')

    const atCourses = await seedBookingFromTripRequirements({
      payload: {
        shopId: 'shop-ceningan',
        name: 'Ada',
        email: 'ada@example.com',
        startDate: '2026-07-08',
        endDate: '2026-07-10'
      },
      tripRequirements: req,
      courseOptions: shopCourses,
      diveSiteOptions: shopDiveSites
    })

    expect(atCourses.desiredCourses).toEqual(['Advanced Open Water Diver'])
    expect(atCourses.coursesSelectionComplete).toBe(false)

    const atDiveSites = await seedBookingFromTripRequirements({
      payload: {
        ...atCourses,
        coursesSelectionComplete: true
      },
      tripRequirements: req,
      courseOptions: shopCourses,
      diveSiteOptions: shopDiveSites
    })
    expect(atDiveSites.desiredDiveSites).toEqual(['Liberty Wreck'])
  })

  it('does not overwrite existing desiredCourses on payload', async () => {
    const seeded = await seedBookingFromTripRequirements({
      payload: {
        shopId: 's1',
        desiredCourses: ['Rescue Diver'],
        coursesSelectionComplete: false
      },
      tripRequirements: { certificationLevel: 'advanced' },
      courseOptions: shopCourses,
      diveSiteOptions: []
    })
    expect(seeded.desiredCourses).toEqual(['Rescue Diver'])
  })
})
