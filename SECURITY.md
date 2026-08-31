# SECURITY.md — Security Requirements & Operational Rules

> Operational form of `REQUIREMENT.md §12`. Every AI agent and human developer
> working on this repository must read and follow these rules.

---

## 1. Money-moving logic is server-side only

The following actions **must never execute in client-side JavaScript**:

| Action | Edge Function |
|---|---|
| Withdrawal approval / processing | `process-withdrawal` |
| P2P transfer execution | `process-p2p-transfer` |
| Task submission verification / approval | `verify-submission` |
| User ban / suspend | (admin action via service-role API in Edge Function) |

If you find any of this logic in `apps/web/src/`, that is a security defect — open a bug immediately.

---

## 2. Supabase Row Level Security (RLS)

- RLS is enabled and enforced on **every table** — no exceptions.
- Users may only read and write their own rows (filtered by `auth.uid()`).
- Admin-only tables and actions are gated by the `su_admin` role, checked **server-side** in Edge Functions using the Supabase service-role client.
- **Never trust a client-supplied role claim.** The browser sends a JWT; Edge Functions verify it against Supabase Auth — they do not read a role from the request body.

---

## 3. Secret key handling

| Key | Where it lives | Where it must NEVER go |
|---|---|---|
| `SUPABASE_ANON_KEY` | `.env.example` (name only), `SECRETS.md`, `apps/web/.env.local`, Vercel env | Server-side code, git history |
| `SUPABASE_SERVICE_ROLE_KEY` | `SECRETS.md`, Supabase Edge Function secrets, Vercel env (server-only) | Browser bundle, any committed file |
| `POSTGRES_CONNECTION_STRING` | `SECRETS.md` only | Any committed file, any deployed code |
| `CLOUDINARY_API_SECRET` | `SECRETS.md`, Vercel env (if needed) | Browser bundle — anon upload preset is used instead |

The service-role key and Postgres connection string must **never** be prefixed with `VITE_` — that prefix causes Vite to embed values into the browser bundle at build time.

---

## 4. Rate limiting

Sensitive endpoints must be rate-limited at the Edge Function level (no OTP gate exists to absorb abuse):

- Login attempts — enforce via IP-based counters stored in a Postgres table (Edge Function instances share no in-memory state on free tier).
- Task submission — prevent spam submissions per user per task.
- P2P transfers — limit request frequency per user.
- Withdrawal requests — limit per user per time window.

---

## 5. Input validation — dual layer required

For any money-related or auth-related field:

1. **Client side:** validate with Zod schema from `packages/shared-types` before sending the request.
2. **Server side (Edge Function):** re-validate independently — never trust client-validated data alone.

This applies to: withdrawal amount, P2P transfer amount, task submission fields, signup phone/password.

---

## 6. Fraud signals (surfaced to admin, not automated decisions)

Per `REQUIREMENT.md §8`, fully automatic screenshot verification is out of scope for v1. The following signals are logged and surfaced in the admin submission review UI:

- WhatsApp deep-link click timestamp (soft signal user opened the chat).
- SHA-256 hash of uploaded screenshot (detect duplicate/reused images across submissions).
- IP address logged on every submission (detect multi-accounting patterns).
- Device fingerprint logged on every submission (same purpose).

**These are signals for admin judgment — the system never auto-approves or auto-rejects based on them.**

---

## 7. Admin panel hardening

The admin panel (`/rexio-admin`) has no 2FA (explicit client decision). Compensating controls:

- Strong password requirement enforced at signup and password-change.
- Supabase Auth built-in security (hashed passwords, short-lived session tokens, PKCE flow).
- Admin route must have `<meta name="robots" content="noindex,nofollow" />` **and** `robots.txt` `Disallow: /rexio-admin` — both required.
- Admin route access is checked server-side by verifying the `su_admin` role in the Supabase JWT — a client-supplied role claim is never trusted.

---

## 8. Responsible disclosure

If you discover a security vulnerability in WA Marketing BD:

- **Do not** open a public GitHub issue.
- Contact the project owner (SpritexAI) directly with a description of the vulnerability and steps to reproduce.
- Allow reasonable time for a fix before any public disclosure.

---

## 9. Audit checklist (run before each production deploy)

- [ ] No `VITE_SERVICE_ROLE` or `VITE_POSTGRES` prefixed env vars exist anywhere.
- [ ] RLS is enabled on all tables — verify with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` and cross-check against RLS policies.
- [ ] All Edge Functions re-validate inputs with Zod before touching the DB.
- [ ] `/rexio-admin` route returns `noindex,nofollow` meta in rendered HTML.
- [ ] `robots.txt` disallows `/rexio-admin`.
- [ ] Screenshot hash deduplication logic is active in `verify-submission`.
- [ ] Rate-limit counters table exists and is referenced by login / submission / P2P functions.
