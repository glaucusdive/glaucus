/** In-page marketing targets. Signed-in `/#these` stay on the landing page until chat is requested. */
export const LANDING_SECTION_IDS = ['hero', 'whatisglaucus', 'feature1', 'aboutus', 'logs'] as const

export function isLandingSectionHash (hash: string | null | undefined): boolean {
  const id = (hash || '').replace(/^#/, '')
  return (LANDING_SECTION_IDS as readonly string[]).includes(id)
}

export function queryChatIsOpen (chat: unknown): boolean {
  if (chat === '1') return true
  return Array.isArray(chat) && chat.includes('1')
}

/**
 * Chat shell vs marketing homepage.
 * `?chat=1` wins over a section hash. Signed-in `/` opens chat only after the client has mounted,
 * so the marketing HTML can hydrate first.
 */
export function shouldShowChatShell (input: {
  authResolved: boolean
  isSignedIn: boolean
  clientReady: boolean
  forceChat: boolean
  path: string
  hash?: string | null
  queryChat?: unknown
}): boolean {
  if (!input.authResolved) return false
  if (input.forceChat) return true
  if (queryChatIsOpen(input.queryChat)) return true
  if (
    input.clientReady
    && input.isSignedIn
    && input.path === '/'
    && !isLandingSectionHash(input.hash)
  ) {
    return true
  }
  return false
}
