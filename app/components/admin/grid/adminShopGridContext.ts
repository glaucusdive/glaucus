import type { InjectionKey, Ref } from 'vue'

export type ShopGridRow = Record<string, unknown> & {
  uid: string
  id: string | null
  original: Record<string, unknown> | null
  dirty: boolean
  saving: boolean
  saveError: string
  __actions: string
}

export interface AdminShopGridContext {
  writeMode: Ref<boolean>
  editRow: (row: ShopGridRow) => void
  duplicateRow: (row: ShopGridRow) => void
  deleteRow: (row: ShopGridRow) => void | Promise<void>
  setSingle: (row: ShopGridRow, field: string, value: unknown[]) => void
  createRegion: (name: string) => Promise<{ id: string; label: string }>
  createSimpleLookup: (kind: string, name: string) => Promise<{ id: string; label: string }>
  createDiveSite: (name: string, countryId: string | null) => Promise<{ id: string; label: string }>
  onLookupCreated: (kindKey: string, opt: { id: string; label: string }) => void
  optionsFor: (prop: string) => { id: string; label: string }[]
  copyPortalLink: (row: ShopGridRow) => void | Promise<void>
  prefetchPortalLink: (row: ShopGridRow) => void | Promise<void>
}

export const ADMIN_SHOP_GRID_KEY: InjectionKey<AdminShopGridContext> = Symbol('adminShopGrid')

/** Saved shop UUID from a grid row (RevoGrid cells may not always surface `id` on `model`). */
export function resolveSavedShopId (row: ShopGridRow | Record<string, unknown> | null | undefined): string | null {
  if (!row) return null
  const candidates = [
    row.id,
    (row.original as { id?: unknown } | null)?.id,
    row.uid
  ]
  for (const candidate of candidates) {
    if (candidate == null) continue
    const s = String(candidate).trim()
    if (!s || s.startsWith('new-')) continue
    return s
  }
  return null
}
