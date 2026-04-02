import { describe, expect, it } from 'vitest'
import {
  buildLinearFeedbackDescription,
  buildLinearFeedbackTitle,
  FEEDBACK_LIMITS
} from '../../server/utils/linearFeedback'

describe('buildLinearFeedbackTitle', () => {
  it('prefixes bug and uses message snippet when long enough', () => {
    const title = buildLinearFeedbackTitle({
      kind: 'bug',
      name: 'Ada',
      message: 'The checkout button does nothing when I click it twice in a row'
    })
    expect(title.startsWith('[Bug]')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(FEEDBACK_LIMITS.titleMax)
  })

  it('prefixes feature', () => {
    const title = buildLinearFeedbackTitle({
      kind: 'feature',
      name: 'Bob',
      message: 'Please add dark mode for the profile page settings area'
    })
    expect(title.startsWith('[Feature]')).toBe(true)
  })

  it('caps at titleMax', () => {
    const long = 'x'.repeat(500)
    const title = buildLinearFeedbackTitle({
      kind: 'bug',
      name: 'N',
      message: long
    })
    expect(title.length).toBeLessThanOrEqual(FEEDBACK_LIMITS.titleMax)
  })
})

describe('buildLinearFeedbackDescription', () => {
  it('includes structured fields and optional page', () => {
    const md = buildLinearFeedbackDescription({
      kind: 'feature',
      name: 'Casey',
      email: 'casey@example.com',
      message: 'Love the app!',
      pageUrl: 'https://glaucusdive.com/profile',
      submittedAtIso: '2026-04-02T12:00:00.000Z'
    })
    expect(md).toContain('**Type:** Feature')
    expect(md).toContain('**Name:** Casey')
    expect(md).toContain('casey@example.com')
    expect(md).toContain('Love the app!')
    expect(md).toContain('https://glaucusdive.com/profile')
    expect(md).toContain('Submitted from Glaucus')
  })
})
