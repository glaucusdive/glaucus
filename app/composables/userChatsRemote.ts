import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  readChatsRoot,
  writeChatsRoot,
  ensureChatsRoot,
  normalizeRoot,
  clearAllChatsStorage,
  type ChatsRoot
} from '~/composables/useSearchCache'

export const chatRemoteHydrateTick = ref(0)

export function requestChatRemoteHydrate () {
  chatRemoteHydrateTick.value++
}

function rootHasMessages (root: ChatsRoot | null | undefined): boolean {
  if (!root?.sessions?.length) return false
  return root.sessions.some(s => Array.isArray(s.messages) && s.messages.length > 0)
}

function parseRemoteRoot (raw: unknown): ChatsRoot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1 || typeof o.activeSessionId !== 'string' || !Array.isArray(o.sessions)) return null
  return o as unknown as ChatsRoot
}

let pushDebounce: ReturnType<typeof setTimeout> | null = null
let getUserId: (() => string | null) | null = null
let getClient: (() => SupabaseClient | null) | null = null

export function registerUserChatsRemoteContext (ctx: {
  getUserId: () => string | null
  getClient: () => SupabaseClient | null
}) {
  getUserId = ctx.getUserId
  getClient = ctx.getClient
}

export function cancelPendingUserChatsPush () {
  if (pushDebounce) {
    clearTimeout(pushDebounce)
    pushDebounce = null
  }
}

export function schedulePushUserChats (root: ChatsRoot) {
  if (!import.meta.client) return
  const uid = getUserId?.() ?? null
  if (!uid) return
  clearTimeout(pushDebounce)
  pushDebounce = setTimeout(() => {
    pushDebounce = null
    const uidNow = getUserId?.() ?? null
    if (!uidNow || uidNow !== uid) return
    void flushPushUserChats(uidNow, root)
  }, 800)
}

export async function flushPushUserChats (userId: string, root: ChatsRoot) {
  const client = getClient?.()
  if (!client) return
  const normalized = normalizeRoot(root)
  try {
    const { error } = await client.from('user_chats').upsert(
      {
        user_id: userId,
        root: normalized,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    if (error) console.warn('[user_chats] upsert failed', error)
  } catch (e) {
    console.warn('[user_chats] upsert', e)
  }
}

/**
 * Signed-in: prefer server when it has any messages; else promote local sessionStorage to server;
 * else empty shell. Guests should not call this (use ensureChatsRoot only).
 */
export async function initSignedInChatsFromRemote (client: SupabaseClient, userId: string) {
  if (!import.meta.client || !userId) return

  const { data, error } = await client.from('user_chats').select('root').eq('user_id', userId).maybeSingle()
  if (error) console.warn('[user_chats] select failed', error)

  const remote = parseRemoteRoot(data?.root)
  const localRaw = readChatsRoot()

  if (rootHasMessages(remote)) {
    writeChatsRoot(normalizeRoot(remote!), { skipRemote: true })
    return
  }

  if (rootHasMessages(localRaw)) {
    const normalized = normalizeRoot(localRaw!)
    writeChatsRoot(normalized, { skipRemote: true })
    await flushPushUserChats(userId, normalized)
    return
  }

  ensureChatsRoot()
}

export async function onSignedInSyncChats (client: SupabaseClient, userId: string) {
  await initSignedInChatsFromRemote(client, userId)
  requestChatRemoteHydrate()
}

export function clearLocalChatsAfterSignOut () {
  cancelPendingUserChatsPush()
  clearAllChatsStorage()
  ensureChatsRoot()
  requestChatRemoteHydrate()
}
