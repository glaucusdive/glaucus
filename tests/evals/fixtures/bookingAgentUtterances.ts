export interface BookingAgentUtteranceCase {
  utterance: string
  expectedIntent: 'booking' | 'search'
  expectedEntityPhrase: string | null
}

/**
 * Seeded from real product-style phrasing we see in partner/user conversations.
 * Keep this set between 20-40 utterances so it stays quick in CI.
 */
export const BOOKING_AGENT_UTTERANCES: BookingAgentUtteranceCase[] = [
  { utterance: "Let's book at Neptune Diving Bali", expectedIntent: 'booking', expectedEntityPhrase: 'Neptune Diving Bali' },
  { utterance: 'Book with Blue Water Divers', expectedIntent: 'booking', expectedEntityPhrase: 'Blue Water Divers' },
  { utterance: "I'd like to book with the first one", expectedIntent: 'booking', expectedEntityPhrase: 'first one' },
  { utterance: 'I want to book at Aqua', expectedIntent: 'booking', expectedEntityPhrase: 'Aqua' },
  { utterance: 'reserve at the Manta Point Dive Center', expectedIntent: 'booking', expectedEntityPhrase: 'Manta Point Dive Center' },
  { utterance: 'booking at Sea Dragon Dive Resort', expectedIntent: 'booking', expectedEntityPhrase: 'Sea Dragon Dive Resort' },
  { utterance: 'book Scuba Elite', expectedIntent: 'booking', expectedEntityPhrase: 'Scuba Elite' },
  { utterance: 'reserve a dive at Bali Reef Academy', expectedIntent: 'booking', expectedEntityPhrase: 'Bali Reef Academy' },
  { utterance: 'book a dive with Coral Hub', expectedIntent: 'booking', expectedEntityPhrase: 'Coral Hub' },
  { utterance: 'i want to dive with Atlantis Divers', expectedIntent: 'booking', expectedEntityPhrase: 'Atlantis Divers' },
  { utterance: 'go diving with Mola Mola Team', expectedIntent: 'booking', expectedEntityPhrase: 'Mola Mola Team' },
  { utterance: 'dive at Blue Corner', expectedIntent: 'booking', expectedEntityPhrase: 'Blue Corner' },
  { utterance: 'I would like to book with Drift Masters', expectedIntent: 'booking', expectedEntityPhrase: 'Drift Masters' },
  { utterance: 'Can you reserve with Ocean Orbit?', expectedIntent: 'booking', expectedEntityPhrase: null },
  { utterance: 'send my request', expectedIntent: 'booking', expectedEntityPhrase: null },
  { utterance: 'submit my request please', expectedIntent: 'booking', expectedEntityPhrase: null },
  { utterance: 'what are some diveshops close to bali', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'show me dive shops in bali', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'find highly rated shops in thailand', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'looking for liveaboards in maldives', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'which shops speak english and spanish', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'can you help me browse options', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'Dive site', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'entity_clarify:dive_site', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'show me places around nusa penida', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'do you have courses in tulamben', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'new search', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'start over', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'I just need info for now', expectedIntent: 'search', expectedEntityPhrase: null },
  { utterance: 'what dive sites are available near komodo', expectedIntent: 'search', expectedEntityPhrase: null }
]
