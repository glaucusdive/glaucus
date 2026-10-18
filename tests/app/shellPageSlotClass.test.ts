import { describe, expect, it } from 'vitest'
import { shellPageSlotClass } from '../../app/utils/shellPageSlotClass'

describe('shellPageSlotClass', () => {
  it('centers auth in the layout slot so /auth does not depend on flex-1 through Nuxt wrappers', () => {
    expect(shellPageSlotClass(true)).toBe('min-h-0 min-w-0 flex-1 grid place-items-center overflow-y-auto')
  })

  it('keeps a flex column slot for every other page', () => {
    expect(shellPageSlotClass(false)).toBe('min-h-0 min-w-0 flex-1 flex flex-col')
  })
})
