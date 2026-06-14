// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      style: [
        {
          id: 'glaucus-boot',
          innerHTML: `html,body{margin:0;background-color:#000;color:#fff}html:not(.glaucus-app-ready) #__nuxt{visibility:hidden}`
        }
      ]
    }
  },
  modules: ['@nuxt/ui', '@posthog/nuxt'],
  components: [
    {
      path: '~/components',
      ignore: ['**/ui/**'],
    },
    {
      path: '~/components/ui',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'netlify'
  },
  runtimeConfig: {
    // Private keys — empty defaults so secrets are not baked into the Nitro bundle (Netlify secrets scan).
    // Nuxt merges NUXT_* env at server runtime; booking/geocode also read RESEND_* / SUPABASE_* fallbacks.
    /**
     * OpenAI API key for GPT-5.5 (NLU, search, booking chat). Default empty so the
     * key is not baked at build time; set `NUXT_OPENAI_API_KEY` (or `OPENAI_API_KEY`
     * at function runtime — see `resolveOpenAiApiKey` in server code) on the host.
     */
    openaiApiKey: '',
    resendApiKey: '',
    /** From address for booking emails (e.g. "Glaucus <bookings@yourdomain.com>"). Defaults to Resend onboarding domain if unset. */
    bookingFromEmail: process.env.BOOKING_FROM_EMAIL || 'Glaucus <onboarding@resend.dev>',
    /** Comma-separated internal recipients for profile-default saves. */
    profileUpdateNotifyEmails: process.env.PROFILE_UPDATE_NOTIFY_EMAILS || 'rshashwat@gmail.com,general@madebyporter.com',
    /** Comma-separated internal recipients when a shop owner submits portal listing changes. */
    shopSubmissionNotifyEmails: process.env.SHOP_SUBMISSION_NOTIFY_EMAILS || 'chris@glaucusdive.com,shash@glaucusdive.com',
    /** Recipient for new dive shop listing inquiries from /for-businesses. */
    shopInquiryNotifyEmail: process.env.NUXT_SHOP_INQUIRY_NOTIFY_EMAIL || 'shash@glaucusdive.com',
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
       * Default: 'false' (same in dev and production) so deploys match local once `NUXT_OPENAI_API_KEY` is set.
       * Set NUXT_PUBLIC_DISABLE_CHAT_AI=true on a deploy to use chip-only / no model spend.
       */
      disableChatAi: process.env.NUXT_PUBLIC_DISABLE_CHAT_AI ?? 'false',
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
      /** Off when `NUXT_PUBLIC_TEST_MODE=false` at build (Netlify). Default on if unset. */
      testMode: process.env.NUXT_PUBLIC_TEST_MODE !== 'false',
      /** Set NUXT_PUBLIC_POSTHOG_ENABLED=true on Netlify prod only. */
      posthogEnabled: process.env.NUXT_PUBLIC_POSTHOG_ENABLED === 'true',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      /** Ingest host from PostHog project settings; set via NUXT_PUBLIC_POSTHOG_HOST (not hardcoded — Netlify secrets scan). */
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || '',
      /**
       * When `true`, tag events with test_mode (for dashboards that exclude test traffic).
       * Default off so KPI dashboards work while app test mode may still be on.
       */
      posthogMarkTestTraffic: process.env.NUXT_PUBLIC_POSTHOG_MARK_TEST_TRAFFIC === 'true'
    }
  },

  posthogConfig: {
    publicKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
    host: process.env.NUXT_PUBLIC_POSTHOG_HOST || '',
    clientConfig: {
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]'
      }
    }
  }
})

