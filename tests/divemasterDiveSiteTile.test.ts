import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import { describe, expect, it } from 'vitest'
import type { DivemasterDiveSiteLink } from '../shared/divemasterProfile'

async function createTile (site: DivemasterDiveSiteLink, pending = false) {
  const source = readFileSync(new URL('../app/components/DivemasterDiveSiteTile.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'dive-site-tile-test', inlineTemplate: true })
  const { code } = await transformWithEsbuild(script.content, 'tile.ts', { loader: 'ts', format: 'cjs' })
  const failedImageUrl = Vue.ref<string | null | undefined>(null)
  let imageProps: { onError: () => void } | undefined
  const captureImage = (factory: (...args: any[]) => any) => (...args: any[]) => {
    if (args[0] === 'img') imageProps = args[1]
    return factory(...args)
  }
  const module = { exports: {} as { default: Vue.Component } }
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name: string) => {
      if (name !== 'vue') throw new Error(`Unexpected import ${name}`)
      return {
        ...Vue,
        ref: () => failedImageUrl,
        createElementVNode: captureImage(Vue.createElementVNode),
        createElementBlock: captureImage(Vue.createElementBlock)
      }
    }
  })
  return {
    render: () => renderToString(Vue.createSSRApp({ render: () => Vue.h(module.exports.default, { site, pending }) })),
    failImage: () => imageProps!.onError()
  }
}

describe('Compact Sites Dived tiles', () => {
  it('shows site text without an image area when there is no photo', async () => {
    const tile = await createTile({ dive_site_id: 'test-site', name: 'Test Reef', country_name: 'Test Country', note: 'Test note', image_url: null })
    const html = await tile.render()
    expect(html).toContain('Test Reef')
    expect(html).toContain('Test Country')
    expect(html).toContain('Test note')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('aspect-video')
  })

  it('marks owner-only pending sites as pending review', async () => {
    const tile = await createTile({
      dive_site_id: 'pending-site',
      name: 'Test Reef',
      country_name: 'Test Country',
      image_url: null
    }, true)
    const html = await tile.render()
    expect(html).toContain('Test Reef')
    expect(html).toContain('Pending review')
  })

  it('renders a fixed small thumbnail when a photo exists', async () => {
    const tile = await createTile({ dive_site_id: 'test-site', name: 'Test Reef', image_url: 'https://example.invalid/reef.jpg' })
    const html = await tile.render()
    expect(html).toContain('width="64"')
    expect(html).toContain('height="64"')
    expect(html).toContain('alt="Test Reef"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('shrink-0')
  })

  it('removes a failed thumbnail without removing the site details', async () => {
    const tile = await createTile({ dive_site_id: 'test-site', name: 'Test Reef', country_name: 'Test Country', image_url: 'https://example.invalid/missing.jpg' })
    expect(await tile.render()).toContain('<img')
    tile.failImage()
    const html = await tile.render()
    expect(html).not.toContain('<img')
    expect(html).toContain('Test Reef')
    expect(html).toContain('Test Country')
  })

  it('tries a replacement URL after an earlier image failed', async () => {
    const site = { dive_site_id: 'test-site', name: 'Test Reef', image_url: 'https://example.invalid/old.jpg' }
    const tile = await createTile(site)
    await tile.render()
    tile.failImage()
    site.image_url = 'https://example.invalid/new.jpg'
    expect(await tile.render()).toContain('https://example.invalid/new.jpg')
  })

  it('retains long names and notes with wrapping rather than truncation', async () => {
    const name = 'LongDiveSiteName'.repeat(10)
    const tile = await createTile({ dive_site_id: 'test-site', name, note: 'First line\nSecond line', image_url: '' })
    const html = await tile.render()
    expect(html).toContain(name)
    expect(html).toContain('First line\nSecond line')
    expect(html).toContain('overflow-wrap:anywhere')
    expect(html).not.toContain('truncate')
    expect(html).not.toContain('<img')
  })
})