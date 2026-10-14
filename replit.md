# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Atlas tab leaderboard depends on the **unofficial** WoS Atlas API (`api.wosatlas.com`), proxied through `GET /api/leaderboard` on the api-server. Data freshness is bounded by WoS Atlas's own refresh cadence; upstream contract changes surface as 502 (`UPSTREAM_SCHEMA_CHANGED`) rather than corrupt data. Player/state names render as plain text — no detail pages.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Authentication uses Replit-managed Clerk. Replit supplies production Clerk keys and `VITE_CLERK_PROXY_URL` at publish time; the browser passes that URL unconditionally to ClerkProvider. Do not hardcode a domain or add production-only gates. The API's canonical `/api/__clerk` proxy is mounted before body parsers. See `.local/skills/clerk-auth/references/setup-and-customization.md` and https://docs.replit.com/features/auth-and-identity/clerk-auth.
- `OWNER_EMAIL` is a private workspace/deployment secret. Do not commit its value to `.replit` or source. The API requires a server-verified matching email before permitting private routes; authentication must continue to expose the existing dashboard dataset.
- Preview auth verification does not prove published sign-in works. Verify production after publishing; keep existing deployment password protection until the owner explicitly asks to remove it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
