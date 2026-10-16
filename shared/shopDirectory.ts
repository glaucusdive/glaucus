export const SHOP_DIRECTORY_PAGE_SIZE = 24
const MAX_SHOP_DIRECTORY_PAGE = 100_000
const MAX_SHOP_DIRECTORY_SEARCH_LENGTH = 100

export function parseShopDirectoryPage (value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1
  return Math.min(parsed, MAX_SHOP_DIRECTORY_PAGE)
}

export function normalizeShopDirectorySearch (value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_SHOP_DIRECTORY_SEARCH_LENGTH)
}

export function shopDirectorySearchFilter (search: string): string | null {
  const safe = search
    .trim()
    .replace(/[%_\\]/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!safe) return null
  const pattern = `%${safe}%`
  return [
    `business_name.ilike.${pattern}`,
    `city.ilike.${pattern}`,
    `state.ilike.${pattern}`,
    `street_address.ilike.${pattern}`
  ].join(',')
}

export function shopDirectoryRange (page: number, pageSize = SHOP_DIRECTORY_PAGE_SIZE): [number, number] {
  const start = (parseShopDirectoryPage(page) - 1) * pageSize
  return [start, start + pageSize - 1]
}