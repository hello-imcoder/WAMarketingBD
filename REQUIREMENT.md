# WA Marketing BD — Requirement Document (PRD)

> This is the single source of truth for the AI coding agent(s) building this project.
> Anything not explicitly defined here should follow the spirit of these requirements —
> ask before assuming, when in doubt.

---

## 1. Project Overview

**WA Marketing BD** is an organic WhatsApp-marketing microjob web application.
Admin creates tasks (send a specific WhatsApp message to a specific number).
Users complete tasks manually via WhatsApp, submit proof, and earn money — withdrawable
via Bangladeshi Mobile Financial Services (MFS).

- **Client project** — deal confirmed, building for a client.
- **Company/builder:** SpritexAI
- **License:** MIT

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase Cloud (Free Tier) — Postgres + Auth + Edge Functions |
| Media storage | Cloudinary (Free Tier) — task screenshots |
| Hosting | Vercel |
| Repo structure | Monorepo (pnpm workspaces) |

---

## 3. Monorepo Structure

```
wa-marketing-bd/
├── AGENT.md
├── CLAUDE.md
├── DESIGN.md              # user-provided manually — do not overwrite
├── SECURITY.md
├── LICENSE.md              # MIT
├── PROGRESS.md             # gitignored — see §11
├── SECRETS.md              # gitignored — see §11
├── README.md
├── REQUIREMENT.md          # this file
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
│
├── apps/
│   └── web/
│       ├── public/
│       │   ├── favicon.ico / favicon.svg
│       │   ├── og-image.png
│       │   ├── robots.txt
│       │   ├── llms.txt
│       │   └── sitemap.xml
│       ├── src/
│       │   ├── assets/logo/
│       │   ├── pages/
│       │   │   ├── landing/          # "/"
│       │   │   ├── auth/             # "/login", "/reg"
│       │   │   ├── app/              # "/app" — user panel
│       │   │   └── rexio-admin/      # "/rexio-admin" — admin panel
│       │   ├── components/{ui,landing,user,admin}/
│       │   ├── layouts/
│       │   ├── hooks/
│       │   ├── lib/ (supabase.ts, seo.ts, validators.ts)
│       │   ├── stores/
│       │   ├── routes.tsx
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   └── functions/            # Edge Functions — all sensitive server-side logic
│       ├── verify-submission/
│       ├── process-withdrawal/
│       ├── process-p2p-transfer/
│       ├── generate-referral-code/
│       └── og-image-generator/
│
├── packages/
│   ├── shared-types/
│   └── config/
│
└── scripts/
    ├── generate-icons.ts      # agent-generated favicon/og/logo
    └── generate-sitemap.ts
```

---

## 4. Routes / Pages

| Route | Purpose |
|---|---|
| `/` | Landing page (marketing, multiple sub-sections/pages as needed) |
| `/login` | Login |
| `/reg` | Sign up |
| `/app` | User panel (protected) |
| `/app/task` | Task list & task detail/submit |
| `/app/p2p` | P2P transfer |
| `/app/wallet` | Wallet — balances, withdrawal request |
| `/app/history` | History — all logs |
| `/app/settings` | Settings (Profile section + Support section inside) |
| `/rexio-admin` | Admin panel (protected, `su_admin` role only) |
| `/privacy-policy` | Legal |
| `/terms-of-service` | Legal |

`/rexio-admin` must **never** be indexable or discoverable — see §9.

---

## 5. Authentication

- **Sign up:** phone number + password only.
- **Onboarding screen** (immediately after signup): collect `name` (required),
  `email` (optional).
- **No OTP verification.** Admin manually verifies account authenticity from the
  admin panel when needed.
- **Settings page:** user can change email, password, name.
- **Admin login:** single super-admin, identified by a `su_admin` role on the
  account. No 2FA (explicit decision). Still use Supabase's standard secure
  auth (hashed passwords, session tokens) — this is not optional.

---

## 6. User Panel (`/app`)

### 6.1 Bottom Mobile Navbar
Order: **Task → P2P → Wallet → History → Settings**

### 6.2 Task Flow
1. User browses available tasks. **Multiple tasks can be taken concurrently**
   (not locked to one at a time).
2. Each task shows: WhatsApp number, exact message to send, payout amount,
   expiry/deadline.
3. User can either:
   - Manually copy the number + message and send via WhatsApp, **or**
   - Tap a button that opens a `wa.me` deep link with the message
     pre-filled (`https://wa.me/<number>?text=<url-encoded-message>`).
4. User sends the message, takes a screenshot, returns to the task, and
   submits. **Screenshot attachment is optional.**
5. Submission goes to `pending`. Admin reviews and approves/rejects
   (see §7.2). Rejections must include a reason/note visible to the user.
6. Each task has an **expiry/deadline** — after which it can no longer be
   submitted against.

### 6.3 Wallet
- **Two balances:**
  - `balance_total` = verified + pending
  - `balance_verified` = confirmed/withdrawable
- Withdraw via **bKash, Nagad, Rocket, Upay**.
- Withdrawal requests go to `pending` status.
- **Minimum withdrawal amount is admin-configurable** from admin settings.

### 6.4 P2P Transfer
- Send money to another user via their **phone number**, from
  **verified balance only**.
- **No fee. No daily/max limit.**
- Before sending: show recipient's **name preview** for confirmation
  (prevents wrong-number transfers). User must confirm before the
  transfer executes.

### 6.5 Referral
- Every user has a referral code/link.
- **Bonus triggers when the referred user completes their first task**
  (not on signup, not on withdrawal).

### 6.6 History Page
Shows all of the user's own logs, filterable/tabbed by: **All, Task,
Referral, P2P, Withdrawal**.

### 6.7 Settings Page
Contains two sections:
- **Profile** — name, email, password change.
- **Support** — open/view support tickets.

### 6.8 Support
Simple ticket system: user opens a ticket (subject + message), can view
status/replies. Admin responds from `/rexio-admin`.

---

## 7. Admin Panel (`/rexio-admin`)

Single `su_admin` role. Full control:

### 7.1 Task Management
- Create/edit/pause tasks.
- Set payout amount per task.
- Set max number of users / max number of completions per task.
- Set task expiry/deadline.

### 7.2 Submission Review
- View pending submissions (with optional screenshot).
- Approve → moves amount from pending to `balance_verified`.
- Reject → **must attach a reason/note**, visible to the user.

### 7.3 Withdrawal Management
- View pending withdrawal requests.
- Manually review before marking as sent/completed.
- Configure the site-wide minimum withdrawal amount.

### 7.4 User Management
- View users, manually verify accounts.
- **Suspend/ban** users for fraud or suspicious activity.

### 7.5 Support
- View and respond to support tickets.

### 7.6 Fraud Signals (see §8) surfaced per-submission for admin's manual judgment.

---

## 8. Fraud Prevention & Screenshot Verification

**Important finding: fully automatic screenshot verification without AI/ML is
not reliably possible** — reading the number/message out of an image requires
OCR, which is itself a (lightweight) ML technique. Given the explicit
no-AI/ML constraint, the approach is:

- **Primary method: manual admin review** of each submission (with optional
  screenshot).
- **Supporting signals to reduce admin workload / catch obvious fraud:**
  - Log the WhatsApp deep-link click (timestamp + task) as a soft signal
    that the user actually opened the chat.
  - Hash uploaded screenshots (e.g. SHA-256) to detect duplicate/reused
    images across submissions.
  - **IP address / device fingerprint logging on every submission**, to
    catch multi-accounting and repeat abuse patterns.
- This is documented as a known limitation. If the project later allows
  OCR/ML, submission auto-verification can be revisited (out of scope for
  v1 per explicit instruction).

---

## 9. SEO / AEO Requirements

- Dynamic, per-page `<title>` and meta description (via `lib/seo.ts` helper).
- `favicon.ico`/`favicon.svg`, `og-image.png`, and the site **logo are
  AI-agent-generated** (best possible original design) — no stock/placeholder
  assets in the final build. Used consistently across the app and in
  `README.md`.
- `robots.txt` — must `Disallow: /rexio-admin`.
- `llms.txt` — present, describing the site for LLM crawlers.
- `sitemap.xml` (referred to as sitemap.txt in planning — implement as
  standard `sitemap.xml`, linked from `robots.txt`).
- **`/rexio-admin` must never be indexed or discoverable:**
  `robots.txt` disallow **and** a route-level `<meta name="robots"
  content="noindex,nofollow">` on the admin panel — both are required,
  neither alone is sufficient.
- `Privacy Policy` and `Terms of Service` pages, linked in footer, included
  in sitemap.

---

## 10. Internationalization

- UI supports **Bangla + English**, with a toggle.
- All user-facing strings must go through an i18n layer (no hardcoded
  copy) so both languages stay in sync.

---

## 11. Non-Functional Requirements

- **Fully responsive**: mobile-first (this is primarily a mobile-used app)
  but must also be desktop-friendly.
- **Skeleton loading**: every page/route transition shows a skeleton
  loading state instead of a blank screen or jarring re-render.
- **Performance**: Vite build, code-splitting per route (especially
  separating the admin bundle from the public/user bundle).

---

## 12. Security Requirements

- **All sensitive/money-moving logic runs server-side**, via Supabase Edge
  Functions — never trust or execute this logic in client-side JS:
  - Withdrawal approval/processing
  - P2P transfer execution
  - Task submission verification/approval
  - User ban/suspend
- **Supabase RLS (Row Level Security)** enabled and enforced on every table.
  Users can only read/write their own rows; admin-only tables/actions
  gated by the `su_admin` role, checked server-side (never trust a
  client-supplied role claim alone).
- **Service-role key / DB connection string never shipped to the browser
  bundle.** Lives only in `SECRETS.md` (gitignored) and server-side env
  vars (Vercel/Supabase project settings).
- Rate-limit sensitive endpoints (login attempts, submission spam, P2P
  transfers) at the Edge Function level, since there's no OTP gate on
  signup/login to lean on.
- Admin panel: no 2FA (explicit decision) — compensate with strong
  password requirements and Supabase's built-in auth security features
  (this is the one place in the whole app where a compromise is
  catastrophic, so this line item stays flagged even though 2FA itself
  was declined).
- Input validation on both client and server (never trust client-only
  validation for money-related fields).

---

## 13. Root Documentation Files

### 13.1 `AGENT.md` (agent should draft this)
Should define: how any AI coding agent working on this repo should behave —
read `REQUIREMENT.md` and `DESIGN.md` before starting, always update
`PROGRESS.md` (see §13.3) after a work session, never commit `SECRETS.md`
or `PROGRESS.md`, follow the monorepo structure in §3, ask before deviating
from this document.

### 13.2 `CLAUDE.md` (agent should draft this)
Claude-specific working notes: project summary (link to `REQUIREMENT.md`),
tech stack quick-reference, coding conventions (TypeScript strict mode,
Tailwind v4 usage patterns, file/folder naming), where to find
`SECRETS.md` for local env setup, reminder to check `PROGRESS.md` at the
start of every session.

### 13.3 `PROGRESS.md` (gitignored, never pushed)
- Drafted **in full at project start** (a plan of all major
  milestones/steps), then work proceeds according to it.
- Every AI agent/model that works on the project appends an entry when it
  makes changes, signed with: **AI model name + agent name + date/timestamp**.
  Example entry format:
  ```
  ### 2026-09-01 14:30 — Claude Sonnet 5 (Claude Code)
  - Implemented task submission flow (apps/web/src/pages/app/task)
  - Next: wire up Cloudinary upload
  ```

### 13.4 `SECRETS.md` (gitignored, never pushed)
- Holds all keys, Supabase DB connection URL, Cloudinary credentials, etc.
- AI agents read from this file to run SQL directly against the DB and to
  write local `.env` files.
- Never referenced or copied into any file that gets committed.

### 13.5 `DESIGN.md`
- **Provided manually by the project owner** (based on superhuman.com's
  design doc structure) — colors, fonts, theme. Agents must read and
  follow it; do not generate or overwrite it.

### 13.6 `SECURITY.md`
Document the points in §12 in agent-facing form, plus a responsible
disclosure note.

### 13.7 `README.md`
Written professionally: project overview, tech stack, setup instructions,
folder structure, screenshots, and the AI-agent-generated logo/icon used
throughout.

### 13.8 `LICENSE.md`
MIT License.

---

## 14. Out of Scope for v1 (explicitly deferred)

- AI/ML-based automatic screenshot verification.
- Generic multi-task-type system (v1 ships with WhatsApp-message-send tasks
  only — schema doesn't need to be generic yet).
- Admin 2FA / multiple admin-staff roles.
- P2P transfer fees or limits.

---

## 15. Build Order (for PROGRESS.md drafting)

Suggested high-level milestone order for the initial `PROGRESS.md` draft:
1. Monorepo scaffold + Supabase project + env/secrets wiring
2. DB schema + RLS policies (users, tasks, submissions, wallets,
   withdrawals, p2p_transfers, referrals, support_tickets)
3. Auth (signup/login, onboarding, settings)
4. Landing page + SEO/AEO assets (logo, favicon, og-image, robots/llms/sitemap)
5. User panel: task list/detail/submit flow + Cloudinary upload
6. Wallet + withdrawal request flow
7. P2P transfer flow
8. Referral system
9. History page
10. Support ticket system
11. Admin panel: task management, submission review, withdrawal review,
    user management, support
12. Bangla/English i18n pass
13. Responsive + skeleton loading polish
14. Security review pass against §12
15. README.md finalization
