NLU = Natural Language Understanding.
In your project, NLU is the step that takes a free-form user message (like “find me cave diving in Mexico”) and converts it into structured fields your app can route on.

Core AI Utilities (server/utils/)
File
Role
server/utils/openAiApiKey.ts
Key resolver — checks NUXT_OPENAI_API_KEY then OPENAI_API_KEY
server/utils/openAiChatModel.ts
Defines the model name and OPENAI_CHAT_COMPLETIONS_URL constant used by all callers
server/utils/openAiStreamSearchFirst.ts
Streaming Chat Completions call — accumulates SSE chunks into full assistant text (used for AI-first search)
server/utils/interpretUserTurn.ts
NLU extraction — sends user message + history to GPT-5.5, returns structured SearchAiContract facets (destination, trip_product_type, certification, etc.)
server/utils/bookingContactReplyClassifier.ts
Classifies a user's booking reply (e.g. "yes", "change dates") via a targeted GPT call to decide next booking step
server/utils/tripTypeSearchPipeline.ts
Search pipeline — calls GPT-5.5 twice: once to draft Supabase filter parameters, once to narrate search results; also triggers course discovery
server/utils/runAiSearchPostHandler.ts
Main orchestrator — resolves the API key, gates all AI calls behind disableChatAi, wires together NLU → search → booking assistant in one handler; also contains inline booking chat completion calls
server/utils/formatSearchActivityLog.ts
Formats progress lines for streaming (labels the NLU step as "OpenAI GPT-5.5 JSON NLU")
API Entry Point (server/api/)
File
Role
server/api/guided-orchestrator.post.ts
HTTP entry point — delegates to runAiSearchPostHandler; adds NDJSON streaming wrapper when progressStream: true
Tests
File
Role
tests/server/openAiChat.live.test.ts
Live integration test for the chat init call — skipped automatically if OPENAI_API_KEY is not set
Config
File
Role
nuxt.config.ts
Declares openaiApiKey in private runtimeConfig (empty default so key isn't baked at build time)
supabase/config.toml
openai_api_key = "env(OPENAI_API_KEY)" — used only by Supabase Studio, not by app code
 
Call chain summary:
guided-orchestrator.post.ts → runAiSearchPostHandler.ts → interpretUserTurn.ts (NLU) → tripTypeSearchPipeline.ts (search + narration) + bookingContactReplyClassifier.ts (booking routing) + openAiStreamSearchFirst.ts (AI-first stream path)