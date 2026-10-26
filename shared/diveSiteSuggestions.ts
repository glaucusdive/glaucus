export function validateDiveSiteSuggestion (body: { name?: unknown; countryId?: unknown }) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const countryId = typeof body.countryId === 'string' ? body.countryId.trim() : ''
  if (name.length < 3 || name.length > 120) throw new Error('Enter a dive site name between 3 and 120 characters.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(countryId)) {
    throw new Error('Select a valid country.')
  }
  return { name, countryId }
}
