import { describe, expect, it } from 'vitest'
import {
  formatActivityStyleFilterLine,
  formatGeoDirectoryQueryLine,
  formatInterpretActivityLine,
  formatTripTypeGateActivityLine
} from '../../server/utils/formatSearchActivityLog'

describe('formatSearchActivityLog', () => {
  it('formatInterpretActivityLine summarizes NLU fields', () => {
    const line = formatInterpretActivityLine(
      {
        goal: 'search_shops',
        destination_text: 'Bali',
        activity_terms: ['wreck'],
        dive_site_type_label: null,
        certification_course_hint: null,
        trip_product_type: null,
        shop_name_hint: null,
        wants_booking: undefined,
        reasoning_summary: null,
        confidence: undefined
      },
      true
    )
    expect(line).toContain('Bali')
    expect(line).toContain('wreck')
    expect(line).toContain('find shops')
  })

  it('formatInterpretActivityLine still includes goal when other fields empty', () => {
    const line = formatInterpretActivityLine(
      {
        goal: 'unclear',
        destination_text: null,
        shop_name_hint: null,
        activity_terms: null,
        certification_course_hint: null,
        dive_site_type_label: null,
        trip_product_type: null,
        wants_booking: undefined,
        reasoning_summary: null,
        confidence: undefined
      },
      true
    )
    expect(line).toContain('unclear')
  })

  it('formatInterpretActivityLine when NLU failed', () => {
    expect(formatInterpretActivityLine(null, false)).toContain('failed')
  })

  it('formatGeoDirectoryQueryLine includes count', () => {
    expect(formatGeoDirectoryQueryLine('Bali', 24)).toContain('24')
    expect(formatGeoDirectoryQueryLine('Bali', 24)).toContain('Bali')
  })

  it('formatActivityStyleFilterLine includes terms and count', () => {
    expect(formatActivityStyleFilterLine('wreck, drift', 3)).toContain('wreck')
    expect(formatActivityStyleFilterLine('wreck, drift', 3)).toContain('3')
  })

  it('formatTripTypeGateActivityLine when NLU did not run', () => {
    const s = formatTripTypeGateActivityLine(null, { ran: false, ok: false })
    expect(s).toBeTruthy()
    expect(s!.toLowerCase()).toContain('trip format')
  })

  it('formatTripTypeGateActivityLine when NLU ran and succeeded', () => {
    const s = formatTripTypeGateActivityLine(
      {
        goal: 'search_shops',
        destination_text: 'Bali',
        activity_terms: ['wreck'],
        dive_site_type_label: null,
        certification_course_hint: null,
        trip_product_type: null,
        shop_name_hint: null,
        wants_booking: undefined,
        reasoning_summary: null,
        confidence: undefined
      },
      { ran: true, ok: true }
    )
    expect(s).toContain('Bali')
    expect(s!.toLowerCase()).toContain('still need trip format')
  })
})
