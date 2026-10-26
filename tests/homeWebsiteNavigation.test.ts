import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import { describe, expect, it } from 'vitest'

async function setupHome (signedIn = true) {
  const source = readFileSync(new URL('../app/pages/index.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'home-navigation' })
  const { code } = await transformWithEsbuild(script.content, 'index.js', {
    loader: 'js', format: 'cjs', define: { 'import.meta.server': 'false', 'import.meta.client': 'false' }
  })
  const route = Vue.reactive({ path: '/', query: {} as { chat?: string }, hash: '' })
  const websiteMode = Vue.ref(false)
  const isSignedIn = Vue.ref(signedIn)
  const module = { exports: {} as { default: { setup: (props: object, context: object) => { showChatShell: Vue.ComputedRef<boolean> } } } }
  const scope = Vue.effectScope()
  runInNewContext(code, {
    ...Vue, onMounted: () => {}, module, exports: module.exports,
    definePageMeta: () => {}, useRoute: () => route, useRouter: () => ({ replace: () => {} }),
    useAuth: () => ({ init: async () => {}, isSignedIn }),
    useAnalytics: () => ({ capture: () => {}, AnalyticsEvents: {} }),
    useState: (key: string, initial: () => boolean) => key === 'websiteMode' ? websiteMode : Vue.ref(initial()),
    require: (name: string) => {
      if (name === 'vue') return Vue
      if (name.endsWith('.vue')) return {}
      if (name.endsWith('hasSupabaseAuthCookie')) return { hasSupabaseAuthCookie: () => false }
      throw new Error(`Unexpected import ${name}`)
    }
  })
  const state = scope.run(() => module.exports.default.setup({}, { expose: () => {} }))!
  return { route, websiteMode, isSignedIn, state, scope }
}

describe('Clean Back to website navigation', () => {
  it('links to the clean homepage and records the website choice', () => {
    const source = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    expect(source).toContain('<NavLink to="/" @click="backToWebsite">')
    expect(source).toContain('websiteMode.value = true')
    expect(source).not.toContain('/#hero')
  })

  it('preserves signed-in default chat but stays on the website after exiting', async () => {
    const h = await setupHome()
    try {
      expect(h.state.showChatShell.value).toBe(true)
      h.websiteMode.value = true
      expect(h.state.showChatShell.value).toBe(false)
      h.isSignedIn.value = false
      await Vue.nextTick()
      h.isSignedIn.value = true
      await Vue.nextTick()
      expect(h.state.showChatShell.value).toBe(false)
      h.route.query.chat = '1'
      expect(h.websiteMode.value).toBe(false)
      expect(h.state.showChatShell.value).toBe(true)
    } finally { h.scope.stop() }
  })

  it('keeps guest homepage and explicit chat behavior unchanged', async () => {
    const h = await setupHome(false)
    try {
      expect(h.state.showChatShell.value).toBe(false)
      h.route.query.chat = '1'
      expect(h.state.showChatShell.value).toBe(true)
      delete h.route.query.chat
      expect(h.state.showChatShell.value).toBe(false)
    } finally { h.scope.stop() }
  })
})
