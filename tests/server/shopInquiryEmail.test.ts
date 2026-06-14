import { describe, expect, it } from 'vitest'
import {
  SHOP_INQUIRY_EMAIL_SUBJECT,
  buildShopInquiryEmailBody
} from '../../server/utils/shopInquiryEmail'
import type { PortalSubmissionPayload, ShopLookups } from '../../shared/shopPortalPayload'

const minimalLookups: ShopLookups = {
  countries: [{ id: 'c1', name: 'Indonesia' }],
  regions: [{ id: 'r1', name: 'Bali' }],
  courses: [{ id: 'co1', label: 'Open Water (PADI)', certification_name: 'Open Water' }],
  rentalEquipment: [{ id: 're1', name: 'BCD' }],
  gases: [{ id: 'g1', name: 'Nitrox 32' }],
  diveSites: [{ id: 'ds1', name: 'USAT Liberty' }],
  diveBusinessTypes: [{ id: 'bt1', name: 'dive_shop', label: 'Dive Shop' }]
}

describe('shopInquiryEmail', () => {
  it('uses fixed subject', () => {
    expect(SHOP_INQUIRY_EMAIL_SUBJECT).toBe('New Dive Shop Inquiry')
  })

  it('builds readable body with submitter and business fields', () => {
    const payload: PortalSubmissionPayload = {
      business_name: 'Blue Corner Dive',
      type: 'Dive Shop',
      city: 'Amed',
      country_id: 'c1',
      region_id: 'r1',
      course_ids: ['co1'],
      rental_equipment_ids: ['re1'],
      gas_ids: ['g1'],
      dive_site_ids: ['ds1']
    }
    const body = buildShopInquiryEmailBody(
      { name: 'Jane Doe', email: 'jane@example.com', notes: 'We run daily trips.' },
      payload,
      minimalLookups
    )
    expect(body).toContain('Jane Doe')
    expect(body).toContain('jane@example.com')
    expect(body).toContain('We run daily trips.')
    expect(body).toContain('Blue Corner Dive')
    expect(body).toContain('Indonesia')
    expect(body).toContain('Open Water (PADI)')
  })
})
