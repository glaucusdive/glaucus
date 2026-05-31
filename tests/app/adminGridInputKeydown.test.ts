import { describe, it, expect } from 'vitest'
import { shouldKeepArrowInInput } from '../../app/utils/adminGridInputKeydown'

function inputWith (value: string, start: number, end = start): HTMLInputElement {
  return {
    value,
    selectionStart: start,
    selectionEnd: end
  } as HTMLInputElement
}

describe('shouldKeepArrowInInput', () => {
  it('keeps ArrowRight when caret is not at end', () => {
    const input = inputWith('Jl. Pantai Silayukti', 5)
    expect(shouldKeepArrowInInput({ key: 'ArrowRight' } as KeyboardEvent, input)).toBe(true)
  })

  it('allows ArrowRight at end to move to next cell', () => {
    const value = 'Jl. Pantai Silayukti'
    const input = inputWith(value, value.length)
    expect(shouldKeepArrowInInput({ key: 'ArrowRight' } as KeyboardEvent, input)).toBe(false)
  })

  it('keeps ArrowRight when text is fully selected', () => {
    const input = inputWith('long address', 0, 12)
    expect(shouldKeepArrowInInput({ key: 'ArrowRight' } as KeyboardEvent, input)).toBe(true)
  })

  it('keeps Home and End in the input', () => {
    const input = inputWith('long address', 3)
    expect(shouldKeepArrowInInput({ key: 'Home' } as KeyboardEvent, input)).toBe(true)
    expect(shouldKeepArrowInInput({ key: 'End' } as KeyboardEvent, input)).toBe(true)
  })
})
