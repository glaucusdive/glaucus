import { describe, it, expect } from 'vitest'
import { diffHighlightFields, snapshotFromPortalPayload } from '../../app/utils/shopPortalForm'
import type { ShopFormSnapshot } from '../../shared/shopPortalPayload'

describe('diffHighlightFields', () => {
  it('flags changed scalar and array fields', () => {
    const baseline: ShopFormSnapshot = {
      business_name: 'A',
      street_address: null,
      website_url: null,
      city: null,
      state: null,
      phone: null,
      email: null,
      type: null,
      country_id: null,
      region_id: null,
      business_type_ids: [],
      course_ids: ['c1'],
      rental_equipment_ids: [],
      gas_ids: [],
      dive_site_ids: []
    }
    const current = {
      ...baseline,
      business_name: 'B',
      course_ids: ['c2']
    }
    const diff = diffHighlightFields(baseline, current)
    expect(diff).toContain('business_name')
    expect(diff).toContain('course_ids')
    expect(diff).not.toContain('phone')
  })
})

describe('snapshotFromPortalPayload', () => {
  it('maps portal payload to form snapshot', () => {
    const snap = snapshotFromPortalPayload({
      business_name: 'Shop',
      city: 'Honolulu',
      course_ids: ['a'],
      business_type_ids: ['bt']
    })
    expect(snap.business_name).toBe('Shop')
    expect(snap.city).toBe('Honolulu')
    expect(snap.course_ids).toEqual(['a'])
  })
})
