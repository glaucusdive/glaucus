import { describe, expect, it } from 'vitest'
import {
  bookingCoursesStepMessage,
  bookingDiveSitesStepMessage,
  bookingGearStepMessage,
  bookingMultiSelectChipHint
} from '../../shared/bookingMultiSelectPrompts'
import { getBookingMultiSelectAdvanceCopy, getNextBookingStep } from '../../server/utils/bookingFastPath'

describe('bookingMultiSelectChipHint', () => {
  it('uses add-more + Done copy when courses are preselected', () => {
    const hint = bookingMultiSelectChipHint('courses', true)
    expect(hint).toMatch(/Add another course/i)
    expect(hint).toMatch(/Done/i)
    expect(hint).not.toMatch(/any/i)
  })

  it('uses pick or Done copy when nothing is preselected', () => {
    const hint = bookingMultiSelectChipHint('courses', false)
    expect(hint).toMatch(/Pick one or more/i)
    expect(hint).toMatch(/Done/i)
    expect(hint).not.toMatch(/any/i)
  })
})

describe('bookingCoursesStepMessage', () => {
  it('notes search preselection without suggesting "any"', () => {
    const msg = bookingCoursesStepMessage({ desiredCourses: ['Wreck Diver'] })
    expect(msg).toContain('Wreck Diver')
    expect(msg).toContain('from your search')
    expect(msg).toMatch(/Add another course/i)
    expect(msg).not.toMatch(/say "any"/i)
  })
})

describe('getBookingMultiSelectAdvanceCopy', () => {
  it('advances to dive sites without repeating dates or courses', () => {
    const p = {
      name: 'Alex',
      email: 'a@b.com',
      startDate: '2026-05-30',
      endDate: '2026-06-04',
      desiredCourses: ['Wreck Diver'],
      coursesSelectionComplete: true
    }
    const next = getNextBookingStep(p)!
    const copy = getBookingMultiSelectAdvanceCopy(next, p)
    expect(copy.message).toContain('dive sites')
    expect(copy.message).not.toContain('Wreck Diver')
    expect(copy.messagePreamble).toBeUndefined()
  })
})

describe('bookingGearStepMessage', () => {
  it('prompts to pick gear or Done without a None chip', () => {
    const msg = bookingGearStepMessage('Chris Porter')
    expect(msg).toMatch(/rental gear/i)
    expect(msg).toMatch(/click Done/i)
    expect(msg).not.toMatch(/\bNone\b/i)
  })
})

describe('bookingDiveSitesStepMessage', () => {
  it('asks for more sites when sites are already noted from search', () => {
    const msg = bookingDiveSitesStepMessage({
      desiredDiveSites: ['Manta Ridge']
    })
    expect(msg).toContain('Manta Ridge')
    expect(msg).toMatch(/Add another dive site/i)
  })
})
