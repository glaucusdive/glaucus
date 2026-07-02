import { describe, expect, it } from 'vitest'
import { adminShopRowToNewBusinessForm } from '../../shared/adminNewBusinessFormShape'

describe('adminShopRowToNewBusinessForm', () => {
  it('copies form fields with cloned arrays', () => {
    const row = {
      business_name: 'Pearl Divers',
      street_address: '123 Main',
      website_url: 'https://example.com',
      city: 'Roatan',
      state: 'Bay Islands',
      phone: '555-0100',
      email: 'info@example.com',
      business_type_ids: ['t1'],
      country_id: 'c1',
      region_id: 'r1',
      course_ids: ['co1', 'co2'],
      rental_equipment_ids: ['re1'],
      gas_ids: ['g1'],
      dive_site_ids: ['ds1']
    }
    const form = adminShopRowToNewBusinessForm(row)
    expect(form.business_name).toBe('Pearl Divers')
    expect(form.course_ids).toEqual(['co1', 'co2'])
    expect(form.course_ids).not.toBe(row.course_ids)
    expect(form.country_id).toBe('c1')
  })

  it('appends name suffix for duplicate', () => {
    const form = adminShopRowToNewBusinessForm(
      { business_name: 'Pearl Divers' },
      { nameSuffix: ' (Copy)' }
    )
    expect(form.business_name).toBe('Pearl Divers (Copy)')
  })
})
