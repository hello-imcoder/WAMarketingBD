# AGENT.md — AI Agent Behavior Contract

> This file governs how any AI coding agent working on this repository must behave.
> Read it in full before touching any file. It supplements — never overrides — `REQUIREMENT.md`.

---

## 1. First actions every session

1. Read `REQUIREMENT.md` in full — it is the single source of truth.
2. Read `DESIGN.md` in full — it defines colors, fonts, and theme. **Never regenerate or overwrite it.**
3. Read `PROGRESS.md` and note the last signed entry so you know exactly where work left off.
4. Check `SECRETS.md` if you need to interact with the database or external services — but **never print, log, or commit any value from it**.

---

## 2. Monorepo structure

Follow the folder tree in `REQUIREMENT.md §3` exactly. Key rules:

- All app code lives in `apps/web/src/`.
- All shared TypeScript types and Zod schemas live in `packages/shared-types/`.
- Supabase migrations live in `supabase/migrations/` — numbered SQL files, never hand-edited after applied.
- Edge Functions live in `supabase/functions/<function-name>/index.ts` — each is self-contained (no workspace imports at deploy time).
- Scripts run via `pnpm dlx tsx scripts/<file>.ts` — no extra root dependency needed.

---

## 3. Database access

Direct Postgres access is used in this project (no Supabase CLI required for DB work).

- Connection string is in `SECRETS.md` under `POSTGRES_CONNECTION_STRING`.
- Use `psql "$POSTGRES_CONNECTION_STRING"` or a direct Postgres client to run migrations and schema changes.
- Never embed the connection string in any committed file. Never use it in client-side code.
- The Supabase service-role key (also in `SECRETS.md`) is for Edge Function secrets and admin SDK calls only — never shipped to the browser.

---

## 4. What never gets committed

| File | Reason |
|---|---|
| `SECRETS.md` | Contains all real credentials |
| `PROGRESS.md` | Internal work log — gitignored by design |
| `apps/web/.env.local` | Local runtime secrets |
| Any `.env` variant except `.env.example` | Contains real values |

Verify `.gitignore` excludes all of the above before every commit. If `git status` shows any of these tracked, fix `.gitignore` before proceeding.

---

## 5. Tech-stack constraints

These are fixed — do not substitute or add libraries without flagging in the session:

| Layer | Choice |
|---|---|
| Frontend | Vite 7 + React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4, CSS-first `@theme` in `src/index.css` |
| Backend | Supabase Cloud — Postgres + Auth + Edge Functions (Deno) |
| Media | Cloudinary (unsigned upload preset) |
| Hosting | Vercel |
| Router | React Router v7 |
| State | Zustand v5 |
| Validation | Zod v4 (dual: client + Edge Functions) |
| i18n | i18next + react-i18next |
| Font | Inter Variable (`@fontsource-variable/inter`), weights 460/540/600 |

---

## 6. Code quality rules

- **TypeScript strict mode everywhere** — `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`. Zero `any` types — use `unknown` + type guards instead.
- **No hardcoded UI strings** — all user-facing text goes through `t()` from react-i18next so Bangla/English stay in sync.
- **Money logic server-side only** — withdrawal approval, P2P transfers, submission verification, and user ban all run in Edge Functions. Never execute these in client JS.
- **RLS on every table** — users read/write only their own rows; `su_admin` role gating checked server-side.
- **Input validation dual-layer** — Zod schemas in `packages/shared-types` for the client; Edge Functions validate independently (they keep local copies of relevant schemas).
- **Code splitting** — `/rexio-admin` route must be a separate lazy chunk, never bundled with user/public code.
- **`/rexio-admin` noindex** — the admin layout must include `<meta name="robots" content="noindex,nofollow" />` at the layout level, not just in `robots.txt`.

---

## 7. Out of scope for v1 — do not implement

- AI/ML screenshot verification
- Generic multi-task-type schema (WhatsApp-send only)
- Admin 2FA / multiple admin-staff roles
- P2P transfer fees or limits

---

## 8. After every work session

Append a signed entry to `PROGRESS.md` in this format:

```
### YYYY-MM-DD HH:MM — <AI model name> (<agent name>)
- What was implemented or changed
- Next: what comes next
```

Update the milestone checkbox (`[ ]` → `[x]`) for any completed milestone.

---

## 9. Operational notes (Milestone 2+)

### Rate limiting — opportunistic inline cleanup (no pg_cron)
`pg_cron` is not enabled on this Supabase project. The `rate_limit_counters` table is cleaned
up **inline** by every Edge Function that reads it — before doing its own counter read/write,
run this batch delete:

```sql
DELETE FROM rate_limit_counters
WHERE expires_at < NOW()
AND ctid IN (
  SELECT ctid FROM rate_limit_counters WHERE expires_at < NOW() LIMIT 50
);
```

This bounds table growth without a background job at the cost of a small extra query per
rate-limited call. Maximum 50 rows deleted per invocation. Document this in each affected
Edge Function's implementation comment (Milestone 11).

Rate-limit key format: `'<action>:<dimension>:<value>'`
- `'login:ip:<ip_address>'`
- `'submit:user:<user_uuid>'`
- `'p2p:user:<user_uuid>'`
- `'withdraw:user:<user_uuid>'`

---

## 10. Deviation policy

If something in `REQUIREMENT.md` or `DESIGN.md` is ambiguous, conflicting, or needs a decision:

1. Flag it in the session output before acting.
2. If the decision changes architecture (new library, schema shape, route structure), stop and wait for owner approval.
3. Small, obviously correct decisions (import order, file naming within conventions) can proceed without asking — note them in the `PROGRESS.md` entry.
