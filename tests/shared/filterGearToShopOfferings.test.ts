import { describe, expect, it } from 'vitest'
import {
  filterGearNamesToShopOfferings,
  filterGearToShopOfferings,
  sanitizeBookingPayloadGearForShop
} from '../../shared/filterGearToShopOfferings'

describe('filterGearToShopOfferings', () => {
  const profileGear = [
    { gearType: 'Regulator' },
    { gearType: 'Snorkel' },
    { gearType: 'BCD' },
    { gearType: 'Dive Computer' },
    { gearType: 'Fins' },
    { gearType: 'Drysuit' }
  ]

  it('keeps only gear the shop offers', () => {
    expect(filterGearToShopOfferings(profileGear, ['Drysuit'])).toEqual([{ gearType: 'Drysuit' }])
  })

  it('returns empty when shop has no overlapping gear', () => {
    expect(filterGearToShopOfferings(profileGear, ['Wetsuit'])).toEqual([])
  })

  it('matches shop names case-insensitively', () => {
    expect(filterGearNamesToShopOfferings(['drysuit', 'Regulator'], ['Drysuit'])).toEqual(['drysuit'])
  })

  it('sanitizes all divers on a booking payload', () => {
    const out = sanitizeBookingPayloadGearForShop(
      {
        divers: [
          { gear: [{ gearType: 'Regulator' }, { gearType: 'Drysuit' }] },
          { gear: [{ gearType: 'BCD' }] }
        ]
      },
      ['Drysuit', 'BCD']
    )
    expect(out.divers?.[0]?.gear).toEqual([{ gearType: 'Drysuit' }])
    expect(out.divers?.[1]?.gear).toEqual([{ gearType: 'BCD' }])
  })
})
