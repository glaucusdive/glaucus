import { defineEventHandler, readBody, setResponseHeader, type H3Event } from 'h3'
import { runAiSearchPostHandler, type RequestBody } from '../utils/runAiSearchPostHandler'

/**
 * Single JSON orchestrator for chat (booking, entity clarify, legacy search when guided is off on client).
 * Replaces product use of POST /api/ai-search.
 *
 * When `progressStream: true` in the JSON body, responds with `application/x-ndjson`: lines
 * `{"type":"progress","label":"..."}` then a final `{"type":"result","payload":{...}}` or `{"type":"error","message":"..."}`.
 */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<RequestBody>(event)

  if (body.progressStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start (controller) {
        const write = (obj: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
        }
        try {
          const payload = await runAiSearchPostHandler(event, {
            body,
            onActivityLine: (label) => write({ type: 'progress', label })
          })
          write({ type: 'result', payload })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error'
          write({ type: 'error', message: msg })
        } finally {
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }
      }
    })
    setResponseHeader(event, 'content-type', 'application/x-ndjson; charset=utf-8')
    return stream
  }

  return runAiSearchPostHandler(event, { body })
})
