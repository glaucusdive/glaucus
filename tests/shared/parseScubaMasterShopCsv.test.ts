import { describe, expect, it } from 'vitest'
import { parseScubaMasterShopCsv, parseCSVLine } from '../../shared/parseScubaMasterShopCsv'

const AQUATECH_CSV = `Dive Shop,Address,Website,City,State,Country,Region,Phone Number,Email,Dive Courses,Rental Gear,Gases,Type,Dive Sites,Helper,Notes
Aquatech Divers,"Calle 2 bis y 50, entre Avenida 45 Norte, Centro, 77710 Playa del Carmen, Q.R., Mexico",https://www.aquatechdivers.com,Playa del Carmen,Quintana Roo,Mexico,North America,+52 (984) 100 5941, aquatechdivers@gmail.com ,"Open Water Diver, Advanced Adventurer, Rescue Diver, Enriched Air Nitrox, Deep Diver",,,Dive Shop / Day Trip,"Cozumel, Playa del Carmen, Shark Dive",,`

describe('parseCSVLine', () => {
  it('handles quoted commas', () => {
    const parts = parseCSVLine('"Hello, World",foo')
    expect(parts).toEqual(['Hello, World', 'foo'])
  })
})

describe('parseScubaMasterShopCsv', () => {
  it('parses Aquatech Sheet16 fixture with header', () => {
    const rows = parseScubaMasterShopCsv(AQUATECH_CSV)
    expect(rows).toHaveLength(1)
    expect(rows[0].business_name).toBe('Aquatech Divers')
    expect(rows[0].website_url).toBe('https://www.aquatechdivers.com')
    expect(rows[0].city).toBe('Playa del Carmen')
    expect(rows[0].country_name).toBe('Mexico')
    expect(rows[0].region_name).toBe('North America')
    expect(rows[0].courseNames).toContain('Open Water Diver')
    expect(rows[0].courseNames).toContain('Advanced Adventurer')
    expect(rows[0].typeRaw).toBe('Dive Shop / Day Trip')
    expect(rows[0].diveSiteNames).toContain('Cozumel')
  })

  it('skips blank business names', () => {
    const csv = `Dive Shop,Address,Website,City,State,Country,Region,Phone Number,Email,Dive Courses,Rental Gear,Gases,Type,Dive Sites,Helper,Notes
,addr,,,,,,,,,,,,,`
    expect(parseScubaMasterShopCsv(csv)).toHaveLength(0)
  })
})
