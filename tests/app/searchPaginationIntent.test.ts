import { describe, expect, it } from 'vitest'
import { isSearchPaginationUserMessage } from '../../app/utils/searchPaginationIntent'

describe('isSearchPaginationUserMessage', () => {
  it('treats dynamic load-next chip text as pagination', () => {
    expect(isSearchPaginationUserMessage('Load next 3')).toBe(true)
    expect(isSearchPaginationUserMessage('Load next 1')).toBe(true)
  })
})
