import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate, compile, NodeTypes, type ElementNode, type RootNode, type TemplateChildNode } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'
import * as Vue from 'vue'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../app/components/DivemasterProfileEditor.vue', import.meta.url), 'utf8')
const template = parse(source).descriptor.template!.content
const elements: ElementNode[] = []
function visit (node: RootNode | TemplateChildNode) {
  if (node.type === NodeTypes.ELEMENT) elements.push(node)
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(visit)
}
visit(parseTemplate(template))
const account = elements.find(node => node.tag === 'section' && node.loc.source.includes('field-id="dm-full-name"'))!
const toolbar = elements.find(node => node.tag === 'div' && node.loc.source.includes('Edit profile') && node.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'if'))!

async function renderSection (section: ElementNode, overrides = {}) {
  const saveProfile = vi.fn()
  const state = {
    embedded: false, username: 'test-pro', usernameInput: '', fullNameInput: 'Test Professional',
    saving: false, cancelling: false, loading: false, loadError: '', saveMessage: '', saveOk: false,
    usernameMessage: '', usernameOk: false, savingUsername: false, saveUsername: vi.fn(),
    saveProfile, emit: vi.fn(), ...overrides
  }
  const buttons: Record<string, unknown>[] = []
  const render = new Function('Vue', compile(section.loc.source, { mode: 'function', prefixIdentifiers: true }).code)(Vue)
  const app = Vue.createSSRApp({ setup: () => state, render })
  app.component('Button', Vue.defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => {
      buttons.push(attrs)
      return Vue.h('button', attrs, slots.default?.())
    }
  }))
  app.component('FormField', Vue.defineComponent({
    props: ['label', 'fieldId'],
    setup: (props, { slots }) => () => Vue.h('div', [Vue.h('label', { for: props.fieldId }, props.label), slots.default?.()])
  }))
  app.component('FormInput', Vue.defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs }) => () => Vue.h('input', attrs)
  }))
  return { html: await renderToString(app), buttons, saveProfile }
}

describe('Profile Account controls', () => {
  it('shows Save next to Account, with no Settings header action slot', async () => {
    const { html, buttons, saveProfile } = await renderSection(account)
    expect(html).toContain('>Account</h2>')
    expect(html).toContain('Save')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].disabled).toBe(false)
    ;(buttons[0].onClick as () => void)()
    expect(saveProfile).toHaveBeenCalledOnce()
    expect(elements.some(node => node.props.some(prop => prop.type === NodeTypes.DIRECTIVE && prop.name === 'slot' && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'actions'))).toBe(false)
  })

  it('hides the existing username field, URL helper, cooldown, and rename action', async () => {
    const { html } = await renderSection(account, { usernameMessage: 'Username saved.' })
    expect(html).not.toContain('dm-username')
    expect(html).not.toContain('glaucusdive.com/divemaster')
    expect(html).not.toContain('90 days')
    expect(html).not.toContain('Change username')
    expect(html).not.toContain('Username saved.')
    expect(html).toContain('Full name')
  })

  it('preserves first-time username setup and its validation feedback', async () => {
    const { html } = await renderSection(account, { username: '', usernameMessage: 'Choose a valid username.' })
    expect(html).toContain('dm-username')
    expect(html).toContain('Save username')
    expect(html).toContain('Choose a valid username.')
  })

  it('keeps Save disabled and feedback visible while saving', async () => {
    const { html, buttons } = await renderSection(account, { saving: true, saveMessage: 'Saving profile.' })
    expect(buttons[0].disabled).toBe(true)
    expect(html).toContain('role="status"')
    expect(html).toContain('Saving profile.')
    expect(html).toContain('Saving…')
  })

  it('leaves inline Cancel and Save intact without Account-level duplicate actions', async () => {
    const { html, buttons } = await renderSection(account, { embedded: true })
    expect(buttons).toHaveLength(0)
    expect(html).not.toContain('>Account</h2>')
    expect(html).not.toContain('dm-username')
    const inline = await renderSection(toolbar, { embedded: true })
    expect(inline.html).toContain('Edit profile')
    expect(inline.html).toContain('Cancel')
    expect(inline.html).toContain('Save')
    expect(inline.buttons).toHaveLength(2)
  })
})