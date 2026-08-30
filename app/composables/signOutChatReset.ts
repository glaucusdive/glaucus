export const SIGN_OUT_CHAT_RESET_EVENT = 'glaucus-chats-sign-out-reset'

let signOutChatResetActive = false

export function isSignOutChatResetActive (): boolean {
  return signOutChatResetActive
}

export function runWithSignOutChatReset (fn: () => void): void {
  signOutChatResetActive = true
  try {
    fn()
  } finally {
    queueMicrotask(() => {
      signOutChatResetActive = false
    })
  }
}

export function dispatchSignOutChatResetEvent (): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SIGN_OUT_CHAT_RESET_EVENT))
}
