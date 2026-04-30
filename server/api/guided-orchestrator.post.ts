import { defineEventHandler, type H3Event } from 'h3'
import { runAiSearchPostHandler } from '../utils/runAiSearchPostHandler'

/**
 * Single JSON orchestrator for chat (booking, entity clarify, legacy search when guided is off on client).
 * Replaces product use of POST /api/ai-search.
 */
export default defineEventHandler((event: H3Event) => runAiSearchPostHandler(event))
