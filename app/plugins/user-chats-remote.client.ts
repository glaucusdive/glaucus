import { setChatsRootWrittenHook } from '~/composables/useSearchCache'
import { registerUserChatsRemoteContext, schedulePushUserChats } from '~/composables/userChatsRemote'

/** Registers Supabase debounced push when chats are written locally (signed-in users only; schedulePush no-ops without uid). */
export default defineNuxtPlugin(() => {
  const { client } = useSupabase()
  const { user } = useAuth()

  registerUserChatsRemoteContext({
    getUserId: () => user.value?.id ?? null,
    getClient: () => client
  })

  setChatsRootWrittenHook((root) => schedulePushUserChats(root))
})
