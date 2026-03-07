import { defineEventHandler, readBody } from 'h3'
import { buildDiveShopQuery, type SearchFilters } from '../utils/buildDiveShopQuery'
import { getShopById, resolveShopByName } from '../utils/resolveShop'
import { getDiveSitesForShop } from '../utils/getDiveSitesForShop'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/** Booking payload shape (frontend sends accumulated state; backend returns updated payload when in booking flow). */
export interface BookingDiver {
  name: string
  certificationNumber: string
  numberOfDives: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  gear: { gearType: string }[]
}

export interface BookingPayload {
  shopId?: string
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  numberOfDivers?: number
  divers?: BookingDiver[]
  desiredDiveSites?: string[]
}

interface RequestBody {
  message: string
  history: Message[]
  selectedShopId?: string
  lastShops?: { id: string; business_name: string }[]
  bookingPayload?: BookingPayload
}

const SYSTEM_PROMPT = `You are an AI assistant helping users find the perfect dive shop for their needs. 

Your task is to:
1. Understand what the user is looking for in their diving experience
2. Extract relevant search filters from the conversation
3. Help narrow down options when there are too many results

Available dive shop data fields you can filter on:
- country: The country where the shop is located
- locale: The city/town where the shop is located
- region: The specific region within a country
- google_rating: The Google rating (0-5)
- languages: Array of languages spoken at the shop
- operating_hours: Shop operating hours
- website_url, phone, email: Contact information

When the user asks about diving, analyze their request and respond with a JSON object followed by a conversational message.

Your response MUST be in this exact format:
FILTERS: {
  "country": "string or null",
  "locale": "string or null", 
  "region": "string or null",
  "minRating": number or null,
  "languages": ["array", "of", "languages"] or null
}
MESSAGE: Your conversational response to the user

Rules:
- Extract location information carefully (e.g., "Bali" -> locale: "Bali", country: "Indonesia")
- If user mentions quality/rating requirements, set minRating appropriately
- Be conversational and friendly in your MESSAGE
- Keep your MESSAGE SHORT and concise (1-2 sentences max)
- Do NOT ask multiple questions - keep responses simple
- Let the conversation flow naturally without overwhelming the user
- IMPORTANT: If the user says "any", "doesn't matter", "no preference", "all types", or similar phrases indicating no preference for a topic, do NOT set filters for that topic. Treat it as "no filter needed" for that aspect.

Examples:

User: "I want to dive in Bali"
FILTERS: {"country": "Indonesia", "locale": "Bali", "region": null, "minRating": null, "languages": null}
MESSAGE: I'll help you find dive shops in Bali! Let me search for options.

User: "Looking for highly rated shops"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": 4.5, "languages": null}
MESSAGE: I'll find highly-rated dive shops for you.

User: "Shops that speak English and Spanish"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": null, "languages": ["English", "Spanish"]}
MESSAGE: Looking for shops where staff speaks English and Spanish.

User: "any type of diving"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": null, "languages": null}
MESSAGE: Got it! I'll search for all dive shops without filtering by activity type.`

const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i

function buildBookingSystemPrompt (shopName: string, diveSiteNames: string[], existingPayload: BookingPayload | undefined): string {
  const sitesList = diveSiteNames.length > 0 ? `\nDive sites available at this shop (offer as selectable options): ${diveSiteNames.join(', ')}` : ''
  const collected = existingPayload ? `\nAlready collected: ${JSON.stringify(existingPayload)}` : ''
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${sitesList}${collected}

Ask for ONE piece of information at a time in this order: 1) name, 2) email, 3) start date and end date for diving, 4) number of divers, 5) for each diver: name, certification number, number of dives completed, height (with unit: cm or ft-in), weight (with unit: kg or lbs), and any rental gear they need. Optionally ask which dive sites they're interested in from the list.

Be warm and conversational. When you have collected all required fields (name, email, startDate, endDate, numberOfDivers, and for each diver: name, certificationNumber, numberOfDives, height, heightUnit, weight, weightUnit; gear can be empty array), output exactly:

BOOKING_READY: <valid JSON object>

The JSON must have this shape (use empty string "" for missing optional fields, [] for empty arrays):
{
  "shopId": "<shop id if you have it>",
  "name": "string",
  "email": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "numberOfDivers": number,
  "divers": [
    {
      "name": "string",
      "certificationNumber": "string",
      "numberOfDives": "string",
      "height": "string",
      "heightUnit": "cm or ft-in",
      "weight": "string",
      "weightUnit": "kg or lbs",
      "gear": [{"gearType": "string"}]
    }
  ],
  "desiredDiveSites": ["string"]
}

Do not output BOOKING_READY until every required field is present. If the user corrects something, update and continue.`
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<RequestBody>(event)
    const { message, history, selectedShopId, lastShops, bookingPayload } = body

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required')
    }

    const config = useRuntimeConfig()
    const openrouterApiKey = config.openrouterApiKey
    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseKey

    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // --- Intent: booking vs search ---
    const wantsToBook = BOOKING_INTENT_PATTERN.test(message)
    const hasShopContext = !!selectedShopId || (lastShops && lastShops.length > 0)
    const shopNameFromMessage = message.match(/(?:book with|reserve with)\s+([^.?!]+)/i)?.[1]?.trim()

    let resolvedShop: Awaited<ReturnType<typeof getShopById>> = null
    if (wantsToBook) {
      if (selectedShopId) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, selectedShopId)
      }
      if (!resolvedShop && shopNameFromMessage) {
        resolvedShop = await resolveShopByName(supabaseUrl, supabaseKey, shopNameFromMessage)
      }
      if (!resolvedShop && lastShops?.length === 1) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastShops[0].id)
      }
      if (!resolvedShop && message.match(/\b(first|second|third|1st|2nd|3rd)\s+(one|shop|result)\b/i) && lastShops?.length) {
        const idx = message.match(/\b(first|1st)\b/i) ? 0 : message.match(/\b(second|2nd)\b/i) ? 1 : 2
        const shop = lastShops[Math.min(idx, lastShops.length - 1)]
        if (shop) resolvedShop = await getShopById(supabaseUrl, supabaseKey, shop.id)
      }
    }

    if (resolvedShop && wantsToBook) {
      const diveSites = await getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id)
      const diveSiteNames = diveSites.map(d => d.name)
      const systemPrompt = buildBookingSystemPrompt(resolvedShop.business_name, diveSiteNames, bookingPayload)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(history || []),
        { role: 'user' as const, content: message }
      ]
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://glaucus.app',
          'X-Title': 'Glaucus Dive Shop Booking'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages,
          temperature: 0.6,
          max_tokens: 1200
        })
      })
      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('[AI Search] Booking flow API error:', errText)
        throw new Error('Booking flow failed')
      }
      const aiData = await aiResponse.json()
      const aiMessage = aiData.choices[0]?.message?.content || ''
      const bookingReadyIdx = aiMessage.indexOf('BOOKING_READY:')
      if (bookingReadyIdx >= 0) {
        const braceStart = aiMessage.indexOf('{', bookingReadyIdx)
        if (braceStart >= 0) {
          let depth = 0
          let end = braceStart
          for (let i = braceStart; i < aiMessage.length; i++) {
            if (aiMessage[i] === '{') depth++
            else if (aiMessage[i] === '}') { depth--; if (depth === 0) { end = i; break } }
          }
          const jsonStr = aiMessage.slice(braceStart, end + 1)
          try {
            const payload = JSON.parse(jsonStr) as BookingPayload
            payload.shopId = payload.shopId || resolvedShop.id
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: true,
              payload,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: undefined
            }
          } catch (e) {
            console.error('[AI Search] BOOKING_READY parse error:', e)
          }
        }
      }
      const replyMessage = (bookingReadyIdx >= 0 ? aiMessage.slice(0, bookingReadyIdx) : aiMessage).trim() || aiMessage
      const selectableOptions = diveSiteNames.length > 0 ? diveSiteNames.map(name => ({ label: name, value: name })) : undefined
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: replyMessage,
        shopId: resolvedShop.id,
        shopName: resolvedShop.business_name,
        bookingPayload: bookingPayload ?? undefined,
        selectableOptions
      }
    }

    // --- Search flow (existing) ---
    // Check if user is asking for more results (pagination)
    const paginationPattern = /\b(next|more|show more|next 5|next results|show next|load more|another|additional)\s*(5|results?|shops?|ones?)?\b/i
    const isPaginationRequest = paginationPattern.test(message)
    
    if (isPaginationRequest && history && history.length > 0) {
      // Find the last assistant message that had shops and filters
      // We need to reconstruct the filters from the conversation history
      // Look for the last message that had shops shown
      let lastFilters: SearchFilters = {}
      let lastShopsCount = 0
      
      // Try to extract filters from the last search by looking at conversation context
      // We'll need to re-run the AI to get filters, but skip the question-asking logic
      const conversationContext = history.map(h => h.content).join(' ')
      
      // Quick check: if we can find a previous search context, use it
      // Otherwise, we'll need to extract filters from the conversation
      console.log(`[AI Search] Pagination request detected: "${message}"`)
      
      // Extract filters from conversation history using AI (but don't ask questions)
      const filterExtractionPrompt = `Extract search filters from this conversation history. The user is asking for more results, so just return the filters that were used in the previous search.

Conversation history: ${conversationContext}

Return ONLY the filters in this exact format:
FILTERS: {
  "country": "string or null",
  "locale": "string or null", 
  "region": "string or null",
  "minRating": number or null,
  "languages": ["array", "of", "languages"] or null
}

Do not include a MESSAGE. Just return the FILTERS.`
      
      try {
        const filterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://glaucus.app',
            'X-Title': 'Glaucus Dive Shop Search'
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              { role: 'system', content: 'You extract search filters from conversations. Return only FILTERS in the specified format.' },
              { role: 'user', content: filterExtractionPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        })
        
        if (filterResponse.ok) {
          const filterData = await filterResponse.json()
          const filterMessage = filterData.choices[0]?.message?.content || ''
          const filtersMatch = filterMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
          
          if (filtersMatch) {
            lastFilters = JSON.parse(filtersMatch[1])
            console.log(`[AI Search] Extracted filters for pagination:`, lastFilters)
            
            // Query with same filters
            const query = buildDiveShopQuery(supabaseUrl, supabaseKey, lastFilters)
            const { data: shops, error: dbError } = await query
            
            if (dbError) {
              console.error('Database error during pagination:', dbError)
              throw new Error('Failed to fetch more results')
            }
            
            const resultCount = shops?.length || 0
            
            // Count how many shops have been shown already
            // Count all assistant messages that showed results (each shows 5)
            // Messages that show results typically say "Here are" or "top results"
            // Messages that ask questions say "What type" or "Would you" and end with "?"
            let alreadyShown = 0
            for (let i = 0; i < history.length; i++) {
              const msg = history[i]
              if (msg.role === 'assistant') {
                // Check if this message showed shops/results
                // Pattern: "Here are" or "top results" and NOT asking a question (no "What" or "Would you")
                const hasResultsPhrase = msg.content.includes('Here are') || 
                                        msg.content.includes('top results') ||
                                        msg.content.includes('Here are the')
                const isAskingQuestion = msg.content.includes('What type') ||
                                         msg.content.includes('Would you') ||
                                         (msg.content.includes('?') && msg.content.trim().endsWith('?'))
                
                if (hasResultsPhrase && !isAskingQuestion) {
                  alreadyShown += 5
                  console.log(`[AI Search] Found result message at index ${i}: "${msg.content.substring(0, 50)}...", total shown: ${alreadyShown}`)
                }
              }
            }
            
            console.log(`[AI Search] Pagination: already shown ${alreadyShown} shops, total results: ${resultCount}`)
            
            // Get next 5 shops (skip the ones already shown)
            const nextShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
            const remaining = Math.max(0, resultCount - alreadyShown - nextShops.length)
            
            if (nextShops.length > 0) {
              return {
                success: true,
                message: remaining > 0 
                  ? `Here are the next ${nextShops.length} results. ${remaining} more available.`
                  : `Here are the next ${nextShops.length} results.`,
                shops: nextShops,
                totalResults: resultCount,
                hasMoreResults: remaining > 0,
                filters: lastFilters,
                selectableOptions: undefined
              }
            } else {
              return {
                success: true,
                message: 'No more results available.',
                shops: [],
                totalResults: resultCount,
                hasMoreResults: false,
                filters: lastFilters,
                selectableOptions: undefined
              }
            }
          }
        }
      } catch (paginationError) {
        console.error('[AI Search] Error handling pagination:', paginationError)
        // Fall through to normal processing
      }
    }
    
    // Build conversation history for the AI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message }
    ]
    
    // Call OpenRouter API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://glaucus.app',
        'X-Title': 'Glaucus Dive Shop Search'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    })
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API error: ${aiResponse.statusText}`)
    }
    
    const aiData = await aiResponse.json()
    const aiMessage = aiData.choices[0]?.message?.content || ''
    
    console.log(`[AI Search] Raw AI response:`, aiMessage)
    
    // Parse the AI response to extract filters and message
    let filters: SearchFilters = {}
    let conversationalMessage = aiMessage
    
    try {
      // Extract FILTERS and MESSAGE from the response
      const filtersMatch = aiMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
      const messageMatch = aiMessage.match(/MESSAGE:\s*(.+)/s)
      
      if (filtersMatch) {
        filters = JSON.parse(filtersMatch[1])
        console.log(`[AI Search] Extracted filters:`, filters)
      } else {
        console.log(`[AI Search] No filters found in AI response`)
      }
      
      if (messageMatch) {
        conversationalMessage = messageMatch[1].trim()
      }
    } catch (parseError) {
      console.error('[AI Search] Error parsing AI response:', parseError)
      console.error('[AI Search] Problematic response:', aiMessage)
      // If parsing fails, use the entire message and empty filters
      conversationalMessage = aiMessage
      filters = {}
    }
    
    // Query the database with extracted filters
    const query = buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
    const { data: shops, error: dbError } = await query
    
    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to search dive shops')
    }
    
    // Determine if we should ask follow-up questions or suggest broadening
    const resultCount = shops?.length || 0
    let shouldAskFollowUp = false
    let userAlreadyAnsweredLastQuestion = false
    let followUpMessage = ''
    
    console.log(`[AI Search] Found ${resultCount} results`)
    console.log(`[AI Search] Filters applied:`, JSON.stringify(filters, null, 2))
    
    // Check if user is explicitly asking for more options
    const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) ||
                            /\b(show|find|see)\s+more\b/i.test(message) ||
                            /\bwiden\s+(the\s+)?search\b/i.test(message)
    
    console.log(`[AI Search] User wants more options:`, wantsMoreOptions)
    
    // Selectable options for frontend chips/quick-replies (search flow)
    let selectableOptions: { label: string; value: string }[] | undefined

    // Handle low results (≤2) or explicit request for more options
    if (resultCount <= 2 || wantsMoreOptions) {
      shouldAskFollowUp = true
      console.log(`[AI Search] Low results (${resultCount}) or user wants more options, suggesting to broaden search...`)
      
      // Analyze conversation to understand current search scope
      const conversationContext = history.map(h => h.content).join(' ')
      
      // Build a prompt to suggest broadening the search
      const broadeningPrompt = `The search returned only ${resultCount} dive shop(s) based on these filters: ${JSON.stringify(filters)}
      
Previous conversation: ${conversationContext}

${wantsMoreOptions ? 'The user is asking to see more options.' : 'There are very few results.'}

Suggest ONE of these approaches (choose the most appropriate):

1. If a specific locale/city was searched (e.g., "Bali"), suggest broadening to the parent region/country (e.g., "Would you like me to search all of Indonesia instead?")

2. If already at country level or user wants alternatives, suggest 2-3 nearby popular dive destinations in the same region

Be helpful and specific. Use your geographic knowledge. Keep it SHORT (one sentence + the suggestion).

On a new line after your message, also output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap (e.g. ["Search all of Indonesia", "Search Southeast Asia"]):
SUGGESTIONS: ["short phrase 1", "short phrase 2"]

Examples:
- "I found only 2 shops in Bali. Would you like me to search all of Indonesia? There are many great dive shops throughout the country."
SUGGESTIONS: ["Search all of Indonesia", "Search Southeast Asia"]
- "Would you like me to expand the search to all of Thailand? Or I could show you shops in nearby destinations like Koh Tao or Phuket."
SUGGESTIONS: ["Search all of Thailand", "Koh Tao", "Phuket"]`
      
      try {
        const broadeningResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://glaucus.app',
            'X-Title': 'Glaucus Dive Shop Search'
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              { role: 'system', content: 'You are a helpful dive shop search assistant with knowledge of global dive destinations. Be concise and helpful.' },
              { role: 'user', content: broadeningPrompt }
            ],
            temperature: 0.7,
            max_tokens: 150
          })
        })
        
        if (broadeningResponse.ok) {
          const broadeningData = await broadeningResponse.json()
          let broadeningContent = broadeningData.choices[0]?.message?.content || ''
          const suggestionsMatch = broadeningContent.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/m)
          if (suggestionsMatch) {
            try {
              const arr = JSON.parse(suggestionsMatch[1]) as string[]
              if (Array.isArray(arr) && arr.length > 0) {
                selectableOptions = arr.map(s => ({ label: String(s).slice(0, 60), value: String(s) }))
              }
            } catch (_) { /* ignore */ }
            broadeningContent = broadeningContent.replace(/\nSUGGESTIONS:\s*\[[\s\S]*?\]\s*$/, '').trim()
          }
          followUpMessage = broadeningContent
          console.log(`[AI Search] Broadening suggestion generated:`, followUpMessage)
          
          if (!followUpMessage || followUpMessage.trim() === '') {
            console.warn('[AI Search] Broadening suggestion was empty, using fallback')
            followUpMessage = filters.locale 
              ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || 'the broader region'} instead?`
              : 'Would you like me to expand the search to include more locations?'
            if (!selectableOptions && filters.country) selectableOptions = [{ label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }]
          }
        } else {
          const errorText = await broadeningResponse.text()
          console.error(`[AI Search] Broadening API error (${broadeningResponse.status}):`, errorText)
          followUpMessage = 'Would you like me to expand the search to nearby areas?'
        }
      } catch (broadeningError) {
        console.error('[AI Search] Error generating broadening suggestion:', broadeningError)
        followUpMessage = 'Would you like me to broaden the search?'
      }
    } else if (resultCount > 5) {
      const conversationContext = history.map(h => h.content).join(' ')
      const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()?.content || ''

      // One rule: last assistant message asked a question (?) and user gave a short direct answer → show results, never repeat
      const lastWasAQuestion = lastAssistantMessage.includes('?')
      const noPreference = /\b(any|all|doesn't matter|don't care|no preference|whatever|either)\b/i.test(message)
      const looksLikeNewSearch = /\b(want to|find|search|looking for|dive in|diving in)\b/i.test(message) && message.trim().length > 25
      const userGaveDirectAnswer = lastWasAQuestion && !noPreference && !looksLikeNewSearch && message.trim().length > 0 && message.trim().length < 120

      if (userGaveDirectAnswer) {
        console.log(`[AI Search] User answered the last question ("${message.slice(0, 40)}..."), showing results (no repeat)`)
        shouldAskFollowUp = false
        userAlreadyAnsweredLastQuestion = true
        selectableOptions = []
      } else if (noPreference && lastWasAQuestion) {
        console.log(`[AI Search] User said no preference, showing results`)
        shouldAskFollowUp = false
      } else {
        shouldAskFollowUp = true
        console.log(`[AI Search] Too many results (${resultCount}), asking follow-up question...`)

        const followUpPrompt = `The search returned ${resultCount} dive shops (we show max 5). Ask ONE short follow-up question to narrow down.

Conversation so far: ${conversationContext}

RULES:
- Do NOT repeat or rephrase any question that already appears in the conversation above.
- Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/day trips), minimum rating, or language.
- One short question only.`

        try {
          const followUpResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://glaucus.app',
              'X-Title': 'Glaucus Dive Shop Search'
            },
            body: JSON.stringify({
              model: 'openai/gpt-5-mini',
              messages: [
                { role: 'system', content: 'You ask ONE short question at a time. Never repeat a question that was already asked in the conversation.' },
                { role: 'user', content: followUpPrompt }
              ],
              temperature: 0.6,
              max_tokens: 100
            })
          })

          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json()
            followUpMessage = followUpData.choices[0]?.message?.content?.trim() || ''
          }
          if (!followUpMessage) {
            followUpMessage = 'Would you prefer a liveaboard, a resort, or day trips?'
            selectableOptions = [
              { label: 'Liveaboard', value: 'I prefer a liveaboard' },
              { label: 'Resort', value: 'I prefer a resort' },
              { label: 'Day trips', value: 'Just day trips' }
            ]
          } else {
            selectableOptions = []
          }
        } catch (followUpError) {
          console.error('[AI Search] Error generating follow-up question:', followUpError)
          followUpMessage = 'Would you prefer a liveaboard, a resort, or day trips?'
          selectableOptions = [
            { label: 'Liveaboard', value: 'I prefer a liveaboard' },
            { label: 'Resort', value: 'I prefer a resort' },
            { label: 'Day trips', value: 'Just day trips' }
          ]
        }
      }
    } else {
      console.log(`[AI Search] Result count (${resultCount}) is within limit, showing results`)
    }
    
    // Prepare response
    let responseShops = []
    let finalMessage = ''
    
    if (resultCount <= 2 || wantsMoreOptions) {
      // Show the few results we have + suggestion to broaden
      responseShops = shops || []
      if (resultCount > 0) {
        finalMessage = `Here ${resultCount === 1 ? 'is' : 'are'} the ${resultCount} dive shop${resultCount === 1 ? '' : 's'} I found. ${followUpMessage}`
      } else {
        finalMessage = `I didn't find any dive shops matching those criteria. ${followUpMessage}`
      }
    } else if (shouldAskFollowUp && resultCount > 5) {
      responseShops = []
      finalMessage = `I found ${resultCount} dive shops that match your criteria. ${followUpMessage}`
    } else if (userAlreadyAnsweredLastQuestion) {
      responseShops = (shops || []).slice(0, 5)
      finalMessage = `Here are some top options based on what you said. You can confirm details with the shop or ask to narrow by location, rating, or trip type.`
    } else {
      // Perfect amount (3-5 results) OR user said "any" to a follow-up - show them
      responseShops = (shops || []).slice(0, 5)
      if (resultCount > 5) {
        // User said "any" - show results with a message
        finalMessage = `I found ${resultCount} dive shops. Here are the top results:`
      } else {
        finalMessage = conversationalMessage
      }
    }
    
    console.log(`[AI Search] Sending response - hasMoreResults: ${shouldAskFollowUp}, shops count: ${responseShops.length}`)
    console.log(`[AI Search] Final message:`, finalMessage)
    
    return {
      success: true,
      message: finalMessage,
      shops: responseShops,
      totalResults: resultCount,
      hasMoreResults: shouldAskFollowUp,
      filters: filters,
      selectableOptions
    }
    
  } catch (error: any) {
    console.error('AI Search error:', error)
    return {
      success: false,
      message: error.message || 'An error occurred while searching',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }
})

