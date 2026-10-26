import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { parse as parseTemplate, NodeTypes, type ElementNode, type RootNode, type TemplateChildNode } from '@vue/compiler-dom'
import { transformWithEsbuild } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { revealLastProfileRow } from '../app/utils/revealLastProfileRow'

async function loadHandler (path: string, name: string, context: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'picker-focus-test' })
  const declaration = script.scriptSetupAst?.find(node => node.type === 'FunctionDeclaration' && node.id?.name === name)
  if (!declaration || declaration.start == null || declaration.end == null) throw new Error(`Missing ${name}`)
  const handler = descriptor.scriptSetup!.content.slice(declaration.start, declaration.end)
  const { code } = await transformWithEsbuild(handler, 'handler.ts', { loader: 'ts' })
  return runInNewContext(`${code}\n;${name}`, context)
}

async function createPicker (overrides = {}) {
  const open = { value: false }
  const props = { disabled: false, searchable: true, loadPage: null, ...overrides }
  const focus = vi.fn()
  const ticks: Array<() => void> = []
  const schedulePositionPanel = vi.fn()
  const fetchRemotePage = vi.fn()
  const toggleOpen = await loadHandler('../app/components/ui/SearchMultiSelect.vue', 'toggleOpen', {
    open,
    props,
    searchInputRef: { value: { focus } },
    nextTick: (callback: () => void) => { ticks.push(callback) },
    schedulePositionPanel,
    fetchRemotePage
  })
  return { open, props, focus, ticks, toggleOpen, schedulePositionPanel, fetchRemotePage }
}

describe('Searchable picker focus', () => {
  it('positions then focuses Search after rendering, without waiting for options', async () => {
    const picker = await createPicker({ loadPage: vi.fn() })
    picker.toggleOpen()
    expect(picker.schedulePositionPanel).toHaveBeenCalledOnce()
    expect(picker.fetchRemotePage).toHaveBeenCalledWith(true)
    expect(picker.focus).not.toHaveBeenCalled()
    picker.ticks[0]()
    expect(picker.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('does not focus Search after a quick close', async () => {
    const picker = await createPicker()
    picker.toggleOpen()
    picker.toggleOpen()
    picker.ticks[0]()
    expect(picker.focus).not.toHaveBeenCalled()
  })

  it('does not focus a picker that becomes disabled before rendering', async () => {
    const picker = await createPicker()
    picker.toggleOpen()
    picker.props.disabled = true
    picker.ticks[0]()
    expect(picker.focus).not.toHaveBeenCalled()
  })

  it('leaves nonsearchable pickers and disabled controls unchanged', async () => {
    const picker = await createPicker({ searchable: false })
    picker.toggleOpen()
    picker.ticks[0]()
    expect(picker.focus).not.toHaveBeenCalled()
    const disabled = await createPicker({ disabled: true })
    disabled.toggleOpen()
    expect(disabled.open.value).toBe(false)
    expect(disabled.ticks).toHaveLength(0)
  })
})

describe('New Sites Dived row visibility', () => {
  it('adds a draft row, then reveals and focuses its picker without opening it', async () => {
    const focus = vi.fn()
    const click = vi.fn()
    class Row {
      scrollIntoView = vi.fn()
      querySelector = vi.fn(() => ({ focus, click }))
    }
    const row = new Row()
    const selectedDiveSiteIds = { value: ['existing-site'] }
    const add = await loadHandler('../app/components/DivemasterProfileEditor.vue', 'addDiveSiteRow', {
      selectedDiveSiteIds,
      diveSiteList: { value: { querySelectorAll: () => [row] } },
      revealLastProfileRow,
      HTMLElement: Row,
      nextTick: () => Promise.resolve()
    })
    const adding = add()
    expect(selectedDiveSiteIds.value).toEqual(['existing-site', ''])
    expect(row.scrollIntoView).not.toHaveBeenCalled()
    await adding
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    expect(row.querySelector).toHaveBeenCalledWith('button[aria-haspopup="listbox"]')
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(click).not.toHaveBeenCalled()
  })

  it('finds the latest rendered row after removals and repeated additions', async () => {
    class Row {
      scrollIntoView = vi.fn()
      querySelector = vi.fn(() => null)
    }
    const first = new Row()
    const last = new Row()
    let current = first
    const list = { value: { querySelectorAll: () => [current] } }
    const selectedDiveSiteIds = { value: [] as string[] }
    const add = await loadHandler('../app/components/DivemasterProfileEditor.vue', 'addDiveSiteRow', {
      selectedDiveSiteIds,
      diveSiteList: list,
      revealLastProfileRow,
      HTMLElement: Row,
      nextTick: () => Promise.resolve()
    })
    await add()
    selectedDiveSiteIds.value.pop()
    current = last
    await add()
    expect(first.scrollIntoView).toHaveBeenCalledOnce()
    expect(last.scrollIntoView).toHaveBeenCalledOnce()
    expect(selectedDiveSiteIds.value).toEqual([''])
  })
})

async function createSelection (singleSelect: boolean, modelValue: string[] = []) {
  const focus = vi.fn()
  const blur = vi.fn()
  const emitValue = vi.fn()
  const normalizeLookupId = (value: unknown) => String(value).trim().toLowerCase()
  const props = { singleSelect, modelValue }
  const state = {
    props,
    open: { value: true },
    searchQuery: { value: 'typed search' },
    searchInputRef: { value: { blur } },
    rootRef: { value: { querySelector: vi.fn(() => ({ focus })) } },
    remoteSeq: 0,
    remoteTimer: null,
    remoteLoading: { value: false },
    creating: { value: false },
    newName: { value: '' },
    clearTimeout: vi.fn(),
    normalizeLookupId,
    isSelected: (id: string) => modelValue.some(value => normalizeLookupId(value) === normalizeLookupId(id)),
    emitValue
  }
  const close = await loadHandler('../app/components/ui/SearchMultiSelect.vue', 'close', state)
  const toggleOption = await loadHandler('../app/components/ui/SearchMultiSelect.vue', 'toggleOption', { ...state, close })
  return { ...state, focus, blur, toggleOption }
}

describe('Picker selection dismissal', () => {
  it('closes a single-select picker and restores trigger focus after choosing', async () => {
    const picker = await createSelection(true, ['old-site'])
    picker.toggleOption('new-site')
    expect(picker.emitValue).toHaveBeenCalledWith(['new-site'])
    expect(picker.open.value).toBe(false)
    expect(picker.searchQuery.value).toBe('')
    expect(picker.blur).toHaveBeenCalledOnce()
    expect(picker.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('keeps the selected single value when choosing it again', async () => {
    const picker = await createSelection(true, ['selected-site'])
    picker.toggleOption('selected-site')
    expect(picker.emitValue).toHaveBeenCalledWith(['selected-site'])
    expect(picker.open.value).toBe(false)
  })

  it('keeps multi-select open when adding another choice', async () => {
    const picker = await createSelection(false, ['first-site'])
    picker.toggleOption('second-site')
    expect(picker.emitValue).toHaveBeenCalledWith(['first-site', 'second-site'])
    expect(picker.open.value).toBe(true)
    expect(picker.searchQuery.value).toBe('typed search')
    expect(picker.blur).not.toHaveBeenCalled()
    expect(picker.focus).not.toHaveBeenCalled()
  })

  it('keeps multi-select toggling off a selected choice without closing', async () => {
    const picker = await createSelection(false, ['first-site', 'second-site'])
    picker.toggleOption('first-site')
    expect(picker.emitValue).toHaveBeenCalledWith(['second-site'])
    expect(picker.open.value).toBe(true)
  })
})

describe.each([
  ['owner', '../app/components/DivemasterProfileEditor.vue', 'selectedDiveSiteIds'],
  ['admin', '../app/pages/admin/divemasters/[userId].vue', 'diveSiteIds']
])('%s bottom add controls', (_, path, siteField) => {
  it.each([
    ['addCert', 'certifications', 'certificationList', 'button[aria-haspopup="listbox"]'],
    ['addJob', 'jobs', 'jobList', 'input'],
    ['addDiveSiteRow', siteField, 'diveSiteList', 'button[aria-haspopup="listbox"]']
  ])('%s appends then reveals its new row', async (handler, field, listName, selector) => {
    const existing = field === siteField ? 'existing-site' : { id: 'existing-row' }
    const values = { value: [existing] }
    const list = {}
    const reveal = vi.fn()
    const add = await loadHandler(path, handler, {
      [field]: values,
      [listName]: { value: list },
      nextTick: () => Promise.resolve(),
      revealLastProfileRow: reveal
    })
    const pending = add()
    expect(values.value).toHaveLength(2)
    expect(values.value[0]).toBe(existing)
    expect(reveal).not.toHaveBeenCalled()
    await pending
    expect(reveal).toHaveBeenCalledWith(list, selector)
  })

  it('places specific add actions after the marked rows in each list', () => {
    const { descriptor } = parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
    const elements: ElementNode[] = []
    function visit (node: RootNode | TemplateChildNode) {
      if (node.type === NodeTypes.ELEMENT) elements.push(node)
      if ('children' in node && Array.isArray(node.children)) node.children.forEach(visit)
    }
    visit(parseTemplate(descriptor.template!.content))
    for (const [refName, label] of [
      ['certificationList', 'Add certification'], ['jobList', 'Add job'], ['diveSiteList', 'Add dive site']
    ]) {
      const list = elements.find(node => node.props.some(prop => prop.type === NodeTypes.ATTRIBUTE && prop.name === 'ref' && prop.value?.content === refName))!
      const children = list.children.filter((node): node is ElementNode => node.type === NodeTypes.ELEMENT)
      const rowIndex = children.findIndex(node => node.props.some(prop => prop.type === NodeTypes.ATTRIBUTE && prop.name === 'data-profile-row'))
      expect(rowIndex).toBeGreaterThan(0)
      const footer = children[children.length - 1]
      expect(children.indexOf(footer)).toBeGreaterThan(rowIndex)
      expect(footer.loc.source).toContain(label)
      expect(footer.loc.source).toContain('justify-end')
      expect(children[0].loc.source).not.toContain('<Button')
    }
  })
})

describe('Profile row reveal helper', () => {
  it('targets marked rows rather than the footer and tolerates empty lists', () => {
    const focus = vi.fn()
    const row = { scrollIntoView: vi.fn(), querySelector: vi.fn(() => ({ focus })) }
    const querySelectorAll = vi.fn(() => [row])
    revealLastProfileRow({ querySelectorAll } as unknown as HTMLElement, 'input')
    expect(querySelectorAll).toHaveBeenCalledWith('[data-profile-row]')
    expect(row.scrollIntoView).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(() => revealLastProfileRow(null, 'input')).not.toThrow()
    expect(() => revealLastProfileRow({ querySelectorAll: () => [] } as unknown as HTMLElement, 'input')).not.toThrow()
  })
})