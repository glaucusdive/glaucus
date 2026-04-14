/**
 * After the model emits FILTERS then MESSAGE:, only the MESSAGE body should reach the user while streaming.
 */
export function extractVisibleMessageSuffixAfterMessageTag (fullBuffer: string): string {
  const match = fullBuffer.match(/\bMESSAGE:\s*(.*)/s)
  if (!match) return ''
  return match[1] ?? ''
}

/** Delta to append to the UI since last emit (UTF-16 safe slice matches JS string indexing). */
export function visibleSuffixDelta (prevVisible: string, newVisible: string): string {
  if (newVisible.length <= prevVisible.length) return ''
  return newVisible.slice(prevVisible.length)
}
