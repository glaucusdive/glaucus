export const ENTITY_CLARIFY_PREFIX = 'entity_clarify:'

export type EntityClarifyKind = 'dive_shop' | 'dive_site' | 'city' | 'country' | 'browse'

export function parseEntityClarifyMessage (message: string): EntityClarifyKind | null {
  const t = message.trim()
  if (!t.startsWith(ENTITY_CLARIFY_PREFIX)) return null
  const k = t.slice(ENTITY_CLARIFY_PREFIX.length).trim()
  if (k === 'dive_shop' || k === 'dive_site' || k === 'city' || k === 'country' || k === 'browse') {
    return k
  }
  return null
}

export function entityClarifySelectableOptions (): { label: string, value: string }[] {
  return [
    { label: "It's a dive shop", value: `${ENTITY_CLARIFY_PREFIX}dive_shop` },
    { label: 'Dive site', value: `${ENTITY_CLARIFY_PREFIX}dive_site` },
    { label: 'City or area', value: `${ENTITY_CLARIFY_PREFIX}city` },
    { label: 'Country', value: `${ENTITY_CLARIFY_PREFIX}country` },
    { label: 'Not sure — help me find options', value: `${ENTITY_CLARIFY_PREFIX}browse` }
  ]
}
