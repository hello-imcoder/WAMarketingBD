# CLAUDE.md — Claude Working Notes

> Claude-specific session context for working on WA Marketing BD.
> Read `REQUIREMENT.md` and `DESIGN.md` first every session. Then check `PROGRESS.md`.

---

## Project summary

**WA Marketing BD** — organic WhatsApp-marketing microjob web app. Admin creates tasks (send a specific WhatsApp message to a specific number); users complete tasks manually, submit proof, and earn withdrawable money via Bangladeshi MFS (bKash/Nagad/Rocket/Upay).

- Client project, built by **SpritexAI**.
- Full spec: [`REQUIREMENT.md`](./REQUIREMENT.md) — single source of truth.
- Visual system: [`DESIGN.md`](./DESIGN.md) — read-only, never regenerate.

---

## Tech stack quick reference

| | |
|---|---|
| Frontend | Vite 7 + React 19 + TypeScript 5 |
| Styling | **Tailwind CSS v4, CSS-first** — tokens in `apps/web/src/index.css` via `@theme` |
| Router | React Router v7 — `routes.tsx`, `lazy()` per route |
| State | Zustand v5 — stores in `apps/web/src/stores/` |
| Validation | Zod v4 — schemas in `packages/shared-types/src/schemas.ts` |
| i18n | i18next + react-i18next — catalogues in `apps/web/src/i18n/locales/` |
| Font | Inter Variable via `@fontsource-variable/inter` |
| Backend | Supabase Cloud — Postgres + Auth + Edge Functions (Deno) |
| Media | Cloudinary — unsigned upload preset, browser uploads directly |
| Hosting | Vercel |

---

## Coding conventions

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true` — enforced via `packages/config/tsconfig.base.json`.
- Zero `any`. Use `unknown` + type guards. Prefer explicit return types on exported functions.
- Path alias: `@/*` maps to `apps/web/src/*`. Use it everywhere inside `apps/web`.
- Shared DB types and Zod schemas live in `packages/shared-types` — import from there in the app.

### Tailwind CSS v4 — CSS-first approach
- **No `tailwind.config.ts`** — this project uses the v4 CSS-first approach.
- All design tokens live in `apps/web/src/index.css` under `@theme { … }`.
- Token naming follows `DESIGN.md` exactly: `--color-primary`, `--color-ink`, `--font-size-display-xxl`, `--spacing-huge`, etc.
- Use `font-variation-settings: "wght" 540` (or 460/600) for Inter Variable — the brand's typographic signature.
- Never introduce a fourth canvas color beyond indigo/white/teal (see `DESIGN.md` Do's and Don'ts).

### Font loading
- Inter Variable is self-hosted via `@fontsource-variable/inter` — **no Google Fonts CDN**.
- Import in `src/index.css` before the `@theme` block.
- Use sub-default weights 460/540/600 via `font-variation-settings` — not `font-weight` integer shortcuts.

### File and folder naming
- Folders: `kebab-case`
- React components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Stores: `xxxStore.ts`
- Utilities/lib: `camelCase.ts`
- i18n keys: `snake_case` (e.g., `task_submit_button`)

### i18n
- Every user-facing string goes through `t('key')` — no hardcoded English or Bangla in JSX.
- Both `en.json` and `bn.json` must be updated together.

### Security rules (enforced in code)
- Money-moving logic (withdrawal, P2P, submission approval) runs in Edge Functions only.
- Supabase browser client uses the anon key only — never the service-role key.
- `/rexio-admin` layout must include `<meta name="robots" content="noindex,nofollow" />`.
- Input validated client-side (Zod) AND server-side (Edge Function) — both layers required.

### Rate limiting (Milestone 11 guidance)
`pg_cron` is not enabled. Rate limiting uses `rate_limit_counters` table (DB-backed, since Edge
Functions share no in-memory state on free tier). Cleanup is **opportunistic inline**: each
rate-limiting Edge Function runs `DELETE FROM rate_limit_counters WHERE expires_at < NOW() LIMIT 50`
before its own read/write. See `AGENT.md §9` and `0011_rate_limit_counters.sql` for the full pattern.

---

## Local environment setup

1. Copy `.env.example` to `apps/web/.env.local`.
2. Fill values from `SECRETS.md` (which the project owner maintains locally — it is gitignored).
3. For database/migration work: use `POSTGRES_CONNECTION_STRING` from `SECRETS.md` with `psql` directly.
4. `pnpm install` at repo root installs all workspace dependencies.
5. `pnpm dev` starts the Vite dev server for `apps/web`.

---

## Session start checklist

- [ ] Read last entry in `PROGRESS.md` — know where previous session left off.
- [ ] Check which milestone is current (the first unchecked `[ ]` in `PROGRESS.md`).
- [ ] If DB work is needed, confirm `SECRETS.md` has `POSTGRES_CONNECTION_STRING` filled.
- [ ] Append a signed entry to `PROGRESS.md` when session ends.
