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
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})

