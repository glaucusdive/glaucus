import { describe, expect, it } from 'vitest'
import {
  buildSearchPaginationSelectableOption,
  SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
} from '../../shared/searchPaginationChip'

describe('buildSearchPaginationSelectableOption', () => {
  it('caps label at page size (default 10)', () => {
    expect(buildSearchPaginationSelectableOption(12).label).toBe('Load next 10')
    expect(buildSearchPaginationSelectableOption(12).value).toBe('Show more')
  })

  it('uses exact remainder when below page size', () => {
    expect(buildSearchPaginationSelectableOption(3).label).toBe('Load next 3')
    expect(buildSearchPaginationSelectableOption(1).label).toBe('Load next 1')
  })

  it('respects custom page size', () => {
    expect(buildSearchPaginationSelectableOption(15, 20).label).toBe('Load next 15')
    expect(buildSearchPaginationSelectableOption(25, 20).label).toBe('Load next 20')
  })

  it('falls back when remaining invalid', () => {
    expect(buildSearchPaginationSelectableOption(0).label).toBe('Show more')
    expect(buildSearchPaginationSelectableOption(-1).label).toBe('Show more')
  })

  it('default page size constant is 10', () => {
    expect(SEARCH_PAGINATION_PAGE_SIZE_DEFAULT).toBe(10)
  })
})
