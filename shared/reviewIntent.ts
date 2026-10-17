import { parseShopReviewRequest } from './shopReviewIntent'

export type ReviewTargetKind = 'shop' | 'divemaster'

export type ReviewIntentPending =
  | { stage: 'target-type' }
  | { stage: 'target-name'; targetKind: ReviewTargetKind }

export interface ReviewRequest {
  targetKind: ReviewTargetKind | null
  targetQuery: string | null
  pending?: ReviewIntentPending
  cancelled?: boolean
}

const CANCEL_PATTERN = /^(?:cancel|stop|never mind|nevermind|no thanks)[.!?]*$/i

function cleanPhrase (value: string): string {
  return value
    .trim()
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
    .replace(/[.!?]+$/g, '')
    .trim()
}

function reviewKindFromPhrase (value: string): { kind: ReviewTargetKind | null; query: string | null; ambiguous: boolean } {
  const phrase = cleanPhrase(value).replace(/^(?:a|an|the)\s+/i, '')
  const mentionsShop = /\b(?:dive\s+)?shops?\b|\bbusiness(?:es)?\b/i.test(phrase)
  const mentionsDivemaster = /\b(?:dive\s*masters?|divemasters?|dive\s+pros?|instructors?)\b/i.test(phrase)
  if (mentionsShop && mentionsDivemaster) return { kind: null, query: null, ambiguous: true }

  const typePrefix = /^(?:(?:dive\s*)?masters?|divemasters?|instructors?|dive\s+pros?|(?:dive\s+)?shops?|business(?:es)?)\b\s*/i
  if (mentionsDivemaster && /^(?:(?:dive\s*)?masters?|divemasters?|instructors?|dive\s+pros?)\b/i.test(phrase)) {
    const query = phrase.replace(typePrefix, '').replace(/^(?:named|called|for|of)\s+/i, '').trim()
    return { kind: 'divemaster', query: query || null, ambiguous: false }
  }
  if (mentionsShop && /^(?:(?:dive\s+)?shops?|business(?:es)?)\b/i.test(phrase)) {
    const query = phrase.replace(typePrefix, '').replace(/^(?:named|called|for|of)\s+/i, '').trim()
    return { kind: 'shop', query: query || null, ambiguous: false }
  }
  return { kind: null, query: cleanPhrase(value) || null, ambiguous: false }
}

function normalizePending (pending: unknown): ReviewIntentPending | null {
  if (pending === true) return { stage: 'target-name', targetKind: 'shop' }
  if (!pending || typeof pending !== 'object') return null
  const value = pending as Record<string, unknown>
  if (value.stage === 'target-type') return { stage: 'target-type' }
  if (value.stage === 'target-name' && (value.targetKind === 'shop' || value.targetKind === 'divemaster')) {
    return { stage: 'target-name', targetKind: value.targetKind }
  }
  return null
}

export function parseReviewRequest (message: string, pendingValue?: unknown): ReviewRequest | null {
  const text = message.trim()
  const pending = normalizePending(pendingValue)

  if (pending) {
    if (CANCEL_PATTERN.test(text)) return { targetKind: null, targetQuery: null, cancelled: true }
    if (pending.stage === 'target-type') {
      const identified = reviewKindFromPhrase(text)
      if (!identified.kind) return { targetKind: null, targetQuery: null, pending }
      if (!identified.query) {
        return {
          targetKind: identified.kind,
          targetQuery: null,
          pending: { stage: 'target-name', targetKind: identified.kind }
        }
      }
      return { targetKind: identified.kind, targetQuery: identified.query }
    }

    const identified = reviewKindFromPhrase(text)
    if (identified.kind && !identified.query) {
      return {
        targetKind: identified.kind,
        targetQuery: null,
        pending: { stage: 'target-name', targetKind: identified.kind }
      }
    }
    return {
      targetKind: identified.kind || pending.targetKind,
      targetQuery: identified.kind ? identified.query : cleanPhrase(text) || null,
      ...(identified.ambiguous ? { pending: { stage: 'target-type' as const } } : {})
    }
  }

  const parsed = parseShopReviewRequest(text)
  if (!parsed) return null
  if (parsed.cancelled) return { targetKind: null, targetQuery: null, cancelled: true }
  if (!parsed.shopQuery) {
    return { targetKind: null, targetQuery: null, pending: { stage: 'target-type' } }
  }

  const identified = reviewKindFromPhrase(parsed.shopQuery)
  if (identified.ambiguous) {
    return { targetKind: null, targetQuery: null, pending: { stage: 'target-type' } }
  }
  if (identified.kind && !identified.query) {
    return {
      targetKind: identified.kind,
      targetQuery: null,
      pending: { stage: 'target-name', targetKind: identified.kind }
    }
  }
  return {
    targetKind: identified.kind || 'shop',
    targetQuery: identified.kind ? identified.query : parsed.shopQuery
  }
}