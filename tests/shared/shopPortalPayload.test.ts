import { describe, it, expect } from 'vitest'
import {
  resolveTempIdsInPayload,
  portalPayloadToShopWrite,
  isTempLookupId,
  type PortalSubmissionPayload
} from '../../shared/shopPortalPayload'

describe('resolveTempIdsInPayload', () => {
  it('replaces temp ids in junction arrays and FK fields', () => {
    const idMap = new Map([
      ['temp:region-1', 'real-region-uuid'],
      ['temp:gas-1', 'real-gas-uuid']
    ])
    const payload: PortalSubmissionPayload = {
      business_name: 'Test Shop',
      region_id: 'temp:region-1',
      gas_ids: ['temp:gas-1', 'existing-gas'],
      course_ids: []
    }
    const resolved = resolveTempIdsInPayload(payload, idMap)
    expect(resolved.region_id).toBe('real-region-uuid')
    expect(resolved.gas_ids).toEqual(['real-gas-uuid', 'existing-gas'])
  })
})

describe('portalPayloadToShopWrite', () => {
  it('serializes business_type_ids to type string', () => {
    const payload: PortalSubmissionPayload = {
      business_name: 'Shop',
      business_type_ids: ['bt-1'],
      course_ids: []
    }
    const options = [{ id: 'bt-1', name: 'Dive Shop' }]
    const out = portalPayloadToShopWrite(payload, options)
    expect(out.type).toBe('Dive Shop')
    expect(out.business_name).toBe('Shop')
    expect('business_type_ids' in out).toBe(false)
  })
})

describe('isTempLookupId', () => {
  it('detects temp prefix', () => {
    expect(isTempLookupId('temp:abc')).toBe(true)
    expect(isTempLookupId('real-uuid')).toBe(false)
  })
})
