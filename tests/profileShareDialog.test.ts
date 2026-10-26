import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import * as icons from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import { describe, expect, it } from 'vitest'

async function renderDialog (profileType: 'shop' | 'divemaster', url: string) {
  const source = readFileSync(new URL('../app/components/ProfileShareDialog.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'profile-share-test', inlineTemplate: true })
  const { code } = await transformWithEsbuild(script.content, 'dialog.ts', { loader: 'ts', format: 'cjs' })
  const module = { exports: {} as { default: Vue.Component } }
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name: string) => {
      if (name === 'vue') return Vue
      if (name === 'lucide-vue-next') return icons
      if (name === 'qrcode.vue') return { default: QrcodeVue, __esModule: true }
      if (name === '~/utils/copyTextToClipboard') return { copyTextToClipboard: async () => true }
      if (name === '~/utils/profileFlyer') return { createProfileFlyer: async () => 'data:image/png;base64,test' }
      throw new Error(`Unexpected import ${name}`)
    }
  })
  const app = Vue.createSSRApp({
    render: () => Vue.h(module.exports.default, {
      open: false, profileType, profileName: 'Synthetic Profile', url, fileName: 'synthetic-profile'
    })
  })
  app.component('Button', {
    setup (_, { slots }) { return () => Vue.h('button', slots.default?.()) }
  })
  return renderToString(app)
}

describe('Profile QR sharing', () => {
  it.each(['shop', 'divemaster'] as const)('renders a %s QR with the public profile URL and sharing actions', async profileType => {
    const url = `https://glaucusdive.com/${profileType === 'shop' ? 'shops' : 'divemaster'}/synthetic-profile`
    const html = await renderDialog(profileType, url)
    expect(html).toContain(`Share ${profileType} profile`)
    expect(html).toContain(`Scan to open this ${profileType} profile`)
    expect(html).toContain(url)
    expect(html).toContain('Synthetic Profile')
    expect(html).toContain('<svg')
    for (const action of ['Copy link', 'Share', 'Download PDF', 'Print', 'Flyer preview']) expect(html).toContain(action)
    expect(html).not.toContain('Download QR')
    const otherUrl = await renderDialog(profileType, `${url}-other`)
    const qrPath = (markup: string) => markup.match(/<svg width="256"[\s\S]*?<\/svg>/)?.[0]
    expect(qrPath(html)).toBeTruthy()
    expect(qrPath(html)).not.toBe(qrPath(otherUrl))
  })
})
