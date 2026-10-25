import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import { describe, expect, it, vi } from 'vitest'

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
      diveSiteList: { value: { lastElementChild: row } },
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
    const list = { value: { lastElementChild: first } }
    const selectedDiveSiteIds = { value: [] as string[] }
    const add = await loadHandler('../app/components/DivemasterProfileEditor.vue', 'addDiveSiteRow', {
      selectedDiveSiteIds,
      diveSiteList: list,
      HTMLElement: Row,
      nextTick: () => Promise.resolve()
    })
    await add()
    selectedDiveSiteIds.value.pop()
    list.value.lastElementChild = last
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