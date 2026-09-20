import { describe, expect, it } from 'vitest'
import { extractBlogFaq } from '~~/shared/extractBlogFaq'

const FIRST_TRIP_FAQ = `## Flexibility is part of the plan

Leave room for weather.

## FAQ: planning your first dive trip

### When should I book the dive shop vs the flights?

Shortlist and message shops first. Soft-hold or confirm a shop (or two backups), then buy flights so a nonrefundable ticket doesn't trap you with a weak operator.

### How many days do I need for a first trip?

A week with one buffer day is a sane default: arrive early, dive the middle, keep a weather make-up day, and protect the no-fly window before you leave.

### Do I need a refresh if I certified months ago?

If you feel rusty, ask the shop for a check dive or refresh. Most good operators would rather start shallow than fix confidence issues on a crowded boat.

### What if the boat cancels?

Assume at least one blown day. A buffer day in the itinerary beats flying home without the dives you paid for. Ask the shop's weather policy in writing.

### How does Glaucus help?

You can compare shops in one place, filter by what you need, and start the conversation without tab-hopping five booking sites.

## Closing

The best first trips leave you wanting more.
`

describe('extractBlogFaq', () => {
  it('extracts ### questions under a FAQ heading (first-trip pattern)', () => {
    const pairs = extractBlogFaq(FIRST_TRIP_FAQ)
    expect(pairs).toHaveLength(5)
    expect(pairs[0].question).toBe('When should I book the dive shop vs the flights?')
    expect(pairs[0].answer).toContain('Shortlist and message shops first')
    expect(pairs[4].question).toBe('How does Glaucus help?')
    expect(pairs[4].answer).toContain('compare shops in one place')
  })

  it('returns empty when there is no FAQ section', () => {
    expect(extractBlogFaq('## Hello\n\nNo FAQ here.\n')).toEqual([])
  })

  it('returns empty for blank markdown', () => {
    expect(extractBlogFaq('')).toEqual([])
    expect(extractBlogFaq('   \n')).toEqual([])
  })

  it('falls back to whole-line bold questions when no h3/h4', () => {
    const md = `## FAQ

**Is diving safe for beginners?**

With proper training and a good shop, yes.

**Do I need my own gear?**

Rentals are fine for a first trip.
`
    const pairs = extractBlogFaq(md)
    expect(pairs).toHaveLength(2)
    expect(pairs[0].question).toBe('Is diving safe for beginners?')
    expect(pairs[0].answer).toContain('proper training')
    expect(pairs[1].question).toBe('Do I need my own gear?')
  })

  it('skips questions with empty answers', () => {
    const md = `## FAQ: tips

### Question with no answer?

### Second question?

Answer for the second.
`
    const pairs = extractBlogFaq(md)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].question).toBe('Second question?')
  })

  it('matches FAQ via heading slug containing faq', () => {
    const md = `## Common FAQ items

### Why buffer days?

Weather cancels boats.
`
    const pairs = extractBlogFaq(md)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].question).toBe('Why buffer days?')
  })
})
