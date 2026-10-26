export function revealLastProfileRow (list: HTMLElement | null, focusSelector: string) {
  const rows = list?.querySelectorAll<HTMLElement>('[data-profile-row]')
  const row = rows?.[rows.length - 1]
  if (!row) return
  row.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
  row.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true })
}