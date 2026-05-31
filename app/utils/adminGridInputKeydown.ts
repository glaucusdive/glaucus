/** Arrow/home/end keys: keep focus in the input unless the cursor is at the text boundary. */
export function shouldKeepArrowInInput (e: KeyboardEvent, input: HTMLInputElement): boolean {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return false

  const { selectionStart, selectionEnd, value } = input
  if (selectionStart == null || selectionEnd == null) return true

  const hasSelection = selectionStart !== selectionEnd

  if (e.key === 'Home' || e.key === 'End') return true

  if (e.key === 'ArrowLeft') {
    if (hasSelection) return true
    return selectionStart > 0
  }

  if (e.key === 'ArrowRight') {
    if (hasSelection) return true
    return selectionEnd < value.length
  }

  return false
}

/** Stop RevoGrid cell navigation when the user is moving the caret inside a text field. */
export function onAdminGridInputKeydown (e: KeyboardEvent) {
  const input = e.target
  if (!(input instanceof HTMLInputElement)) return
  if (!shouldKeepArrowInInput(e, input)) return
  e.stopPropagation()
}
