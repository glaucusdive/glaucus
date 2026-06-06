import { describe, expect, it } from 'vitest'
import {
  buildProfileUpdateEmailBody,
  buildProfileUpdateEmailSubject,
  parseProfileUpdateNotifyEmails
} from '../../server/utils/profileUpdateNotification'

describe('profileUpdateNotification', () => {
  it('parses notify emails with defaults', () => {
    expect(parseProfileUpdateNotifyEmails(undefined)).toEqual([
      'rshashwat@gmail.com',
      'general@madebyporter.com'
    ])
    expect(parseProfileUpdateNotifyEmails('a@b.com, c@d.com')).toEqual(['a@b.com', 'c@d.com'])
  })

  it('builds subject and body', () => {
    const payload = {
      userId: 'user-123',
      authEmail: 'auth@example.com',
      displayName: 'Alex Diver',
      contactEmail: 'alex@example.com',
      diverCount: 2,
      source: 'defaults_page'
    }
    expect(buildProfileUpdateEmailSubject(payload)).toBe('Glaucus profile updated — Alex Diver')
    const body = buildProfileUpdateEmailBody(payload)
    expect(body).toContain('user-123')
    expect(body).toContain('Alex Diver')
    expect(body).toContain('Default divers: 2')
  })
})
