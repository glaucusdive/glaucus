import { describe, expect, it } from 'vitest'
import { matchPublishedDivemasterTargets } from '../../server/utils/resolveDivemasterReview'

describe('matchPublishedDivemasterTargets', () => {
  const candidates = [
    { user_id: 'maya-id', status: 'published', profiles: { username: 'maya-chen', display_name: 'Maya Chen' } },
    { user_id: 'maya-guide-id', status: 'published', profiles: { username: 'maya-guide', display_name: 'Maya Dive Guide' } },
    { user_id: 'draft-id', status: 'draft', profiles: { username: 'maya-draft', display_name: 'Maya Draft' } }
  ]

  it('matches display names and usernames without exposing non-published profiles', () => {
    expect(matchPublishedDivemasterTargets(candidates, 'Maya Chen')).toEqual([
      { user_id: 'maya-id', username: 'maya-chen', display_name: 'Maya Chen' }
    ])
    expect(matchPublishedDivemasterTargets(candidates, 'maya-guide')[0]?.user_id).toBe('maya-guide-id')
    expect(matchPublishedDivemasterTargets(candidates, 'maya').map(target => target.user_id))
      .toEqual(['maya-id', 'maya-guide-id'])
    expect(matchPublishedDivemasterTargets(candidates, 'maya-draft')).toEqual([])
  })
})