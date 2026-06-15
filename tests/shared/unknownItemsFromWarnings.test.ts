import { describe, expect, it } from 'vitest'
import {
  unknownNamesFromWarnings,
  filterDiscardedPendingNames,
  generalBulkImportWarnings,
  pendingDiscardedKey
} from '../../shared/unknownItemsFromWarnings'

describe('unknownItemsFromWarnings', () => {
  it('extracts unknown dive site names', () => {
    const warnings = ['Unknown dive site: Taak Be Luum', 'Unknown country: Mars']
    expect(unknownNamesFromWarnings(warnings, 'diveSites')).toEqual(['Taak Be Luum'])
  })

  it('filters discarded pending names', () => {
    const discarded = new Set([pendingDiscardedKey('diveSites', 'Taak Be Luum')])
    expect(filterDiscardedPendingNames(['Taak Be Luum', 'Other'], 'diveSites', discarded)).toEqual(['Other'])
  })

  it('hides pending warnings from general list', () => {
    const warnings = ['Unknown dive site: Taak Be Luum', 'Unknown country: Mars']
    const general = generalBulkImportWarnings(warnings, { diveSites: ['Taak Be Luum'] })
    expect(general).toEqual(['Unknown country: Mars'])
  })
})
