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
    openrouterApiKey: '',
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
       * When 'true', guided-orchestrator skips NLU + all OpenRouter (search + booking LLM).
       * Default: off in development (so AI features work locally), on in production unless you set the env var.
       * Set NUXT_PUBLIC_DISABLE_CHAT_AI=true in prod if you want chip-only / no OpenRouter spend.
       */
      disableChatAi:
        process.env.NUXT_PUBLIC_DISABLE_CHAT_AI ??
        (process.env.NODE_ENV === 'production' ? 'true' : 'false'),
      /**
       * When 'true', pre-booking search uses the orchestrator (NLU + search LLM) instead of chip-first /api/guided-flow.
       * Requires NUXT_PUBLIC_DISABLE_CHAT_AI=false and OpenRouter. Default: false (guided remains primary).
       */
      aiSearchFirst: process.env.NUXT_PUBLIC_AI_SEARCH_FIRST ?? 'false'
    }
  }
})

