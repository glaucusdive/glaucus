type PickerViewport = { top: number; left: number; width: number; height: number }
type PickerAnchor = { top: number; bottom: number; left: number; width: number }

export function searchPickerPosition (
  anchor: PickerAnchor,
  viewport: PickerViewport,
  wrapChips: boolean,
  measuredHeight = 320
) {
  const margin = 8
  const gap = 4
  const availableWidth = Math.max(0, viewport.width - margin * 2)
  const width = Math.min(wrapChips ? Math.max(anchor.width, 280) : 320, availableWidth)
  const left = Math.max(viewport.left + margin, Math.min(anchor.left, viewport.left + viewport.width - width - margin))
  const viewportTop = viewport.top + margin
  const viewportBottom = viewport.top + viewport.height - margin
  const maxPanelHeight = Math.max(0, Math.min(320, viewport.height * 0.5, viewportBottom - viewportTop))
  const height = Math.min(Math.max(0, measuredHeight), maxPanelHeight)
  const spaceBelow = viewportBottom - anchor.bottom
  const spaceAbove = anchor.top - viewportTop
  const openAbove = (spaceBelow < height || spaceBelow < 160) && spaceAbove > spaceBelow
  const availableHeight = Math.max(0, (openAbove ? spaceAbove : spaceBelow) - gap)
  const maxHeight = Math.min(maxPanelHeight, availableHeight)
  const preferredTop = openAbove ? anchor.top - gap - maxHeight : anchor.bottom + gap
  const top = Math.max(viewportTop, Math.min(preferredTop, viewportBottom - maxHeight))

  return {
    top: `${top}px`,
    bottom: 'auto',
    left: `${left}px`,
    width: `${width}px`,
    minWidth: '0px',
    maxHeight: `${maxHeight}px`
  }
}