/**
 * Curated scuba dive dictionary terms (static).
 * Source of truth for /dictionary browse + detail pages and sitemap.
 */

export type DiveDictionaryTerm = {
  slug: string
  term: string
  definition: string
  aliases?: string[]
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') as readonly string[]

export const DICTIONARY_LETTERS = LETTERS

/** Seeded glossary. Keep alphabetical by term for stable sitemap / neighbor order. */
export const DIVE_DICTIONARY_TERMS: readonly DiveDictionaryTerm[] = [
  {
    slug: 'air-embolism',
    term: 'Air embolism',
    definition:
      'Gas bubbles entering the bloodstream, typically from holding one\'s breath on ascent.'
  },
  {
    slug: 'ambient-pressure',
    term: 'Ambient pressure',
    definition:
      'The total surrounding pressure at depth, combining water and atmospheric pressure.'
  },
  {
    slug: 'arterial-gas-embolism',
    term: 'Arterial gas embolism (AGE)',
    definition:
      'Life-threatening bubble blockage in arteries, often from lung overexpansion injury.',
    aliases: ['AGE']
  },
  {
    slug: 'ascent-rate',
    term: 'Ascent rate',
    definition: 'Speed of surfacing; too fast increases DCS and lung-injury risk.'
  },
  {
    slug: 'barotrauma',
    term: 'Barotrauma',
    definition:
      'Tissue injury from pressure imbalance between an air space and surrounding pressure.'
  },
  {
    slug: 'buoyancy-compensator',
    term: 'Buoyancy compensator (BC)',
    definition:
      'Inflatable vest-like gear that lets divers adjust and control their buoyancy underwater.',
    aliases: ['BC', 'BCD', 'buoyancy control device']
  },
  {
    slug: 'closed-circuit-rebreather',
    term: 'Closed-circuit (rebreather)',
    definition:
      'A rebreather system that recirculates nearly all breathing gas with no exhaust bubbles.',
    aliases: ['CCR']
  },
  {
    slug: 'counterlung',
    term: 'Counterlung',
    definition:
      'Flexible breathing bag in a rebreather that holds gas between inhalations.'
  },
  {
    slug: 'decompression-sickness',
    term: 'Decompression sickness (DCS)',
    definition:
      'Illness from nitrogen bubbles forming in tissue/blood when ascent outpaces off-gassing; "the bends."',
    aliases: ['DCS', 'the bends']
  },
  {
    slug: 'decompression-stop',
    term: 'Decompression stop',
    definition:
      'Mandatory pause at a set depth during ascent to safely release absorbed inert gas.'
  },
  {
    slug: 'doppler-ultrasound',
    term: 'Doppler (ultrasound)',
    definition:
      'Device used to detect bubbles moving through blood after diving, aiding DCS research.'
  },
  {
    slug: 'ear-barotrauma',
    term: 'Ear barotrauma',
    definition:
      'Painful pressure injury to the middle or inner ear from inadequate equalization.'
  },
  {
    slug: 'eustachian-tube',
    term: 'Eustachian tube',
    definition:
      'The passage connecting the middle ear to the throat, used to equalize ear pressure while diving.'
  },
  {
    slug: 'frenzel-maneuver',
    term: 'Frenzel maneuver',
    definition:
      'An ear-equalizing technique using tongue and throat muscles instead of lung pressure.'
  },
  {
    slug: 'halocline',
    term: 'Halocline',
    definition:
      'A visible layer where fresh and salt water meet, creating a blurry, shimmering effect.'
  },
  {
    slug: 'heliox',
    term: 'Heliox',
    definition:
      'A helium-oxygen breathing mix that avoids nitrogen narcosis at extreme depths.'
  },
  {
    slug: 'hydrostatic-pressure',
    term: 'Hydrostatic pressure',
    definition:
      'Pressure exerted by a column of water, increasing steadily with depth.'
  },
  {
    slug: 'hypercapnia',
    term: 'Hypercapnia',
    definition:
      'Excess carbon dioxide buildup in the blood, causing headache, confusion, or panic while diving.'
  },
  {
    slug: 'hypoxia',
    term: 'Hypoxia',
    definition:
      'Insufficient oxygen reaching body tissues, a hazard in rebreather diving or breath-hold blackout.'
  },
  {
    slug: 'isobaric-counterdiffusion',
    term: 'Isobaric counterdiffusion',
    definition:
      'Gas exchange complication from switching breathing gases at constant pressure, risking bubble formation.'
  },
  {
    slug: 'lung-overexpansion-injury',
    term: 'Lung overexpansion injury',
    definition:
      'Damage from expanding air in the lungs during ascent if a diver fails to exhale.'
  },
  {
    slug: 'mask-squeeze',
    term: 'Mask squeeze',
    definition:
      'Facial barotrauma from failing to equalize air pressure inside a dive mask during descent.'
  },
  {
    slug: 'microbubbles',
    term: 'Microbubbles',
    definition:
      'Tiny gas bubbles forming in blood/tissue after a dive, even without symptomatic DCS.'
  },
  {
    slug: 'nitrogen-narcosis',
    term: 'Nitrogen narcosis',
    definition:
      'Impaired judgment/coordination from breathing nitrogen under pressure at depth; nicknamed "rapture of the deep."',
    aliases: ['rapture of the deep']
  },
  {
    slug: 'nitrox',
    term: 'Nitrox',
    definition:
      'Breathing gas enriched with oxygen beyond normal air, extending no-decompression limits.',
    aliases: ['EANx', 'enriched air']
  },
  {
    slug: 'no-decompression-limit',
    term: 'No-decompression limit (NDL)',
    definition:
      'Max time at a depth before mandatory decompression stops are required on ascent.',
    aliases: ['NDL']
  },
  {
    slug: 'open-circuit',
    term: 'Open-circuit',
    definition:
      'Traditional scuba setup where exhaled air is vented directly into the water.'
  },
  {
    slug: 'oxygen-toxicity',
    term: 'Oxygen toxicity',
    definition:
      'Central nervous system or lung damage from breathing oxygen at too high a partial pressure.'
  },
  {
    slug: 'partial-pressure',
    term: 'Partial pressure',
    definition:
      'The pressure contributed by one gas within a mixture, key to gas toxicity and narcosis effects.'
  },
  {
    slug: 'patent-foramen-ovale',
    term: 'Patent foramen ovale (PFO)',
    definition:
      'A congenital heart defect letting blood bypass the lungs, raising DCS risk from bubbles.',
    aliases: ['PFO']
  },
  {
    slug: 'pony-bottle',
    term: 'Pony bottle',
    definition:
      'A small backup air cylinder carried for emergency use if the main tank fails.'
  },
  {
    slug: 'rebreather',
    term: 'Rebreather',
    definition:
      'Diving apparatus that recycles exhaled gas by scrubbing CO2 instead of venting bubbles.'
  },
  {
    slug: 'repetitive-dive',
    term: 'Repetitive dive',
    definition:
      'A dive made before the body has fully off-gassed nitrogen from a previous dive.'
  },
  {
    slug: 'reverse-block',
    term: 'Reverse block',
    definition:
      'A squeeze occurring on ascent when trapped gas can\'t equalize outward, often in ears or sinuses.'
  },
  {
    slug: 'safety-stop',
    term: 'Safety stop',
    definition:
      'Precautionary pause (often 3 min at 15 ft) near the end of ascent to off-gas nitrogen.'
  },
  {
    slug: 'scrubber',
    term: 'Scrubber',
    definition:
      'Canister of chemical absorbent that removes CO2 from recycled gas in a rebreather.'
  },
  {
    slug: 'silent-bubbles',
    term: 'Silent bubbles',
    definition:
      'Nitrogen microbubbles detected by Doppler that cause no symptoms but signal decompression stress.'
  },
  {
    slug: 'subcutaneous-emphysema',
    term: 'Subcutaneous emphysema',
    definition:
      'Air trapped under the skin, often around the neck, from a lung overexpansion injury.'
  },
  {
    slug: 'surface-interval',
    term: 'Surface interval',
    definition:
      'Time spent out of the water between dives, during which the body off-gasses nitrogen.'
  },
  {
    slug: 'thermocline',
    term: 'Thermocline',
    definition:
      'A distinct boundary layer where water temperature drops sharply with depth.'
  },
  {
    slug: 'toynbee-maneuver',
    term: 'Toynbee maneuver',
    definition:
      'Equalizing technique performed by swallowing while pinching the nose closed.'
  },
  {
    slug: 'trim',
    term: 'Trim',
    definition:
      'A diver\'s horizontal body position in the water, affecting drag, control, and buoyancy.'
  },
  {
    slug: 'trimix',
    term: 'Trimix',
    definition:
      'A breathing gas blend of oxygen, nitrogen, and helium used for deep technical dives.'
  },
  {
    slug: 'valsalva-maneuver',
    term: 'Valsalva maneuver',
    definition:
      'Common ear-equalizing technique of gently exhaling against a pinched nose.'
  },
  {
    slug: 'weight-belt',
    term: 'Weight belt',
    definition: 'A belt of lead weights worn to offset a diver\'s natural buoyancy.'
  }
] as const

function normalizeSearchText (value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function termSortKey (term: DiveDictionaryTerm): string {
  return term.term.replace(/^\(/, '').toLowerCase()
}

function firstLetter (term: DiveDictionaryTerm): string {
  const ch = term.term.trim().charAt(0).toUpperCase()
  return LETTERS.includes(ch) ? ch : '#'
}

/** All terms in display order (alphabetical by term label). */
export function listDictionaryTerms (): DiveDictionaryTerm[] {
  return [...DIVE_DICTIONARY_TERMS].sort((a, b) =>
    termSortKey(a).localeCompare(termSortKey(b), 'en')
  )
}

export function getDictionaryTerm (slug: string): DiveDictionaryTerm | undefined {
  const key = String(slug || '').trim().toLowerCase()
  if (!key) return undefined
  return DIVE_DICTIONARY_TERMS.find(t => t.slug === key)
}

export function filterTerms (query: string, terms?: readonly DiveDictionaryTerm[]): DiveDictionaryTerm[] {
  const source = terms ? [...terms] : listDictionaryTerms()
  const q = normalizeSearchText(query)
  if (!q) return source
  return source.filter((t) => {
    if (normalizeSearchText(t.term).includes(q)) return true
    if (normalizeSearchText(t.definition).includes(q)) return true
    return (t.aliases || []).some(a => normalizeSearchText(a).includes(q))
  })
}

export type DictionaryLetterGroup = {
  letter: string
  terms: DiveDictionaryTerm[]
}

/** Group filtered/sorted terms by first letter (A–Z only; skips empty letters). */
export function groupTermsByLetter (
  terms?: readonly DiveDictionaryTerm[]
): DictionaryLetterGroup[] {
  const source = terms ? [...terms] : listDictionaryTerms()
  const map = new Map<string, DiveDictionaryTerm[]>()
  for (const letter of LETTERS) {
    map.set(letter, [])
  }
  for (const term of source) {
    const letter = firstLetter(term)
    if (!map.has(letter)) continue
    map.get(letter)!.push(term)
  }
  const groups: DictionaryLetterGroup[] = []
  for (const letter of LETTERS) {
    const bucket = map.get(letter) || []
    if (!bucket.length) continue
    groups.push({
      letter,
      terms: bucket.sort((a, b) => termSortKey(a).localeCompare(termSortKey(b), 'en'))
    })
  }
  return groups
}

export function dictionaryLetterCounts (
  terms?: readonly DiveDictionaryTerm[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const letter of LETTERS) {
    counts[letter] = 0
  }
  const source = terms || listDictionaryTerms()
  for (const term of source) {
    const letter = firstLetter(term)
    if (Object.prototype.hasOwnProperty.call(counts, letter)) {
      counts[letter] = (counts[letter] ?? 0) + 1
    }
  }
  return counts
}

export type DictionaryNeighbor = {
  prev: DiveDictionaryTerm | null
  next: DiveDictionaryTerm | null
}

export function getDictionaryNeighbors (slug: string): DictionaryNeighbor {
  const ordered = listDictionaryTerms()
  const index = ordered.findIndex(t => t.slug === slug)
  if (index < 0) {
    return { prev: null, next: null }
  }
  return {
    prev: index > 0 ? ordered[index - 1]! : null,
    next: index < ordered.length - 1 ? ordered[index + 1]! : null
  }
}

/** Sitemap entries for each dictionary term. */
export function dictionarySitemapEntries (): { loc: string }[] {
  return listDictionaryTerms().map(t => ({ loc: `/dictionary/${t.slug}` }))
}

export function normalizeDictionarySearch (value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 120)
}
