import { describe, expect, it } from 'vitest'
import {
  findAnchorAssistantIndexForPagination,
  findLastSearchAssistantContextIndex,
  sumAssistantSearchShopsSinceIndex
} from '../../app/utils/searchPaginationShownCount'

const shop = (id: string) => ({ id })

describe('searchPaginationShownCount', () => {
  it('sums all search shop cards since the last real query, not only since the last assistant with filters', () => {
    const messages = [
      { role: 'user', content: 'Bali liveaboard' },
      {
        role: 'assistant',
        intent: 'search',
        filters: { country: 'Indonesia', diveTypes: ['Liveaboard'] },
        shops: [shop('1'), shop('2'), shop('3'), shop('4'), shop('5')],
        totalResults: 8
      },
      { role: 'user', content: 'Show more' },
      {
        role: 'assistant',
        intent: 'search',
        filters: { country: 'Indonesia', diveTypes: ['Liveaboard'] },
        shops: [shop('6'), shop('7'), shop('8')],
        totalResults: 8
      },
      { role: 'user', content: 'Show more' }
    ] as const
    const lastUserIndex = messages.length - 1
    const anchor = findAnchorAssistantIndexForPagination(messages as never[], lastUserIndex)
    expect(anchor).toBe(1)
    expect(sumAssistantSearchShopsSinceIndex(messages as never[], anchor, lastUserIndex)).toBe(8)
  })

  it('first Show more after one results bubble sends offset 5', () => {
    const messages = [
      { role: 'user', content: 'wreck diving Bali' },
      {
        role: 'assistant',
        intent: 'search',
        filters: { country: 'Indonesia' },
        shops: [shop('a'), shop('b'), shop('c'), shop('d'), shop('e')],
        totalResults: 13
      },
      { role: 'user', content: 'Load next 5' }
    ] as const
    const lastUserIndex = messages.length - 1
    const anchor = findAnchorAssistantIndexForPagination(messages as never[], lastUserIndex)
    expect(anchor).toBe(1)
    expect(sumAssistantSearchShopsSinceIndex(messages as never[], anchor, lastUserIndex)).toBe(5)
  })

  it('findLastSearchAssistantContextIndex prefers latest assistant with non-empty filters', () => {
    const messages = [
      { role: 'user', content: 'x' },
      {
        role: 'assistant',
        intent: 'search',
        filters: { country: 'X' },
        shops: [shop('1')],
        totalResults: 2
      },
      { role: 'user', content: 'Show more' },
      {
        role: 'assistant',
        intent: 'search',
        filters: { country: 'X' },
        shops: [shop('2')],
        totalResults: 2
      },
      { role: 'user', content: 'Show more' }
    ] as const
    const lastUserIndex = messages.length - 1
    expect(findLastSearchAssistantContextIndex(messages as never[], lastUserIndex)).toBe(3)
  })
})
