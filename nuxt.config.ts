// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'netlify'
  },
  runtimeConfig: {
    // Private keys - only available server-side
    openrouterApiKey: process.env.NUXT_OPENROUTER_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    /** From address for booking emails (e.g. "Glaucus <bookings@yourdomain.com>"). Defaults to Resend onboarding domain if unset. */
    bookingFromEmail: process.env.BOOKING_FROM_EMAIL || 'Glaucus <onboarding@resend.dev>',
    /** Required for geocode-shop API to update diveshops (bypasses RLS). Get from Supabase Dashboard > Project Settings > API. */
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    /** Linear personal API key (Settings → API). Used by /api/feedback to create issues. */
    linearApiKey: process.env.NUXT_LINEAR_API_KEY,
    /** Linear team UUID (e.g. Glaucus team). */
    linearTeamId: process.env.NUXT_LINEAR_TEAM_ID,
    /** Linear workflow state UUID for “User Feedback” status. */
    linearFeedbackStateId: process.env.NUXT_LINEAR_FEEDBACK_STATE_ID,

    // Public keys - available both client and server-side
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})

