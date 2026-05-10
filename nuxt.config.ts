// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'netlify'
  },
  runtimeConfig: {
    // Private keys — empty defaults so secrets are not baked into the Nitro bundle (Netlify secrets scan).
    // Nuxt merges NUXT_* env at server runtime; booking/geocode also read RESEND_* / SUPABASE_* fallbacks.
    /** OpenAI API key for GPT-5.5 (NLU, search, booking chat). Set `NUXT_OPENAI_API_KEY` in env. */
    openaiApiKey: process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    resendApiKey: '',
    /** From address for booking emails (e.g. "Glaucus <bookings@yourdomain.com>"). Defaults to Resend onboarding domain if unset. */
    bookingFromEmail: process.env.BOOKING_FROM_EMAIL || 'Glaucus <onboarding@resend.dev>',
    /** Required for geocode-shop API to update diveshops (bypasses RLS). Get from Supabase Dashboard > Project Settings > API. */
    supabaseServiceRoleKey: '',
    /** Linear personal API key (Settings → API). Used by /api/feedback to create issues. */
    linearApiKey: '',
    /** Linear team UUID (e.g. Glaucus team). */
    linearTeamId: '',
    /** Linear workflow state UUID for “User Feedback” status. */
    linearFeedbackStateId: '',

    // Public keys - available both client and server-side
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      /** before_send | after_send | off — when to prompt account creation in chat booking flow */
      bookingSignupTiming: process.env.NUXT_PUBLIC_BOOKING_SIGNUP_TIMING || 'off',
      /**
       * When not 'false', chat search uses deterministic guided rails (/api/guided-flow) instead of LLM routing.
       * POST /api/ai-search and POST /api/ai-search-stream return 410; JSON turns use /api/guided-orchestrator only.
       */
      useGuidedSearch: process.env.NUXT_PUBLIC_USE_GUIDED_SEARCH ?? 'true',
      /**
       * When 'true', guided-orchestrator skips NLU + all GPT-5.5 calls (search + booking LLM).
       * Default: off in development (so AI features work locally), on in production unless you set the env var.
       * Set NUXT_PUBLIC_DISABLE_CHAT_AI=true in prod if you want chip-only / no model spend.
       */
      disableChatAi:
        process.env.NUXT_PUBLIC_DISABLE_CHAT_AI ??
        (process.env.NODE_ENV === 'production' ? 'true' : 'false'),
      /**
       * When 'true', pre-booking search uses the orchestrator (NLU + search LLM) instead of chip-first /api/guided-flow.
       * Requires NUXT_PUBLIC_DISABLE_CHAT_AI=false and `NUXT_OPENAI_API_KEY`. Default: false (guided remains primary).
       */
      aiSearchFirst: process.env.NUXT_PUBLIC_AI_SEARCH_FIRST ?? 'false',
      /**
       * Test mode: amber inset on the shell, booking whitelist (Dive Porter / Dive Shash only),
       * dive shop Live/Demo toggle, chat “Step back”. Flip to `false` to turn off.
       * Deploys can set `NUXT_PUBLIC_TEST_MODE` without editing this file (string `true` / `false`).
       */
      testMode: true
    }
  }
})

