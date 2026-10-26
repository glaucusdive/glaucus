import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import { describe, expect, it } from 'vitest'
import * as credentialCatalog from '../shared/profileCredentialCatalog'

async function renderPicker (suffix: string, withOption = true) {
  const source = readFileSync(new URL('../app/components/ProfileCredentialPicker.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'credential-picker-test', inlineTemplate: true })
  const { code } = await transformWithEsbuild(script.content, 'picker.ts', { loader: 'ts', format: 'cjs' })
  const module = { exports: {} as { default: Vue.Component } }
  runInNewContext(code, {
    module,
    exports: module.exports,
    useAuth: () => ({ accessToken: Vue.ref('') }),
    useSupabase: () => ({ client: {} }),
    require: (name: string) => {
      if (name === 'vue') return Vue
      if (name === '~~/shared/profileCredentialCatalog') return credentialCatalog
      if (name === '~/components/ui/formControlClasses') return { formSelectClass: '' }
      throw new Error(`Unexpected import ${name}`)
    }
  })
  let pickerProps: { modelValue: string[]; knownOptions: Array<{ label: string }>; options: Array<{ label: string }> } | undefined
  const app = Vue.createSSRApp({
    render: () => Vue.h(module.exports.default, {
      modelValue: 'Test Credential',
      agency: 'Test Agency',
      kind: 'certification',
      selectedLabelSuffix: suffix,
      options: withOption ? [{ id: 'Test Credential', label: 'Test Credential', agency: 'Test Agency' }] : []
    })
  })
  app.component('SearchMultiSelect', {
    props: ['modelValue', 'knownOptions', 'options'],
    setup (props) {
      pickerProps = props as typeof pickerProps
      return () => Vue.h('span', props.knownOptions[0]?.label)
    }
  })
  for (const name of ['FormField', 'FormInput', 'Button']) {
    app.component(name, { render: () => Vue.h('span') })
  }
  const html = await renderToString(app)
  return { html, props: pickerProps! }
}

describe('Certification picker review suffix', () => {
  it.each([true, false])('shows Pending without changing the selected value (catalog match: %s)', async withOption => {
    const { html, props } = await renderPicker('Pending', withOption)
    expect(html).toContain(withOption ? 'Test Credential (Test Agency) · Pending' : 'Test Credential · Pending')
    expect(props.modelValue).toEqual([credentialCatalog.credentialOptionId('Test Credential', 'Test Agency')])
    if (withOption) expect(props.options[0].label).toContain('· Pending')
  })

  it('leaves approved certification labels unchanged', async () => {
    const { html } = await renderPicker('')
    expect(html).toContain('Test Credential')
    expect(html).not.toContain('·')
  })

  it('labels rejected certifications distinctly', async () => {
    const { html } = await renderPicker('Rejected')
    expect(html).toContain('· Rejected')
    expect(html).not.toContain('Pending')
  })
})
