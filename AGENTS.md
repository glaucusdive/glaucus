# Agents

## Cursor Cloud specific instructions

### Overview

Glaucus is a scuba diving trip booking platform — a Nuxt 4 (Vue 3) SPA deployed on Netlify. The single Nuxt process serves both the Vue frontend and the Nitro server API routes (`/server/api/*`). There are no Docker containers, no local databases, and no separate backend services.

### Running the dev server

```bash
npm run dev          # starts on http://localhost:3000
```

### Building

```bash
npm run build        # Netlify preset; outputs to .netlify/
```

### Linting / Typechecking

No ESLint is configured. Use `npx nuxt typecheck` for TypeScript checking. Note: the codebase currently has pre-existing TS errors that do not block dev or build.

### Automated tests

No test framework or test files exist in the repo at this time.

### Required environment variables

See `ENV_SETUP.md` for full details. At minimum:

| Variable | Purpose | Required? |
|---|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (app crashes without it) |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes (app crashes without it) |
| `NUXT_OPENROUTER_API_KEY` | OpenRouter LLM key for AI chat search | Yes for AI chat; browse pages work without it |
| `RESEND_API_KEY` | Resend email API key for booking emails | Optional (only final booking send fails) |

Create a `.env` file at repo root with these values. Nuxt auto-loads `.env`.

### Key caveats

- The Nuxt dev server (port 3000) will return a 500 on the homepage if Supabase env vars are missing.
- The `npm run build` uses the `netlify` Nitro preset. The build output lands in `.netlify/`.
- `package-lock.json` is the lockfile — use `npm`, not pnpm/yarn.
- The `postinstall` script runs `nuxt prepare` which generates `.nuxt/` types.
