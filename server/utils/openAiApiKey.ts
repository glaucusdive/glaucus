/**
 * OpenAI key for server routes. Prefer runtimeConfig (NUXT_OPENAI_API_KEY), then
 * process.env so Netlify/serverless can supply OPENAI_API_KEY at runtime only
 * (Nuxt does not map OPENAI_API_KEY into runtimeConfig without the NUXT_ prefix).
 */
export function resolveOpenAiApiKey (fromRuntimeConfig: unknown): string {
  const cfg = typeof fromRuntimeConfig === 'string' ? fromRuntimeConfig.trim() : ''
  if (cfg) return cfg
  return String(process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '').trim()
}
