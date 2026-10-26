import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { normalizeAuthRedirect } from '../app/utils/authRedirect'

async function createCta (signedIn = false, loading = false) {
  const source = readFileSync(new URL('../app/components/divemaster/DivemasterDirectory.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'directory-cta-test' })
  const declarations = script.scriptSetupAst!.flatMap(node => node.type === 'VariableDeclaration' ? node.declarations : [])
  const target = declarations.find(node => node.id.type === 'Identifier' && node.id.name === 'addProfileLocation')!
  const handler = script.scriptSetupAst!.find(node => node.type === 'FunctionDeclaration' && node.id?.name === 'openProfileSetup')!
  const text = descriptor.scriptSetup!.content
  const { code } = await transformWithEsbuild(`const ${text.slice(target.start!, target.end!)};\n${text.slice(handler.start!, handler.end!)}`, 'cta.ts', { loader: 'ts' })
  const isSignedIn = ref(signedIn)
  const authLoading = ref(loading)
  const initAuth = vi.fn(async () => { authLoading.value = false })
  const navigateTo = vi.fn()
  const cta = runInNewContext(`${code}\n;({ addProfileLocation, openProfileSetup })`, { computed, isSignedIn, authLoading, initAuth, navigateTo })
  const event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: vi.fn() }
  return { ...cta, isSignedIn, authLoading, initAuth, navigateTo, event }
}

describe('DivePros Add your profile', () => {
  it('opens signup for guests and preserves Profile Settings as the return destination', async () => {
    const cta = await createCta()
    expect(cta.addProfileLocation.value).toEqual({ path: '/auth', query: { signup: '1', redirect: '/settings/profile' } })
    await cta.openProfileSetup(cta.event)
    expect(cta.navigateTo).toHaveBeenCalledWith(cta.addProfileLocation.value)
    expect(normalizeAuthRedirect(cta.addProfileLocation.value.query.redirect)).toBe('/settings/profile')
    expect(cta.initAuth).not.toHaveBeenCalled()
  })

  it('sends signed-in users directly to Profile Settings', async () => {
    const cta = await createCta(true)
    await cta.openProfileSetup(cta.event)
    expect(cta.navigateTo).toHaveBeenCalledWith({ path: '/settings/profile' })
    expect(cta.event.preventDefault).toHaveBeenCalledOnce()
  })

  it('waits for initial auth before deciding a signed-in destination', async () => {
    const cta = await createCta(false, true)
    cta.initAuth.mockImplementation(async () => {
      cta.isSignedIn.value = true
      cta.authLoading.value = false
    })
    await cta.openProfileSetup(cta.event)
    expect(cta.initAuth).toHaveBeenCalledOnce()
    expect(cta.navigateTo).toHaveBeenCalledWith({ path: '/settings/profile' })
  })

  it('opens signup if initial auth confirms the user is a guest', async () => {
    const cta = await createCta(false, true)
    await cta.openProfileSetup(cta.event)
    expect(cta.initAuth).toHaveBeenCalledOnce()
    expect(cta.navigateTo).toHaveBeenCalledWith({ path: '/auth', query: { signup: '1', redirect: '/settings/profile' } })
  })

  it.each([
    { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }
  ])('preserves native browser navigation for %o', async modifier => {
    const cta = await createCta()
    await cta.openProfileSetup({ ...cta.event, ...modifier })
    expect(cta.navigateTo).not.toHaveBeenCalled()
    expect(cta.event.preventDefault).not.toHaveBeenCalled()
  })
})