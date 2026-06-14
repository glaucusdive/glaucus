/** July 1–4 trip label; year bumps forward once July 4 has passed. */
export function formatBaliJulyTripDateRange (now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let year = today.getFullYear()
  const tripEnd = new Date(year, 6, 4)
  if (tripEnd < today) year += 1
  return `July 1-4 ${year}`
}

export function getChatStarterPrompts (now: Date = new Date()): string[] {
  return [
    `I want to go diving in Bali ${formatBaliJulyTripDateRange(now)}`,
    'I want to get an Open Water Diver scuba diving certification',
    'I want to book a Liveaboard in Fiji'
  ]
}
