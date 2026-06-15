import { describe, expect, it } from 'vitest'
import { parseScubaMasterShopCsv } from '../../shared/parseScubaMasterShopCsv'
import { resolveCsvShopRowToForm } from '../../shared/resolveCsvShopRowToForm'

const AQUATECH_CSV = `Dive Shop,Address,Website,City,State,Country,Region,Phone Number,Email,Dive Courses,Rental Gear,Gases,Type,Dive Sites,Helper,Notes
Aquatech Divers,"Calle 2 bis y 50",https://www.aquatechdivers.com,Playa del Carmen,Quintana Roo,Mexico,North America,+52 984 100 5941,aquatechdivers@gmail.com,"Open Water Diver, Advanced Adventurer, Rescue Diver, Enriched Air Nitrox, Deep Diver",,,Dive Shop / Day Trip,"Cozumel, Playa del Carmen, Shark Dive",,`

const LOOKUPS = {
  countries: [{ id: 'mx', name: 'Mexico' }],
  regions: [{ id: 'na', name: 'North America' }],
  courses: [
    { id: 'c1', certification_name: 'Open Water Diver', agency_name: 'PADI' },
    { id: 'c2', certification_name: 'Open Water Diver', agency_name: 'SSI' },
    { id: 'c3', certification_name: 'Advanced Adventurer', agency_name: 'SSI' },
    { id: 'c4', certification_name: 'Rescue Diver', agency_name: 'PADI' },
    { id: 'c5', certification_name: 'Enriched Air Nitrox', agency_name: 'PADI' },
    { id: 'c6', certification_name: 'Deep Diver', agency_name: 'PADI' }
  ],
  rentalEquipment: [],
  gases: [],
  diveSites: [
    { id: 's1', name: 'Cozumel', country_id: 'mx' },
    { id: 's2', name: 'Playa del Carmen', country_id: 'mx' }
  ],
  diveBusinessTypes: [
    { id: 't1', name: 'Dive Shop' },
    { id: 't2', name: 'Dive Resort' },
    { id: 't3', name: 'Liveaboard' }
  ]
}

describe('resolveCsvShopRowToForm', () => {
  it('resolves Aquatech row to Mexico form with PADI course preference', () => {
    const [row] = parseScubaMasterShopCsv(AQUATECH_CSV)
    const { form, warnings } = resolveCsvShopRowToForm(row, LOOKUPS)
    expect(form.business_name).toBe('Aquatech Divers')
    expect(form.country_id).toBe('mx')
    expect(form.region_id).toBe('na')
    expect(form.business_type_ids).toEqual(['t1'])
    expect(form.course_ids).toContain('c1')
    expect(form.course_ids).not.toContain('c2')
    expect(form.dive_site_ids).toEqual(['s1', 's2'])
    expect(warnings.some((w) => w.includes('Shark Dive'))).toBe(true)
  })

  it('maps Dive Shop / Day Trip to Dive Shop type', () => {
    const [row] = parseScubaMasterShopCsv(AQUATECH_CSV)
    const { form } = resolveCsvShopRowToForm(row, LOOKUPS)
    expect(form.business_type_ids).toEqual(['t1'])
  })
})
