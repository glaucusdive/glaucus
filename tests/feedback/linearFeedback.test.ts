import { describe, expect, it } from 'vitest'
import {
  buildLinearFeedbackDescription,
  buildLinearFeedbackTitle,
  FEEDBACK_LIMITS
} from '../../server/utils/linearFeedback'

describe('buildLinearFeedbackTitle', () => {
  it('prefixes bug and uses subject as TLDR', () => {
    const title = buildLinearFeedbackTitle({
      kind: 'bug',
      subject: 'Checkout fails on double-click'
    })
    expect(title).toBe('[Bug] Checkout fails on double-click')
    expect(title.length).toBeLessThanOrEqual(FEEDBACK_LIMITS.titleMax)
  })

  it('prefixes feature', () => {
    const title = buildLinearFeedbackTitle({
      kind: 'feature',
      subject: 'Dark mode for profile'
    })
    expect(title.startsWith('[Feature]')).toBe(true)
    expect(title).toContain('Dark mode')
  })

  it('caps at titleMax', () => {
    const long = 'x'.repeat(500)
    const title = buildLinearFeedbackTitle({
      kind: 'bug',
      subject: long
    })
    expect(title.length).toBeLessThanOrEqual(FEEDBACK_LIMITS.titleMax)
  })
})

describe('buildLinearFeedbackDescription', () => {
  it('includes structured fields and optional page', () => {
    const md = buildLinearFeedbackDescription({
      kind: 'feature',
      subject: 'Better onboarding',
      name: 'Casey',
      email: 'casey@example.com',
      message: 'Love the app!',
      pageUrl: 'https://glaucusdive.com/profile',
      submittedAtIso: '2026-04-02T12:00:00.000Z'
    })
    expect(md).toContain('**Type:** Feature')
    expect(md).toContain('**Subject:** Better onboarding')
    expect(md).toContain('**Name:** Casey')
    expect(md).toContain('casey@example.com')
    expect(md).toContain('Love the app!')
    expect(md).toContain('https://glaucusdive.com/profile')
    expect(md).toContain('Submitted from Glaucus')
  })
})
