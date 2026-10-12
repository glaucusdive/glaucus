export interface ShopReviewRequest {
  shopQuery: string | null
  cancelled?: boolean
}

const REVIEW_REQUEST_PATTERNS: RegExp[] = [
  /^(?:can|could|would)\s+you\s+(?:please\s+)?(?:help\s+me\s+)?(?:leave|write|post|submit)\s+(?:a\s+)?review(?:\s+(?:for|of|about|on)\s+(.+))?[.!?]*$/i,
  /^(?:can|could|would)\s+you\s+(?:please\s+)?(?:help\s+me\s+)?review\s+(.+?)[.!?]*$/i,
  /^(?:can|could)\s+i\s+(?:please\s+)?(?:leave|write|post|submit)\s+(?:a\s+)?review(?:\s+(?:for|of|about|on)\s+(.+))?[.!?]*$/i,
  /^(?:(?:i\s+)?want\s+to|i(?:'d|\s+would)\s+like\s+to)\s+(?:leave|write|post|submit)\s+(?:a\s+)?review(?:\s+(?:for|of|about|on)\s+(.+))?[.!?]*$/i,
  /^(?:(?:i\s+)?want\s+to|i(?:'d|\s+would)\s+like\s+to|can\s+i|could\s+i)\s+review(?:\s+(?:for|of|about|on)\s+)?(.+?)[.!?]*$/i,
  /^(?:please\s+)?(?:leave|write|post|submit)\s+(?:a\s+)?review(?:\s+(?:for|of|about|on)\s+(.+))?[.!?]*$/i
]

function cleanShopQuery (query: string | undefined): string | null {
  const cleaned = (query || '')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/[.!?]+$/g, '')
    .replace(/^the\s+/i, '')
    .trim()
  return cleaned || null
}

export function parseShopReviewRequest (
  message: string,
  pendingShopReview = false
): ShopReviewRequest | null {
  const text = message.trim()
  if (pendingShopReview) {
    if (/^(?:cancel|stop|never mind|nevermind|no thanks)[.!?]*$/i.test(text)) {
      return { shopQuery: null, cancelled: true }
    }
    return { shopQuery: cleanShopQuery(text) }
  }

  for (const pattern of REVIEW_REQUEST_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { shopQuery: cleanShopQuery(match[1] ?? match[2]) }
    }
  }
  return null
}