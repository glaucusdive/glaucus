import { describe, expect, it } from 'vitest'
import { searchPickerPosition } from '../app/utils/searchPickerPosition'

describe('search picker positioning', () => {
  it('opens below a desktop trigger when there is room', () => {
    const position = searchPickerPosition(
      { top: 100, bottom: 140, left: 200, width: 400 },
      { top: 0, left: 0, width: 1280, height: 800 },
      true
    )
    expect(position.top).toBe('144px')
    expect(position.width).toBe('400px')
    expect(position.maxHeight).toBe('320px')
  })

  it('moves a low iPhone picker above the keyboard even if its trigger is covered', () => {
    const position = searchPickerPosition(
      { top: 600, bottom: 640, left: 16, width: 343 },
      { top: 0, left: 0, width: 375, height: 400 },
      true
    )
    expect(parseFloat(position.top)).toBeGreaterThanOrEqual(8)
    expect(parseFloat(position.top) + parseFloat(position.maxHeight)).toBeLessThanOrEqual(392)
    expect(parseFloat(position.maxHeight)).toBeGreaterThanOrEqual(160)
  })

  it('reserves room for results to grow after filtering or keyboard resizing', () => {
    const position = searchPickerPosition(
      { top: 600, bottom: 640, left: 16, width: 343 },
      { top: 0, left: 0, width: 375, height: 400 },
      true,
      60
    )
    expect(parseFloat(position.top) + parseFloat(position.maxHeight)).toBeLessThanOrEqual(392)
  })

  it('includes viewport offsets when Safari pans the page for keyboard focus', () => {
    const position = searchPickerPosition(
      { top: 500, bottom: 540, left: 0, width: 375 },
      { top: 170, left: 12, width: 320, height: 300 },
      true
    )
    expect(parseFloat(position.top)).toBeGreaterThanOrEqual(178)
    expect(parseFloat(position.top) + parseFloat(position.maxHeight)).toBeLessThanOrEqual(462)
    expect(parseFloat(position.left)).toBeGreaterThanOrEqual(20)
    expect(parseFloat(position.left) + parseFloat(position.width)).toBeLessThanOrEqual(324)
  })

  it('keeps a picker within the viewport when its trigger has scrolled above it', () => {
    const position = searchPickerPosition(
      { top: -100, bottom: -60, left: 0, width: 343 },
      { top: 0, left: 0, width: 375, height: 320 },
      true
    )
    expect(position.top).toBe('8px')
    expect(parseFloat(position.top) + parseFloat(position.maxHeight)).toBeLessThanOrEqual(312)
  })

  it('does not force an 80px panel into a smaller landscape keyboard viewport', () => {
    const position = searchPickerPosition(
      { top: 0, bottom: 20, left: 0, width: 200 },
      { top: 0, left: 0, width: 180, height: 70 },
      false
    )
    expect(parseFloat(position.top) + parseFloat(position.maxHeight)).toBeLessThanOrEqual(62)
    expect(position.width).toBe('164px')
    expect(position.minWidth).toBe('0px')
  })
})