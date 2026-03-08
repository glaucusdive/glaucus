import { createClient } from '@supabase/supabase-js'

export interface RentalEquipmentOption {
  id: string
  name: string
}

/**
 * Load rental equipment offered by a dive shop (via diveshop_rental_equipment -> rental_equipment).
 * Used to show only this shop's equipment in the booking flow and for multi-select chips.
 */
export async function getRentalEquipmentForShop (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string
): Promise<RentalEquipmentOption[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshop_rental_equipment')
    .select('rental_equipment_id, rental_equipment(id, name)')
    .eq('diveshop_id', shopId)
  if (error || !data) return []
  return (data as { rental_equipment_id: string, rental_equipment: { id: string, name: string } | null }[])
    .filter(row => row.rental_equipment != null && row.rental_equipment.name !== 'None listed' && row.rental_equipment.name !== 'Yes (unspecified gear)')
    .map(row => ({ id: row.rental_equipment!.id, name: row.rental_equipment!.name }))
}
