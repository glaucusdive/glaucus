export interface DivemasterReviewInput {
  rating: number
  body: string
}

export interface DivemasterReviewRow {
  id: string
  rating: number
  body: string
  author_display_name: string | null
  created_at: string
  updated_at: string
}

export function parseDivemasterReviewInput (value: unknown): DivemasterReviewInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const body = typeof input.body === 'string' ? input.body.trim() : ''
  if (!Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5) return null
  if (!body || body.length > 5000) return null
  return { rating: Number(input.rating), body }
}