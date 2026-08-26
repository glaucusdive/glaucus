# AGENTS.md — Glaucus Dive

AI-assisted scuba dive shop search and booking platform. Built with **Nuxt 4 + Vue 3**, deployed to **Netlify** via Nitro serverless functions, Supabase for auth/DB, OpenAI (GPT-5.5) for NLU/chat, Resend for booking emails.

## Developer Workflows

```bash
npm run dev       # Dev server at http://localhost:3000
npm run test      # Vitest unit tests (tests/**/*.test.ts)
npm run build     # Production build (Netlify preset)
npm run preview   # Preview production build locally
node scripts/build-version-history.js  # Regenerate version history in README.md
```

Supabase: `supabase login && supabase link && supabase db push`

## Architecture

**Nuxt 4 layout** — all frontend code lives under `app/` (not `src/`). Path aliases: `~` → `app/`, `~~` → project root.

**`shared/`** — TypeScript shared between client and server. No Nuxt-specific imports (`#imports`, `useRuntimeConfig`, etc.) allowed here. Key files:
- `guidedFlow.ts` — `GuidedSearchState` state machine type + chip tokens (the canonical search state shape echoed client↔server each turn)
- `tripRequirements.ts` — `TripRequirements` normalization/merging across NLU output, guided state, and booking cache
- `searchAiContract.ts` — NLU extraction interface (`destination`, `trip_product_type`, `certification`, etc.)

**`server/`** — Nitro serverless functions. Primary entry point: `server/api/guided-orchestrator.post.ts` delegates to `server/utils/runAiSearchPostHandler.ts`, which orchestrates NLU → search → booking state machine → course discovery in one handler. Supports NDJSON progress streaming when request body includes `progressStream: true`.

**`app/components/ui/`** — imported *without* path prefix (configured in `nuxt.config.ts` `components` array). Components outside `ui/` are imported with their folder prefix.

## Search/Booking Flow

Two search modes controlled by feature flags:
1. **Guided (default)** — `NUXT_PUBLIC_USE_GUIDED_SEARCH=true`: deterministic chip-driven rails via `/api/guided-flow`, no LLM for search routing. Steps: `choose_branch → destination → pick → results`.
2. **AI-first** — `NUXT_PUBLIC_AI_SEARCH_FIRST=true`: NLU extracts facets from free text, feeds into same Supabase query.

**Booking** is always LLM-assisted (unless `NUXT_PUBLIC_DISABLE_CHAT_AI=true`). Booking state is carried in `TripRequirements` and resolved through `resolveBookingTarget.ts`. Test mode (`NUXT_PUBLIC_TEST_MODE=true`) restricts booking emails to internal whitelist only.

## Feature Flags (`nuxt.config.ts` → `runtimeConfig.public`)

| Flag | Default | Effect |
|------|---------|--------|
| `useGuidedSearch` | `true` | Guided chip rails vs. LLM routing for search |
| `disableChatAi` | `false` | Skip all OpenAI calls (chip-only mode) |
| `aiSearchFirst` | `false` | Pre-booking uses orchestrator NLU instead of chip-first guided-flow |
| `testMode` | `true` (dev) | Amber shell, booking whitelist, Step back button |

## Testing Conventions

Tests live in `tests/` grouped by domain: `app/`, `booking/`, `blog/`, `guided/`, `server/`, `shared/`. Tests are **pure unit tests** — no Nuxt test utilities, no component mounting. Import shared utilities directly. Path aliases `~~` and `~` work via `vitest.config.ts`.

## Design System

See `docs/design.md` for the full reference. Key rules:
- **Dark mode**: class-based (`dark` on `<html>`). Both modes are first-class.
- **Color palette**: Tailwind **zinc** scale semantically. Accent gradient (`#02C8FF` / `#FF00F6`) used sparingly via `.animate-ring-gradient` in `main.css`.
- **Components**: Use **Nuxt UI** (`UButton`, `UInput`, etc.) inside the app shell. Landing/marketing sections use bespoke components in `app/components/landing/`.
- **New brand colors**: add to `docs/design.md` before scattering hex across components.

## Versioning

`MAJOR.MINOR.PATCH` — patch for fixes/polish, minor for new user-visible capability, major for breaking changes. One commit = one version. Version history is maintained at the bottom of `README.md`; regenerate with `node scripts/build-version-history.js`.

## Key Integration Points

- **Supabase**: client via `useSupabase()` composable (`app/composables/useSupabase.ts`); service-role key (`NUXT_SUPABASE_SERVICE_ROLE_KEY`) used only server-side for admin writes.
- **OpenAI**: key resolved via `server/utils/openAiApiKey.ts` (checks `NUXT_OPENAI_API_KEY` then `OPENAI_API_KEY`).
- **Resend**: booking confirmation + shop notification emails in `server/api/booking.post.ts`.
- **Linear**: feedback issues created via `NUXT_LINEAR_API_KEY` in `server/api/feedback.post.ts`.
- **PostHog + GA4**: analytics enabled only on prod (`NUXT_PUBLIC_POSTHOG_ENABLED=true`, `NUXT_PUBLIC_GA4_ENABLED=true`).

