import { describe, expect, it } from 'vitest'
import { resolveBookingTargetFromPhrase } from '../../server/utils/resolveBookingTarget'

describe('resolveBookingTargetFromPhrase', () => {
  it('resolves exact shop name when recent results also substring-match (Reef Divers)', async () => {
    const result = await resolveBookingTargetFromPhrase(
      'Reef Divers',
      [
        { id: 'bali', business_name: 'Bali Reef Divers' },
        { id: 'cayman', business_name: 'Reef Divers' }
      ],
      '',
      ''
    )
    expect(result.kind).toBe('single')
    if (result.kind === 'single') {
      expect(result.shop.id).toBe('cayman')
      expect(result.shop.business_name).toBe('Reef Divers')
    }
  })

  it('still disambiguates when phrase only fuzzy-matches multiple shops', async () => {
    const result = await resolveBookingTargetFromPhrase(
      'Reef',
      [
        { id: 'bali', business_name: 'Bali Reef Divers' },
        { id: 'cayman', business_name: 'Reef Divers' }
      ],
      '',
      ''
    )
    expect(result.kind).toBe('ambiguous')
  })

  it('matches exact name with surrounding whitespace in directory data', async () => {
    const result = await resolveBookingTargetFromPhrase(
      'Reef Divers',
      [{ id: 'cayman', business_name: '  Reef Divers  ' }],
      '',
      ''
    )
    expect(result.kind).toBe('single')
  })

  it('resolves via merged NLU noun hints without in/at in phrase', async () => {
    const result = await resolveBookingTargetFromPhrase(
      'Explorer Ventures',
      [
        {
          id: 'pr',
          business_name: 'Explorer Ventures Diving Fleet',
          city: 'Silver Bank',
          state: 'Puerto Plata'
        },
        {
          id: 'bali',
          business_name: 'Explorer Ventures Diving Fleet',
          city: 'Bali',
          state: 'Indonesia'
        }
      ],
      '',
      '',
      { operatorName: 'Explorer Ventures', placeName: 'Bali' }
    )
    expect(result.kind).toBe('single')
    if (result.kind === 'single') {
      expect(result.shop.id).toBe('bali')
    }
  })

  it('resolves operator name + place from recent disambiguation list', async () => {
    const result = await resolveBookingTargetFromPhrase(
      'Explorer Ventures in Bali',
      [
        {
          id: 'pr',
          business_name: 'Explorer Ventures Diving Fleet',
          city: 'Silver Bank',
          state: 'Puerto Plata'
        },
        {
          id: 'bali',
          business_name: 'Explorer Ventures Diving Fleet',
          city: 'Bali',
          state: 'Indonesia'
        }
      ],
      '',
      ''
    )
    expect(result.kind).toBe('single')
    if (result.kind === 'single') {
      expect(result.shop.id).toBe('bali')
    }
  })
})
