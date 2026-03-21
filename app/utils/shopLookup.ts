/** True if the string looks like a diveshop UUID (so we query by id, not slug). */
export function isDiveshopUuid (s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s).trim())
}
