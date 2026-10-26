import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import {
  DIVE_SITE_ADD_NEW_ID,
  formatUsernameCooldownMessage,
  isValidUsername,
  LAST_FORMAL_TRAINING_NAMES,
  LAST_FORMAL_TRAINING_OTHER,
  lastFormalTrainingSelectValue,
  normalizeUsername,
  parseStudentsByCert,
  parseStudentsCertified,
  usernameChangeAvailableAt
} from '../../shared/divemasterProfile'

describe('divemasterProfile helpers', () => {
  it('includes Other in last formal training names and maps custom names to Other select', () => {
    expect(LAST_FORMAL_TRAINING_NAMES[LAST_FORMAL_TRAINING_NAMES.length - 1]).toBe(LAST_FORMAL_TRAINING_OTHER)
    expect(LAST_FORMAL_TRAINING_NAMES).toContain('Rescue Diver')
    expect(lastFormalTrainingSelectValue('Rescue Diver')).toBe('Rescue Diver')
    expect(lastFormalTrainingSelectValue('Custom Workshop')).toBe(LAST_FORMAL_TRAINING_OTHER)
    expect(lastFormalTrainingSelectValue('')).toBe('')
    expect(DIVE_SITE_ADD_NEW_ID).toBe('__add_new__')
  })

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

  it('parses students_certified', () => {
    expect(parseStudentsCertified(12.7)).toBe(12)
    expect(parseStudentsCertified('8')).toBe(8)
    expect(parseStudentsCertified(-1)).toBe(0)
    expect(parseStudentsCertified('x')).toBe(0)
    expect(parseStudentsCertified(null)).toBe(0)
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

describe('Personal certification presentation', () => {
  it.each([
    '../../app/components/DivemasterProfileEditor.vue',
    '../../app/pages/admin/divemasters/[userId].vue',
    '../../app/pages/divemaster/[username].vue'
  ])('omits teaching counts in %s without removing certification details', path => {
    const { descriptor } = parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
    const template = descriptor.template!.content
    expect(template).not.toContain('students_certified')
    expect(template).not.toContain('Students certified')
    expect(template).toContain('Certifications')
    expect(template).toContain('issued_at')
    expect(template).toContain('cert_number')
  })
})
