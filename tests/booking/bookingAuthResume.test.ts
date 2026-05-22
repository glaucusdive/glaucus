import { describe, it, expect } from 'vitest'
import { extractBookingFromCache } from '../../app/utils/extractBookingFromCache'
import {
  mergedBookingPayloadFromResumeSnapshot,
  patchLatestBookingPayloadInMessages
} from '../../app/utils/bookingAuthResumeMerge'

describe('extractBookingFromCache', () => {
  it('returns null when no booking assistant message', () => {
    expect(extractBookingFromCache({ messages: [{ role: 'user', content: 'hi' }] })).toBeNull()
  })

  it('extracts shopId and payload from latest booking assistant message', () => {
    const result = extractBookingFromCache({
      messages: [
        { role: 'assistant', intent: 'booking', shopId: 'shop-1', payload: { name: 'A', shopId: 'shop-1' } }
      ]
    })
    expect(result).toEqual({ shopId: 'shop-1', payload: { name: 'A', shopId: 'shop-1' } })
  })
})

describe('mergedBookingPayloadFromResumeSnapshot', () => {
  it('prefers live form payload over message payload', () => {
    const merged = mergedBookingPayloadFromResumeSnapshot({
      v: 1,
      messages: [
        {
          role: 'assistant',
          intent: 'booking',
          shopId: 'shop-1',
          payload: { shopId: 'shop-1', name: 'Old', divers: [] }
        }
      ],
      drawerShopId: 'shop-1',
      liveBookingPayload: { shopId: 'shop-1', name: 'Chris Porter', email: 'c@example.com', divers: [{ name: 'Chris Porter' }] }
    })
    expect(merged?.shopId).toBe('shop-1')
    expect(merged?.payload.name).toBe('Chris Porter')
    expect(merged?.payload.email).toBe('c@example.com')
  })
})

describe('patchLatestBookingPayloadInMessages', () => {
  it('updates the latest booking assistant payload in place', () => {
    const msgs = [
      { role: 'assistant', intent: 'booking', shopId: 's1', content: 'Name?', payload: { shopId: 's1', name: '' } }
    ]
    patchLatestBookingPayloadInMessages(msgs, { shopId: 's1', name: 'Chris' }, 's1', 'Shop')
    expect((msgs[0] as { payload: { name: string } }).payload.name).toBe('Chris')
  })
})
