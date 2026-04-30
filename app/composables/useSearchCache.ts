import { deriveChatTitle } from '~/utils/chatTitle'

export interface SearchCacheState {
  messages: any[]
  userInput: string
  lastQuery: string | null
  timestamp: number
  selectedShopId?: string | null
  /** Shop detail bottom drawer (chat). Legacy key: mobileDetailShopId. */
  detailDrawerShopId?: string | null
  mobileDetailShopId?: string | null
  drawerOpen?: boolean
  drawerShopId?: string | null
  drawerShopName?: string | null
}

export interface ChatSessionRecord extends SearchCacheState {
  id: string
  title: string
  updatedAt: number
}

export interface ChatsRoot {
  version: 1
  activeSessionId: string
  sessions: ChatSessionRecord[]
}

const LEGACY_KEY = 'glaucus-ai-search-cache'
const STORE_KEY = 'glaucus-chats-v1'

function newId (): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptySession (): ChatSessionRecord {
  const now = Date.now()
  return {
    id: newId(),
    title: 'Chat',
    updatedAt: now,
    messages: [],
    userInput: '',
    lastQuery: null,
    timestamp: now,
    selectedShopId: null,
    detailDrawerShopId: null,
    mobileDetailShopId: null,
    drawerOpen: false,
    drawerShopId: null,
    drawerShopName: null
  }
}

function isChatsRoot (x: unknown): x is ChatsRoot {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.version === 1 && typeof o.activeSessionId === 'string' && Array.isArray(o.sessions)
}

export function readChatsRoot (): ChatsRoot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isChatsRoot(parsed)) return null
    return parsed
  } catch (e) {
    console.warn('[SearchCache] Failed to read chats root', e)
    return null
  }
}

/** Optional hook (registered from plugin) to sync to Supabase after local write. */
let onChatsRootWritten: ((root: ChatsRoot) => void) | null = null

export function setChatsRootWrittenHook (cb: ((root: ChatsRoot) => void) | null) {
  onChatsRootWritten = cb
}

export function writeChatsRoot (root: ChatsRoot, options?: { skipRemote?: boolean }) {
  if (typeof window === 'undefined') return
  const next = normalizeRoot(root)
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('[SearchCache] Failed to write chats root', e)
  }
  if (!options?.skipRemote) {
    onChatsRootWritten?.(next)
  }
}

function readLegacySingle (): SearchCacheState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SearchCacheState
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function removeLegacy () {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(LEGACY_KEY)
  } catch { /* ignore */ }
}

/** Migrate legacy single-blob cache into v1 multi-session store. */
export function ensureChatsRoot (): ChatsRoot {
  if (typeof window === 'undefined') {
    const s = emptySession()
    return { version: 1, activeSessionId: s.id, sessions: [s] }
  }

  const existing = readChatsRoot()
  if (existing && existing.sessions.length > 0) {
    return normalizeRoot(existing)
  }

  const legacy = readLegacySingle()
  if (legacy && Array.isArray(legacy.messages)) {
    const now = Date.now()
    const id = newId()
    const title = deriveChatTitle(legacy.messages || [], { selectedShopId: legacy.selectedShopId ?? null })
    const session: ChatSessionRecord = {
      id,
      title,
      updatedAt: legacy.timestamp || now,
      messages: legacy.messages ?? [],
      userInput: legacy.userInput ?? '',
      lastQuery: legacy.lastQuery ?? null,
      timestamp: legacy.timestamp || now,
      selectedShopId: legacy.selectedShopId ?? null,
      detailDrawerShopId: (legacy as SearchCacheState).detailDrawerShopId ?? legacy.mobileDetailShopId ?? null,
      mobileDetailShopId: legacy.mobileDetailShopId ?? null,
      drawerOpen: legacy.drawerOpen ?? false,
      drawerShopId: legacy.drawerShopId ?? null,
      drawerShopName: legacy.drawerShopName ?? null
    }
    const root: ChatsRoot = { version: 1, activeSessionId: id, sessions: [session] }
    writeChatsRoot(root)
    removeLegacy()
    return root
  }

  const s = emptySession()
  const root: ChatsRoot = { version: 1, activeSessionId: s.id, sessions: [s] }
  writeChatsRoot(root)
  removeLegacy()
  return root
}

/** Ensure activeSessionId points at a session; fix corrupt roots. */
export function normalizeRoot (root: ChatsRoot): ChatsRoot {
  let sessions = root.sessions.filter(s => s && typeof s.id === 'string')
  if (sessions.length === 0) {
    const s = emptySession()
    return { version: 1, activeSessionId: s.id, sessions: [s] }
  }
  if (!sessions.some(s => s.id === root.activeSessionId)) {
    return { version: 1, activeSessionId: sessions[0].id, sessions }
  }
  return { version: 1, activeSessionId: root.activeSessionId, sessions }
}

export function getActiveSession (root: ChatsRoot): ChatSessionRecord | null {
  return root.sessions.find(s => s.id === root.activeSessionId) ?? null
}

export function payloadToSessionFields (state: Omit<SearchCacheState, 'timestamp'>): Omit<ChatSessionRecord, 'id' | 'title' | 'updatedAt'> {
  const detailId = state.detailDrawerShopId ?? state.mobileDetailShopId ?? null
  return {
    messages: state.messages ?? [],
    userInput: state.userInput ?? '',
    lastQuery: state.lastQuery ?? null,
    timestamp: Date.now(),
    selectedShopId: state.selectedShopId ?? null,
    detailDrawerShopId: detailId,
    mobileDetailShopId: detailId,
    drawerOpen: state.drawerOpen ?? false,
    drawerShopId: state.drawerShopId ?? null,
    drawerShopName: state.drawerShopName ?? null
  }
}

/** Merge page state into the active session and persist. */
export function persistActiveChatsRoot (
  root: ChatsRoot,
  state: Omit<SearchCacheState, 'timestamp'>
): ChatsRoot {
  const now = Date.now()
  const messages = state.messages ?? []
  const title = deriveChatTitle(messages, { selectedShopId: state.selectedShopId ?? null })
  const fields = payloadToSessionFields(state)
  const sessions = root.sessions.map((s) => {
    if (s.id !== root.activeSessionId) return s
    return {
      ...s,
      ...fields,
      title,
      updatedAt: now,
      timestamp: now
    }
  })
  const next: ChatsRoot = { version: 1, activeSessionId: root.activeSessionId, sessions }
  writeChatsRoot(next)
  return next
}

/**
 * Archive current active (must have messages), start new empty session. Max 3 sessions total.
 */
export function archiveActiveAndStartNewChatsRoot (root: ChatsRoot, state: Omit<SearchCacheState, 'timestamp'>): ChatsRoot {
  const messages = state.messages ?? []
  if (messages.length === 0) {
    const active = getActiveSession(root)
    if (!active) {
      const s = emptySession()
      const next = { version: 1 as const, activeSessionId: s.id, sessions: [s] }
      writeChatsRoot(next)
      return next
    }
    const cleared: ChatSessionRecord = {
      ...active,
      messages: [],
      userInput: '',
      lastQuery: null,
      title: 'Chat',
      updatedAt: Date.now(),
      timestamp: Date.now(),
      selectedShopId: null,
      detailDrawerShopId: null,
      mobileDetailShopId: null,
      drawerOpen: false,
      drawerShopId: null,
      drawerShopName: null
    }
    const sessions = root.sessions.map(s => (s.id === active.id ? cleared : s))
    const next = { version: 1 as const, activeSessionId: active.id, sessions }
    writeChatsRoot(next)
    return next
  }

  const now = Date.now()
  const title = deriveChatTitle(messages, { selectedShopId: state.selectedShopId ?? null })
  const fields = payloadToSessionFields(state)
  const oldActiveId = root.activeSessionId
  const prev = getActiveSession(root) ?? { ...emptySession(), id: oldActiveId }
  const saved: ChatSessionRecord = {
    ...prev,
    ...fields,
    id: oldActiveId,
    title,
    updatedAt: now,
    timestamp: now
  }
  const newSess = emptySession()
  const rest = root.sessions.filter(s => s.id !== oldActiveId)
  const sessions = [newSess, saved, ...rest].slice(0, 3)
  const next: ChatsRoot = { version: 1, activeSessionId: newSess.id, sessions }
  writeChatsRoot(next)
  return next
}

export function setActiveSessionIdChatsRoot (root: ChatsRoot, sessionId: string): ChatsRoot | null {
  if (!root.sessions.some(s => s.id === sessionId)) return null
  const next = { version: 1 as const, activeSessionId: sessionId, sessions: root.sessions }
  writeChatsRoot(next)
  return next
}

/** Active session as legacy flat shape for useSaveDraftFromCache. */
export function activeToSearchCacheState (root: ChatsRoot): SearchCacheState | null {
  const s = getActiveSession(root)
  if (!s) return null
  return {
    messages: s.messages,
    userInput: s.userInput,
    lastQuery: s.lastQuery,
    timestamp: s.timestamp,
    selectedShopId: s.selectedShopId,
    detailDrawerShopId: s.detailDrawerShopId ?? s.mobileDetailShopId ?? null,
    mobileDetailShopId: s.mobileDetailShopId ?? s.detailDrawerShopId ?? null,
    drawerOpen: s.drawerOpen,
    drawerShopId: s.drawerShopId,
    drawerShopName: s.drawerShopName
  }
}

export function clearAllChatsStorage () {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORE_KEY)
    window.sessionStorage.removeItem(LEGACY_KEY)
  } catch { /* ignore */ }
}

export const useSearchCache = () => {
  const getCache = (): SearchCacheState | null => {
    const root = readChatsRoot()
    if (!root) return null
    return activeToSearchCacheState(root)
  }

  const setCache = (state: Omit<SearchCacheState, 'timestamp'>) => {
    let root = readChatsRoot() ?? ensureChatsRoot()
    root = normalizeRoot(root)
    persistActiveChatsRoot(root, state)
  }

  const clearCache = () => {
    clearAllChatsStorage()
  }

  return {
    getCache,
    setCache,
    clearCache
  }
}
