import { describe, expect, it } from 'vitest'
import {
  formatUsernameCooldownMessage,
  isValidUsername,
  normalizeUsername,
  parseStudentsByCert,
  usernameChangeAvailableAt
} from '../../shared/divemasterProfile'

describe('divemasterProfile helpers', () => {
  it('normalizes and validates usernames', () => {
    expect(normalizeUsername('  Chris_Porter!! ')).toBe('chrisporter')
    expect(normalizeUsername('Chris--Porter')).toBe('chris-porter')
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('chris-porter')).toBe(true)
    expect(isValidUsername('Chris')).toBe(false)
  })

  it('parses students_by_cert', () => {
    expect(parseStudentsByCert({ 'Open Water': 12, bad: 'x', '': 3 })).toEqual({ 'Open Water': 12 })
    expect(parseStudentsByCert(null)).toEqual({})
  })

  it('computes username change cooldown', () => {
    expect(usernameChangeAvailableAt(null)).toBeNull()
    const changed = new Date('2026-01-01T00:00:00.000Z')
    const mid = new Date('2026-02-01T00:00:00.000Z')
    const available = usernameChangeAvailableAt(changed.toISOString(), mid)
    expect(available).not.toBeNull()
    expect(formatUsernameCooldownMessage(available!)).toContain('2026')
    expect(usernameChangeAvailableAt(changed.toISOString(), new Date('2026-05-01T00:00:00.000Z'))).toBeNull()
  })
})
