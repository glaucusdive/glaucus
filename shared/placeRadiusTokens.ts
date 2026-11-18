/** Stable chip token: re-run place search without the 50-mile hard radius. */
export const PLACE_RADIUS_EXPAND = 'place_radius:expand'

export function isPlaceRadiusExpandMessage (message: string): boolean {
  const t = String(message || '').trim()
  if (!t) return false
  if (t === PLACE_RADIUS_EXPAND) return true
  return (
    /expand\s+(beyond|outside|past)\s+(the\s+)?50(\s*|-)?miles?\b/i.test(t) ||
    /widen\s+(the\s+)?(search\s+)?(beyond|outside)\s+50(\s*|-)?miles?\b/i.test(t) ||
    /search\s+(beyond|outside)\s+(the\s+)?50(\s*|-)?mile\s+(radius|area)\b/i.test(t)
  )
}

export function placeRadiusExpandSelectableOption (): { label: string; value: string } {
  return {
    label: 'Expand beyond 50 miles',
    value: PLACE_RADIUS_EXPAND
  }
}
