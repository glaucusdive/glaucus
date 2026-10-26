import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProfileFlyer, wrapFlyerText } from '../../app/utils/profileFlyer'

afterEach(() => vi.unstubAllGlobals())

describe('Profile flyer text layout', () => {
  const measure = (text: string) => Array.from(text).length
  it('wraps long unbroken names and URLs within the available width', () => {
    const lines = wrapFlyerText('averylongunbrokenname', 6, 10, measure)
    expect(lines.join('')).toBe('averylongunbrokenname')
    expect(lines.every(line => measure(line) <= 6)).toBe(true)
  })
  it('bounds biographies and marks shortened content explicitly', () => {
    const lines = wrapFlyerText('A long biography that must fit on one page', 10, 2, measure)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatch(/…$/)
    expect(lines.every(line => measure(line) <= 10)).toBe(true)
  })
  it('preserves Unicode and normalizes line breaks', () => {
    expect(wrapFlyerText('Élodie\n潜水 🤿', 100, 3, measure)).toEqual(['Élodie 潜水 🤿'])
    expect(wrapFlyerText('', 100, 3, measure)).toEqual([])
  })

  it('flows the QR directly after the actual text instead of reserving empty rows', async () => {
    const fillText = vi.fn()
    const drawImage = vi.fn()
    const canvas = {
      width: 0, height: 0,
      getContext: () => ({
        fillRect: vi.fn(), fillText, drawImage,
        measureText: (text: string) => ({ width: text.length * 24 })
      }),
      toDataURL: () => 'data:image/png;base64,test'
    }
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, createElement: () => canvas })
    vi.stubGlobal('Image', class { src = ''; async decode () {} })
    const url = 'https://example.test/profile'
    await createProfileFlyer('Test Shop', url, {}, '<svg/>')
    expect(drawImage.mock.calls[0]?.[2]).toBe(326)
    drawImage.mockClear()
    fillText.mockClear()
    await createProfileFlyer('Test Pro', url, { subtitle: 'Dive guide', description: 'Short bio' }, '<svg/>')
    const bioY = fillText.mock.calls.find(([text]) => text === 'Short bio')?.[2]
    expect(drawImage.mock.calls[0]?.[2]).toBe(Number(bioY) + 36)
    expect(drawImage.mock.calls[0]?.[2]).toBe(432)
  })
})
