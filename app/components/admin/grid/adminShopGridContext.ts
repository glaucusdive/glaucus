import type { InjectionKey, Ref } from 'vue'

export type ShopGridRow = Record<string, unknown> & {
  uid: string
  id: string | null
  original: Record<string, unknown> | null
  dirty: boolean
  saving: boolean
  saveError: string
  __delete: string
}

export interface AdminShopGridContext {
  writeMode: Ref<boolean>
  deleteRow: (row: ShopGridRow) => void | Promise<void>
  setSingle: (row: ShopGridRow, field: string, value: unknown[]) => void
  createRegion: (name: string) => Promise<{ id: string; label: string }>
  createSimpleLookup: (kind: string, name: string) => Promise<{ id: string; label: string }>
  createDiveSite: (name: string, countryId: string | null) => Promise<{ id: string; label: string }>
  onLookupCreated: (kindKey: string, opt: { id: string; label: string }) => void
  optionsFor: (prop: string) => { id: string; label: string }[]
  copyPortalLink: (row: ShopGridRow) => void | Promise<void>
}

export const ADMIN_SHOP_GRID_KEY: InjectionKey<AdminShopGridContext> = Symbol('adminShopGrid')
