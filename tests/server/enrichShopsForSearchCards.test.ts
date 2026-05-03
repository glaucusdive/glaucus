import { describe, expect, it } from 'vitest'
import { collectDistinctDiveSiteTypeNames } from '../../server/utils/enrichShopsForSearchCards'

describe('collectDistinctDiveSiteTypeNames', () => {
  it('dedupes case-insensitively and sorts', () => {
    const rows = [
      { dive_sites: { dive_site_type: { name: 'Wreck' } } },
      { dive_sites: { dive_site_type: { name: 'wreck' } } },
      { dive_sites: { dive_site_type: { name: 'Reef' } } },
      { dive_sites: { dive_site_type: { name: null } } },
      { dive_sites: null }
    ] as { dive_sites: { dive_site_type: { name: string | null } | null } | null }[]
    expect(collectDistinctDiveSiteTypeNames(rows)).toEqual(['Reef', 'Wreck'])
  })
})
