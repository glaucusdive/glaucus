export const DIVEMASTER_DIRECTORY_PAGE_SIZE = 24

export interface DirectoryDivemaster {
  username: string
  display_name: string | null
  headline: string | null
  location: string | null
  avatar_url: string | null
}

export interface DivemasterDirectoryResponse {
  profiles: DirectoryDivemaster[]
  page: number
  pageSize: number
  total: number
}

export function parseDivemasterDirectoryPage (value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1
  return Math.min(parsed, 100_000)
}

export function normalizeDivemasterDirectorySearch (value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 100)
}

export function publicDivemasterDirectoryResponse (value: unknown, page: number): DivemasterDirectoryResponse {
  const data = value as { profiles?: unknown; total?: unknown } | null
  if (!data || !Array.isArray(data.profiles) || !Number.isSafeInteger(data.total) || Number(data.total) < 0) {
    throw new Error('Invalid directory response')
  }
  const text = (field: unknown) => typeof field === 'string' && field.trim() ? field.trim() : null
  const profiles = data.profiles.slice(0, DIVEMASTER_DIRECTORY_PAGE_SIZE).flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return []
    const row = entry as Record<string, unknown>
    const username = text(row.username)
    if (!username || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username)) return []
    return [{
      username,
      display_name: text(row.display_name),
      headline: text(row.headline),
      location: text(row.location),
      avatar_url: text(row.avatar_url)
    }]
  })
  return { profiles, total: Number(data.total), page, pageSize: DIVEMASTER_DIRECTORY_PAGE_SIZE }
}