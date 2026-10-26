import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import * as icons from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import { describe, expect, it, vi } from 'vitest'

async function renderDialog (profileType: 'shop' | 'divemaster', url: string, canUseFlyer?: boolean) {
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
      open: false, profileType, profileName: 'Synthetic Profile', url, fileName: 'synthetic-profile', canUseFlyer
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
    const html = await renderDialog(profileType, url, true)
    expect(html).toContain(`Share ${profileType} profile`)
    expect(html).toContain(`Scan to open this ${profileType} profile`)
    expect(html).toContain(url)
    expect(html).toContain('Synthetic Profile')
    expect(html).toContain('<svg')
    for (const action of ['Copy link', 'Share', 'Download PDF', 'Print', 'Flyer preview']) expect(html).toContain(action)
    expect(html).not.toContain('Download QR')
    const otherUrl = await renderDialog(profileType, `${url}-other`, true)
    const qrPath = (markup: string) => markup.match(/<svg width="256"[\s\S]*?<\/svg>/)?.[0]
    expect(qrPath(html)).toBeTruthy()
    expect(qrPath(html)).not.toBe(qrPath(otherUrl))
  })

  it.each(['shop', 'divemaster'] as const)('defaults to sharing-only for public %s visitors', async profileType => {
    for (const permission of [undefined, false]) {
      const html = await renderDialog(profileType, 'https://glaucusdive.com/shops/synthetic', permission)
      expect(html).toContain('Copy link')
      expect(html).toContain('Share')
      for (const ownerContent of ['Flyer preview', 'Preparing flyer', 'Download PDF', 'Print', 'Scan to open', 'id="profile-qr"']) {
        expect(html).not.toContain(ownerContent)
      }
    }
  })
})

interface DialogState {
  dialogElement: Vue.Ref<{ open: boolean; showModal: () => void; close: () => void } | null>
  qrElement: Vue.Ref<{ querySelector: () => object } | null>
  flyerImage: Vue.Ref<string>
  generating: Vue.Ref<boolean>
  statusMessage: Vue.Ref<string>
  downloadPdf: () => Promise<void>
  printQr: () => void
}

const flushDialog = () => new Promise<void>(resolve => setTimeout(resolve, 0))

async function setupDialog (createProfileFlyer = vi.fn(async () => 'data:image/png;base64,synthetic')) {
  const source = readFileSync(new URL('../app/components/ProfileShareDialog.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'dialog-lifecycle-test' })
  const { code } = await transformWithEsbuild(script.content, 'dialog.ts', {
    loader: 'ts', format: 'cjs', supported: { 'dynamic-import': false }
  })
  const module = { exports: {} as { default: { setup: (props: object, context: object) => DialogState } } }
  const printedMarkup = vi.fn()
  const openWindow = vi.fn(() => ({ document: { write: printedMarkup, close: vi.fn() }, focus: vi.fn(), print: vi.fn() }))
  const savePdf = vi.fn()
  const addImage = vi.fn()
  const loadPdf = vi.fn()
  const props = Vue.reactive({
    open: true, canUseFlyer: false, profileName: 'Synthetic', profileType: 'divemaster',
    url: 'https://glaucusdive.com/divemaster/synthetic', fileName: 'synthetic'
  })
  const scope = Vue.effectScope()
  runInNewContext(code, {
    module, exports: module.exports,
    XMLSerializer: class { serializeToString () { return '<svg />' } },
    window: { open: openWindow },
    require: (name: string) => {
      if (name === 'vue') return { ...Vue, onUnmounted: () => {} }
      if (name === 'lucide-vue-next') return icons
      if (name === 'qrcode.vue') return { default: QrcodeVue, __esModule: true }
      if (name === '~/utils/copyTextToClipboard') return { copyTextToClipboard: async () => true }
      if (name === '~/utils/profileFlyer') return { createProfileFlyer }
      if (name === 'jspdf') {
        loadPdf()
        return { jsPDF: class { setProperties () {} addImage = addImage; save = savePdf } }
      }
      throw new Error(`Unexpected import ${name}`)
    }
  })
  const state = scope.run(() => module.exports.default.setup(props, { expose: () => {} }))!
  const dialog = { open: false, showModal () { this.open = true }, close () { this.open = false } }
  state.dialogElement.value = dialog
  state.qrElement.value = { querySelector: () => ({}) }
  await flushDialog()
  return { props, state, createProfileFlyer, openWindow, printedMarkup, savePdf, addImage, loadPdf, scope, dialog }
}

describe('Flyer capability lifecycle', () => {
  it('does not generate flyers or open print windows for public sharing', async () => {
    const harness = await setupDialog()
    try {
      expect(harness.dialog.open).toBe(true)
      expect(harness.createProfileFlyer).not.toHaveBeenCalled()
      await harness.state.downloadPdf()
      harness.state.printQr()
      expect(harness.openWindow).not.toHaveBeenCalled()
      expect(harness.loadPdf).not.toHaveBeenCalled()
      expect(harness.state.flyerImage.value).toBe('')
    } finally { harness.scope.stop() }
  })

  it('uses the identical owner artwork for preview, PDF, and Print', async () => {
    const harness = await setupDialog()
    try {
      harness.props.canUseFlyer = true
      await flushDialog()
      const preview = harness.state.flyerImage.value
      await harness.state.downloadPdf()
      expect(harness.loadPdf).toHaveBeenCalledOnce()
      expect(harness.addImage).toHaveBeenCalledWith(preview, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
      expect(harness.savePdf).toHaveBeenCalledWith('synthetic-glaucus-profile.pdf')
      harness.state.printQr()
      expect(harness.printedMarkup).toHaveBeenCalledWith(expect.stringContaining(`src="${preview}"`))
      harness.props.canUseFlyer = false
      await flushDialog()
      expect(harness.state.flyerImage.value).toBe('')
      await harness.state.downloadPdf()
      harness.state.printQr()
      expect(harness.savePdf).toHaveBeenCalledOnce()
      expect(harness.openWindow).toHaveBeenCalledOnce()
    } finally { harness.scope.stop() }
  })

  it('discards pending owner artwork when ownership is lost', async () => {
    let finish: (image: string) => void = () => {}
    const create = vi.fn(() => new Promise<string>(resolve => { finish = resolve }))
    const harness = await setupDialog(create)
    try {
      harness.props.canUseFlyer = true
      await flushDialog()
      expect(create).toHaveBeenCalledOnce()
      expect(harness.state.generating.value).toBe(true)
      harness.props.canUseFlyer = false
      finish('data:image/png;base64,stale')
      await flushDialog()
      expect(harness.state.flyerImage.value).toBe('')
      expect(harness.state.generating.value).toBe(false)
      expect(harness.state.statusMessage.value).toBe('')
    } finally { harness.scope.stop() }
  })

  it('clears owner artwork on profile changes and dialog close', async () => {
    const harness = await setupDialog()
    try {
      harness.props.canUseFlyer = true
      await flushDialog()
      expect(harness.state.flyerImage.value).toContain('data:image/png')
      harness.props.url = 'https://glaucusdive.com/divemaster/another'
      expect(harness.state.flyerImage.value).toBe('')
      harness.props.open = false
      await flushDialog()
      expect(harness.state.flyerImage.value).toBe('')
      expect(harness.dialog.open).toBe(false)
      await harness.state.downloadPdf()
      harness.state.printQr()
      expect(harness.openWindow).not.toHaveBeenCalled()
    } finally { harness.scope.stop() }
  })
})
