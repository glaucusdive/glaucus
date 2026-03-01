import { defineEventHandler, readBody } from 'h3'
import { buildDiveShopQuery, type SearchFilters } from '../utils/buildDiveShopQuery'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  message: string
  history: Message[]
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

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<RequestBody>(event)
    const { message, history } = body
    
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required')
    }
    
    // Get runtime config
    const config = useRuntimeConfig()
    const openrouterApiKey = config.openrouterApiKey
    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseKey
    
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }
    
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
                filters: lastFilters
              }
            } else {
              return {
                success: true,
                message: 'No more results available.',
                shops: [],
                totalResults: resultCount,
                hasMoreResults: false,
                filters: lastFilters
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
    let followUpMessage = ''
    
    console.log(`[AI Search] Found ${resultCount} results`)
    console.log(`[AI Search] Filters applied:`, JSON.stringify(filters, null, 2))
    
    // Check if user is explicitly asking for more options
    const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) ||
                            /\b(show|find|see)\s+more\b/i.test(message) ||
                            /\bwiden\s+(the\s+)?search\b/i.test(message)
    
    console.log(`[AI Search] User wants more options:`, wantsMoreOptions)
    
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

Examples:
- "I found only 2 shops in Bali. Would you like me to search all of Indonesia? There are many great dive shops throughout the country."
- "Looking for more options? I can also search nearby destinations like Nusa Penida, Lombok, or the Gili Islands."
- "Would you like me to expand the search to all of Thailand? Or I could show you shops in nearby destinations like Koh Tao or Phuket."`
      
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
          followUpMessage = broadeningData.choices[0]?.message?.content || ''
          console.log(`[AI Search] Broadening suggestion generated:`, followUpMessage)
          
          if (!followUpMessage || followUpMessage.trim() === '') {
            console.warn('[AI Search] Broadening suggestion was empty, using fallback')
            followUpMessage = filters.locale 
              ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || 'the broader region'} instead?`
              : 'Would you like me to expand the search to include more locations?'
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
      // Analyze conversation to see what's already been discussed
      const conversationContext = history.map(h => h.content).join(' ')
      
      // Check if user said "any" or similar for any topic
      const noPreferencePattern = /\b(any|all|doesn't matter|don't care|no preference|no matter|whatever|either)\b/i
      const userSaidNoPreference = noPreferencePattern.test(message) || noPreferencePattern.test(conversationContext)
      
      // Check if the last assistant message was asking a follow-up question
      const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()?.content || ''
      const wasAskingQuestion = lastAssistantMessage.includes('?') && (
        lastAssistantMessage.toLowerCase().includes('what') ||
        lastAssistantMessage.toLowerCase().includes('which') ||
        lastAssistantMessage.toLowerCase().includes('where') ||
        lastAssistantMessage.toLowerCase().includes('would you')
      )
      
      // If user said "any" in response to a follow-up question, just show results
      if (userSaidNoPreference && wasAskingQuestion) {
        console.log(`[AI Search] User said "any" in response to follow-up question, showing results instead of asking again`)
        shouldAskFollowUp = false
        // Don't set followUpMessage - we'll show results
      } else {
        shouldAskFollowUp = true
        console.log(`[AI Search] Too many results (${resultCount}), asking follow-up question...`)
        console.log(`[AI Search] Conversation context for follow-up:`, conversationContext.substring(0, 200) + '...')
      
        
        // Build a prompt to ask the AI for a follow-up question
        const followUpPrompt = `The search returned ${resultCount} dive shops, which is too many to show (we want to show 5 or fewer). 
        
Current filters applied: ${JSON.stringify(filters)}

Previous conversation: ${conversationContext}

${userSaidNoPreference ? `IMPORTANT: The user indicated they have no preference for a previous question (they said "any", "doesn't matter", etc.). This means we should NOT ask about that topic again. Move on to a DIFFERENT filter.` : ''}

Ask the user ONE specific follow-up question (just one!) that would help narrow down their options the most. 

IMPORTANT: Look at what has already been discussed in the conversation. Do NOT ask about the same thing again. ${userSaidNoPreference ? 'Since the user said they have no preference, skip that topic entirely and ask about something completely different.' : 'Pick something DIFFERENT that hasn\'t been covered yet.'}

Choose from these options (pick what's most relevant and NOT already discussed):
- More specific location (city/town within the country/region)
- Minimum quality/rating preference (e.g., "Would you like shops with ratings above 4.5?")
- Language preferences (e.g., "Do you need shops that speak English?")
- Budget or shop size preference

${userSaidNoPreference ? 'Since the user has no preference on activities/courses, focus on location, rating, or languages instead.' : ''}

Keep it SHORT and conversational. Ask ONLY ONE question. Do not list multiple options or questions.`
        
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
                { role: 'system', content: 'You are a helpful assistant that asks ONE short, specific question at a time. Be brief and friendly.' },
                { role: 'user', content: followUpPrompt }
              ],
              temperature: 0.6,
              max_tokens: 100
            })
          })
          
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json()
            console.log(`[AI Search] Follow-up API response:`, JSON.stringify(followUpData, null, 2))
            followUpMessage = followUpData.choices[0]?.message?.content || ''
            console.log(`[AI Search] Follow-up question generated:`, followUpMessage)
            
            // If no follow-up message was generated, use a default
            if (!followUpMessage || followUpMessage.trim() === '') {
              console.warn('[AI Search] Follow-up question was empty, using fallback')
              followUpMessage = 'What type of diving are you most interested in (e.g., wreck diving, reef diving, beginner courses)?'
            }
          } else {
            const errorText = await followUpResponse.text()
            console.error(`[AI Search] Follow-up API error (${followUpResponse.status}):`, errorText)
            // Use a fallback question
            followUpMessage = 'What type of diving are you most interested in?'
          }
        } catch (followUpError) {
          console.error('[AI Search] Error generating follow-up question:', followUpError)
          // Use a fallback question
          followUpMessage = 'What type of diving are you most interested in?'
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
      // Too many results - ask narrowing question, don't show shops yet
      responseShops = []
      finalMessage = `I found ${resultCount} dive shops that match your criteria. ${followUpMessage}`
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
      filters: filters
    }
    
  } catch (error: any) {
    console.error('AI Search error:', error)
    return {
      success: false,
      message: error.message || 'An error occurred while searching',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {}
    }
  }
})

