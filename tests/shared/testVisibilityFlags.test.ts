import { describe, expect, it } from 'vitest'
import { isTestShopRow, TEST_SHOP_IDS } from '../../shared/testShops'
import { isTestDivemasterRow, isTestDivemasterUsername } from '../../shared/testDivemasters'

describe('isTestShopRow', () => {
  it('prefers is_test and falls back to seeded ids', () => {
    expect(isTestShopRow({ id: 'x', is_test: true })).toBe(true)
    expect(isTestShopRow({ id: TEST_SHOP_IDS[0], is_test: false })).toBe(true)
    expect(isTestShopRow({ id: '22222222-2222-4222-8222-222222222222', is_test: false })).toBe(false)
  })
})

describe('isTestDivemasterRow', () => {
  it('prefers is_test and falls back to username allowlist', () => {
    expect(isTestDivemasterRow({ username: 'cleo', is_test: true })).toBe(true)
    expect(isTestDivemasterUsername('madebyporter')).toBe(true)
    expect(isTestDivemasterRow({ username: 'madebyporter' })).toBe(true)
    expect(isTestDivemasterRow({ username: 'cleo', is_test: false })).toBe(false)
  })
})
