import { defineEventHandler, readBody, setResponseHeader, type H3Event } from 'h3'
import { runAiSearchPostHandler, type RequestBody } from '../utils/runAiSearchPostHandler'
import { callOrchestratorAgent, type OrchestratorRequest } from '../utils/pythonAgentsClient'

type OrchestratorMode = 'ts' | 'python' | 'hybrid'

function getOrchestratorMode (): OrchestratorMode {
  const raw = String(process.env.ORCHESTRATOR_MODE || 'ts').trim().toLowerCase()
  if (raw === 'python' || raw === 'hybrid') return raw
  return 'ts'
}

function toPythonOrchestratorRequest (body: RequestBody): OrchestratorRequest {
  return {
    message: body.message,
    history: body.history as OrchestratorRequest['history'],
    wantsBooking: body.lastIntent === 'booking' || Boolean(body.bookingPayload),
    baseFilters: body.lastSearchFilters || null,
    selectedShopId: body.selectedShopId || body.lastBookingShopId || null,
    autoAgentRouting: true,
    runDbProbe: true,
    runDbSearch: true
  }
}

async function runPythonOrchestrator (body: RequestBody, onActivityLine?: (label: string) => void) {
  onActivityLine?.('python_orchestrator')
  const res = await callOrchestratorAgent(toPythonOrchestratorRequest(body))
  if (!res.ok) {
    throw new Error(res.nluError || 'Python orchestrator failed')
  }
  return res
}

function runPythonShadow (body: RequestBody): void {
  void (async () => {
    try {
      const shadow = await callOrchestratorAgent(toPythonOrchestratorRequest(body))
      if (!shadow.ok) {
        console.warn('[guided-orchestrator] hybrid shadow failed:', shadow.nluError || 'unknown')
      }
    } catch (e: unknown) {
      console.warn('[guided-orchestrator] hybrid shadow exception:', e)
    }
  })()
}

/**
 * Single JSON orchestrator for chat (booking, entity clarify, legacy search when guided is off on client).
 * Replaces product use of POST /api/ai-search.
 *
 * When `progressStream: true` in the JSON body, responds with `application/x-ndjson`: lines
 * `{"type":"progress","label":"..."}` then a final `{"type":"result","payload":{...}}` or `{"type":"error","message":"..."}`.
 */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<RequestBody>(event)
  const mode = getOrchestratorMode()

  if (body.progressStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start (controller) {
        const write = (obj: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
        }
        try {
          const payload = mode === 'python'
            ? await runPythonOrchestrator(body, (label) => write({ type: 'progress', label }))
            : await runAiSearchPostHandler(event, {
                body,
                onActivityLine: (label) => write({ type: 'progress', label })
              })
          if (mode === 'hybrid') {
            write({ type: 'progress', label: 'python_orchestrator_shadow' })
            runPythonShadow(body)
          }
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

  if (mode === 'python') {
    return runPythonOrchestrator(body)
  }

  const payload = await runAiSearchPostHandler(event, { body })
  if (mode === 'hybrid') {
    runPythonShadow(body)
  }
  return payload
})
