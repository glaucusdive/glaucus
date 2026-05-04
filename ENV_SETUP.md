# Environment Setup

## Supabase CLI (glaucus account)

This project uses the **glaucus** Supabase account. The `--profile glaucus` flag can trigger a CLI bug (`failed to read profile: Unsupported Config Type`), so use the workflow below instead.

**One-time: log in and link**
```bash
supabase login --name glaucus
# Complete browser/token flow for the glaucus account

supabase link --project-ref hyldglninkgngaweejmw
# Enter the project's database password when prompted
```
Do **not** pass `--profile glaucus` on link—it is not required and can cause the profile error.

**Push migrations**
```bash
supabase db push
```
Again, run without `--profile`.

**When switching from another account (e.g. mbp)**  
Run `supabase login --name glaucus` again so the glaucus token is active in this terminal, then run `link` / `db push` without any profile flag.

---

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: chat booking flow — when to prompt account creation (before_send | after_send | off)
# NUXT_PUBLIC_BOOKING_SIGNUP_TIMING=off

# OpenAI API (GPT-5.5) — NLU, search drafting, booking assistant, optional contact-reply classifier
# Get your API key from: https://platform.openai.com/api-keys
NUXT_OPENAI_API_KEY=your_openai_api_key_here
# Alternative env name (either works):
# OPENAI_API_KEY=your_openai_api_key_here

# Resend (booking emails to diveshops)
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxx
# Optional: verified sender (e.g. "Glaucus <bookings@yourdomain.com>"). If unset, uses Resend's onboarding domain.
# BOOKING_FROM_EMAIL=Glaucus <bookings@yourdomain.com>
```

## Getting an OpenAI API Key

1. Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in and create an API key
3. Add it to your `.env` as `NUXT_OPENAI_API_KEY` or `OPENAI_API_KEY`

## Cost Information

Chat NLU, search, and booking flows call **OpenAI** using model **`gpt-5.5`**. See current pricing on [OpenAI pricing](https://openai.com/api/pricing/). Typical conversation costs depend on message length and retries; keep keys server-side only.

Typical conversation costs are minimal (a few cents per search session) for short turns.

## Resend (booking emails)

1. Sign up at [resend.com](https://resend.com) and create an API key at [resend.com/api-keys](https://resend.com/api-keys).
2. Add `RESEND_API_KEY` to your `.env`.
3. For production, verify your domain at [resend.com/domains](https://resend.com/domains) and set `BOOKING_FROM_EMAIL` (e.g. `Glaucus <bookings@yourdomain.com>`). Without a verified domain, you can use the default `onboarding@resend.dev` for testing.

