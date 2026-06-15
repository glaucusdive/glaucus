import { BULK_IMPORT_PARSE_BATCH_SIZE } from './bulkImportConstants'

/** Parse a CSV line respecting double-quoted fields (can contain commas). */
export function parseCSVLine (line: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1
      let field = ''
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\') {
          i += 1
          if (i < line.length) field += line[i++]
        } else {
          field += line[i++]
        }
      }
      if (line[i] === '"') i += 1
      out.push(field.trim())
      if (i < line.length && line[i] === ',') i += 1
    } else {
      let field = ''
      while (i < line.length && line[i] !== ',') field += line[i++]
      out.push(field.trim())
      if (line[i] === ',') i += 1
    }
  }
  return out
}

export interface ParsedShopCsvRow {
  index: number
  business_name: string
  street_address: string | null
  website_url: string | null
  city: string | null
  state: string | null
  country_name: string | null
  region_name: string | null
  phone: string | null
  email: string | null
  courseNames: string[]
  rentalNames: string[]
  gasNames: string[]
  typeRaw: string | null
  diveSiteNames: string[]
  notes: string | null
}

function splitCsvList (raw: string): string[] {
  if (!raw.trim()) return []
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]
}

function rowFromParts (index: number, p: string[]): ParsedShopCsvRow | null {
  const businessName = (p[0] || '').trim()
  if (!businessName) return null
  const notes = (p[14] || '').trim() || (p[15] || '').trim()
  return {
    index,
    business_name: businessName,
    street_address: (p[1] || '').trim() || null,
    website_url: (p[2] || '').trim() || null,
    city: (p[3] || '').trim() || null,
    state: (p[4] || '').trim() || null,
    country_name: (p[5] || '').trim() || null,
    region_name: (p[6] || '').trim() || null,
    phone: (p[7] || '').trim() || null,
    email: (p[8] || '').trim() || null,
    courseNames: splitCsvList(p[9] || ''),
    rentalNames: splitCsvList(p[10] || ''),
    gasNames: splitCsvList(p[11] || ''),
    typeRaw: (p[12] || '').trim() || null,
    diveSiteNames: splitCsvList(p[13] || ''),
    notes: notes || null
  }
}

function isHeaderRow (parts: string[]): boolean {
  return (parts[0] || '').trim().toLowerCase() === 'dive shop'
}

export function parseScubaMasterShopCsv (text: string): ParsedShopCsvRow[] {
  const lines = text.split(/\r?\n/)
  const rows: ParsedShopCsvRow[] = []
  let rowIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = parseCSVLine(line)
    if (i === 0 && isHeaderRow(parts)) continue
    const row = rowFromParts(rowIndex, parts)
    if (row) {
      rows.push(row)
      rowIndex += 1
    }
  }
  return rows
}

export interface ChunkedParseOptions {
  batchSize?: number
  onProgress?: (parsed: number, totalLines: number) => void
}

/**
 * Parse CSV without blocking the main thread for large files.
 * Returns a promise that resolves when all rows are parsed.
 */
export function parseScubaMasterShopCsvChunked (
  text: string,
  options: ChunkedParseOptions = {}
): Promise<ParsedShopCsvRow[]> {
  const batchSize = options.batchSize ?? BULK_IMPORT_PARSE_BATCH_SIZE
  const lines = text.split(/\r?\n/)
  const nonEmptyIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) nonEmptyIndices.push(i)
  }

  return new Promise((resolve) => {
    const rows: ParsedShopCsvRow[] = []
    let rowIndex = 0
    let batchStart = 0
    let skippedHeader = false

    function processBatch () {
      const end = Math.min(batchStart + batchSize, nonEmptyIndices.length)
      for (let b = batchStart; b < end; b++) {
        const lineIdx = nonEmptyIndices[b]
        const line = lines[lineIdx].trim()
        const parts = parseCSVLine(line)
        if (!skippedHeader && lineIdx === nonEmptyIndices[0] && isHeaderRow(parts)) {
          skippedHeader = true
          continue
        }
        skippedHeader = true
        const row = rowFromParts(rowIndex, parts)
        if (row) {
          rows.push(row)
          rowIndex += 1
        }
      }
      options.onProgress?.(rows.length, nonEmptyIndices.length)
      batchStart = end
      if (batchStart < nonEmptyIndices.length) {
        setTimeout(processBatch, 0)
      } else {
        resolve(rows)
      }
    }

    if (nonEmptyIndices.length === 0) {
      resolve([])
      return
    }
    setTimeout(processBatch, 0)
  })
}
