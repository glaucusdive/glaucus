import { describe, expect, it } from 'vitest'
import {
  buildShopSubmissionEmailBody,
  buildShopSubmissionEmailSubject,
  parseShopSubmissionNotifyEmails
} from '../../server/utils/shopSubmissionNotification'

describe('shopSubmissionNotification', () => {
  it('parses notify emails with defaults', () => {
    expect(parseShopSubmissionNotifyEmails(undefined)).toEqual([
      'chris@glaucusdive.com',
      'shash@glaucusdive.com'
    ])
  })

  it('builds subject and body with review link', () => {
    const payload = {
      submissionId: 'sub-1',
      diveshopId: 'shop-1',
      businessName: 'Reef Dive Co',
      submitterName: 'Alex Owner',
      submitterEmail: 'alex@shop.com',
      submitterNotes: 'Updated phone number',
      reviewUrl: 'https://glaucusdive.com/admin/shop-updates/sub-1'
    }
    expect(buildShopSubmissionEmailSubject(payload)).toBe('Shop update submitted — Reef Dive Co')
    const body = buildShopSubmissionEmailBody(payload)
    expect(body).toContain('Reef Dive Co')
    expect(body).toContain('alex@shop.com')
    expect(body).toContain('Updated phone number')
    expect(body).toContain('/admin/shop-updates/sub-1')
  })
})
