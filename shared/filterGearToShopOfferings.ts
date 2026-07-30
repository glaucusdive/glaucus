export type GearLike = { gearType?: string; gear_type?: string }

export function shopRentalEquipmentNameList (
  equipment: Array<{ name?: string } | string> | undefined | null
): string[] {
  if (!equipment?.length) return []
  return equipment
    .map((e) => (typeof e === 'string' ? e : e.name ?? '').toString().trim())
    .filter(Boolean)
}

/** Profile / payload gear names limited to what this shop lists for rent. */
export function filterGearNamesToShopOfferings (
  gearNames: string[],
  shopEquipmentNames: string[]
): string[] {
  if (!gearNames.length) return []
  const allowed = new Set(shopRentalEquipmentNameList(shopEquipmentNames).map((n) => n.toLowerCase()))
  if (allowed.size === 0) return []
  return gearNames.filter((n) => allowed.has(String(n).trim().toLowerCase()))
}

export function filterGearToShopOfferings<T extends GearLike> (
  gear: T[] | undefined | null,
  shopEquipmentNames: string[]
): { gearType: string }[] {
  const names = (gear ?? [])
    .map((g) => (g.gearType ?? g.gear_type ?? '').toString().trim())
    .filter(Boolean)
  return filterGearNamesToShopOfferings(names, shopEquipmentNames).map((gearType) => ({ gearType }))
}

export function sanitizeBookingPayloadGearForShop<T extends { divers?: Array<{ gear?: GearLike[] }> }> (
  payload: T,
  shopEquipmentNames: string[]
): T {
  const p = JSON.parse(JSON.stringify(payload)) as T
  if (!p.divers?.length) return p
  for (const d of p.divers) {
    if (!d.gear?.length) continue
    d.gear = filterGearToShopOfferings(d.gear, shopEquipmentNames)
  }
  return p
}
