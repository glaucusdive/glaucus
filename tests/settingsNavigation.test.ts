import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDrawer } from '../app/composables/useDrawer'

type MenuProps = {
  'aria-label': string
  'aria-expanded': boolean
  onClick: () => void
}

async function renderHeader (backTo?: string) {
  const source = readFileSync(new URL('../app/components/settings/SettingsPage.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'settings-navigation-test', inlineTemplate: true })
  const { code } = await transformWithEsbuild(script.content, 'SettingsPage.ts', { loader: 'ts', format: 'cjs' })
  let menuProps: MenuProps | undefined
  const captureElement = (factory: (...args: any[]) => any) => (...args: any[]) => {
    if (args[0] === 'button' && args[1]?.['aria-label'] === 'Open menu') menuProps = args[1]
    return factory(...args)
  }
  const compiledModule = { exports: {} as { default: Vue.Component } }
  runInNewContext(code, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name: string) => {
      if (name === 'vue') {
        return {
          ...Vue,
          createElementVNode: captureElement(Vue.createElementVNode),
          createElementBlock: captureElement(Vue.createElementBlock)
        }
      }
      if (name === '~/composables/useDrawer') return { useDrawer }
      if (name === 'lucide-vue-next') return { Menu: () => Vue.h('svg'), ChevronLeft: () => Vue.h('svg') }
      throw new Error(`Unexpected component import: ${name}`)
    }
  })
  const app = Vue.createSSRApp({
    render: () => Vue.h(compiledModule.exports.default, { title: 'Settings', backTo }, {
      actions: () => Vue.h('button', { type: 'button' }, 'Save')
    })
  })
  app.component('NuxtLink', Vue.defineComponent({
    props: { to: String },
    setup: (props, { slots }) => () => Vue.h('a', { href: props.to }, slots.default?.())
  }))
  const html = await renderToString(app)
  return { html, menuProps }
}

describe('Settings mobile navigation', () => {
  beforeEach(() => {
    useDrawer().closeMobileMenu()
  })

  it('offers menu access on the Settings root without requiring a back link', async () => {
    const { html, menuProps } = await renderHeader()
    expect(menuProps).toBeDefined()
    expect(html).toContain('aria-label="Open menu"')
    expect(html).toContain('title="Open menu"')
    expect(html).toContain('lg:hidden')
    expect(html).toContain('w-11')
    expect(html).not.toContain('Back to settings')
  })

  it('opens the existing drawer through the rendered menu handler', async () => {
    const { menuProps } = await renderHeader()
    expect(menuProps?.['aria-expanded']).toBe(false)
    menuProps!.onClick()
    expect(useDrawer().isMobileMenuOpen.value).toBe(true)
    expect((await renderHeader()).menuProps?.['aria-expanded']).toBe(true)
    useDrawer().closeMobileMenu()
    expect((await renderHeader()).menuProps?.['aria-expanded']).toBe(false)
  })

  it('keeps subpage back navigation and Save actions alongside the menu', async () => {
    const { html, menuProps } = await renderHeader('/settings')
    expect(menuProps).toBeDefined()
    expect(html).toContain('href="/settings"')
    expect(html).toContain('aria-label="Back to settings"')
    expect(html).toContain('>Save</button>')
    expect(html).toContain('>Settings</h1>')
  })
})