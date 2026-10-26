import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { buildShopProfileUrl } from '../../shared/shopProfileUrl'
import type { ShopFormSnapshot, ShopPortalPublicProfile } from '../../shared/shopPortalPayload'

const partnerSource = readFileSync(new URL('../../app/pages/partner/[token].vue', import.meta.url), 'utf8')
const publicProfile: ShopPortalPublicProfile = {
  slugOrId: 'synthetic-scuba', name: 'Published Scuba', subtitle: 'Amed', contacts: ['public@example.com']
}
const response = () => ({
  businessName: 'Published Scuba',
  snapshot: { business_name: 'Published Scuba' },
  lookups: { countries: [] },
  publicProfile: structuredClone(publicProfile)
})
interface PortalState {
  publicProfile: Vue.Ref<ShopPortalPublicProfile | null>
  publicProfileUrl: Vue.ComputedRef<string>
  form: Vue.Ref<ShopFormSnapshot>
  loading: Vue.Ref<boolean>
  loadError: Vue.Ref<string>
  shareProfileOpen: Vue.Ref<boolean>
  submitterName: Vue.Ref<string>
  submitterEmail: Vue.Ref<string>
  submitted: Vue.Ref<boolean>
  submitting: Vue.Ref<boolean>
  submit: () => Promise<void>
}
const flushPortal = () => new Promise<void>(resolve => setTimeout(resolve, 0))

async function setupPortal (fetch = vi.fn().mockResolvedValue(response())) {
  const { descriptor } = parse(partnerSource)
  const script = compileScript(descriptor, { id: 'partner-sharing-test' })
  const { code } = await transformWithEsbuild(script.content, 'partner.ts', {
    loader: 'ts', format: 'cjs', define: { 'import.meta.client': 'true' }
  })
  const route = Vue.reactive({ params: { token: 'synthetic-partner-token' } })
  const module = { exports: {} as { default: { setup: (props: object, context: object) => PortalState } } }
  runInNewContext(code, {
    module, exports: module.exports,
    definePageMeta: () => {}, useSeoMeta: () => {}, useHead: () => {}, useRoute: () => route,
    window: { location: { origin: 'https://glaucusdive.com' } }, $fetch: fetch,
    require: (name: string) => {
      if (name === 'vue') return Vue
      if (name === '~~/shared/shopProfileUrl') return { buildShopProfileUrl }
      if (name.endsWith('.vue')) return {}
      if (name === '~/utils/shopPortalForm') return { buildPortalSubmissionPayload: vi.fn() }
      if (name === '~/utils/shopSeo') return { shopSeoTitle: vi.fn() }
      throw new Error(`Unexpected import ${name}`)
    }
  })
  const scope = Vue.effectScope()
  const state = scope.run(() => module.exports.default.setup({}, { expose: () => {} }))!
  await flushPortal()
  return { state, route, fetch, scope }
}

describe('Profile sharing entry points', () => {
  it('wires DivePro flyer access to verified ownership and leaves shops default-off', () => {
    const divePro = readFileSync(new URL('../../app/pages/divemaster/[username].vue', import.meta.url), 'utf8')
    const shop = readFileSync(new URL('../../app/components/DiveShopDetail.vue', import.meta.url), 'utf8')
    expect(divePro.match(/<ProfileShareDialog[\s\S]*?\/>/)?.[0]).toContain(':can-use-flyer="isOwner"')
    expect(shop.match(/<ProfileShareDialog[\s\S]*?\/>/)?.[0]).not.toContain('can-use-flyer')
    expect(partnerSource.match(/<ProfileShareDialog[\s\S]*?\/>/)?.[0]).toContain('v-if="!loading && !loadError && publicProfile"')
    expect(partnerSource.match(/<ProfileShareDialog[\s\S]*?\/>/)?.[0]).toContain('can-use-flyer')
  })

  it('shares only the loaded public snapshot, not unsaved form edits or the partner URL', async () => {
    const harness = await setupPortal()
    try {
      expect(harness.state.loading.value).toBe(false)
      expect(harness.state.publicProfile.value).toEqual(publicProfile)
      harness.state.form.value.business_name = 'Unsaved business'
      harness.state.form.value.email = 'submitter@example.com'
      expect(harness.state.publicProfile.value).toEqual(publicProfile)
      expect(harness.state.publicProfileUrl.value).toBe('https://glaucusdive.com/shops/synthetic-scuba')
      expect(harness.state.publicProfileUrl.value).not.toContain(harness.route.params.token)
      expect(JSON.stringify(harness.state.publicProfile.value)).not.toContain('submitter@example.com')
    } finally { harness.scope.stop() }
  })

  it('removes a previous shop and closes sharing when a new token fails validation', async () => {
    const harness = await setupPortal()
    try {
      harness.state.shareProfileOpen.value = true
      harness.fetch.mockRejectedValueOnce(new Error('Invalid partner link'))
      harness.route.params.token = 'synthetic-revoked-token'
      await flushPortal()
      expect(harness.state.publicProfile.value).toBeNull()
      expect(harness.state.shareProfileOpen.value).toBe(false)
      expect(harness.state.publicProfileUrl.value).toBe('')
      expect(harness.state.loadError.value).toBe('Invalid partner link')
    } finally { harness.scope.stop() }
  })

  it('preserves the public flyer snapshot after submitting listing updates', async () => {
    const harness = await setupPortal()
    try {
      harness.state.submitterName.value = 'Synthetic Representative'
      harness.state.submitterEmail.value = 'representative@example.com'
      harness.state.form.value.business_name = 'Pending new name'
      await harness.state.submit()
      expect(harness.state.submitted.value).toBe(true)
      expect(harness.state.publicProfile.value).toEqual(publicProfile)
      expect(harness.state.publicProfileUrl.value).toBe('https://glaucusdive.com/shops/synthetic-scuba')
      expect(harness.fetch).toHaveBeenLastCalledWith('/api/shop-portal/synthetic-partner-token/submit', expect.objectContaining({ method: 'POST' }))
    } finally { harness.scope.stop() }
  })

  it('does not apply an old submission result to a different partner page', async () => {
    let finish: () => void = () => {}
    const fetch = vi.fn()
      .mockResolvedValueOnce(response())
      .mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
      .mockResolvedValueOnce(response())
    const harness = await setupPortal(fetch)
    try {
      harness.state.submitterName.value = 'Synthetic Representative'
      harness.state.submitterEmail.value = 'representative@example.com'
      const submission = harness.state.submit()
      harness.route.params.token = 'synthetic-next-token'
      await flushPortal()
      finish()
      await submission
      expect(harness.state.submitted.value).toBe(false)
      expect(harness.state.submitting.value).toBe(false)
      expect(harness.state.loadError.value).toBe('')
    } finally { harness.scope.stop() }
  })

  it('ignores a stale token response after navigating to another partner page', async () => {
    let finish: (value: ReturnType<typeof response>) => void = () => {}
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      .mockRejectedValueOnce(new Error('Invalid partner link'))
    const harness = await setupPortal(fetch)
    try {
      harness.route.params.token = 'synthetic-invalid-token'
      await flushPortal()
      finish(response())
      await flushPortal()
      expect(harness.state.publicProfile.value).toBeNull()
      expect(harness.state.loadError.value).toBe('Invalid partner link')
    } finally { harness.scope.stop() }
  })
})
