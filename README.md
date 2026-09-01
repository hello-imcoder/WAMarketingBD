# WA Marketing BD

<p align="left">
  <img src="apps/web/src/assets/logo/logo.svg" alt="WA Marketing BD logo" width="220" />
</p>

> Organic WhatsApp-marketing microjob web app — built by **SpritexAI**.

**Live:** https://wa-marketing-bd.vercel.app

---

## Overview

WA Marketing BD is an organic WhatsApp-marketing microjob platform for Bangladesh. The admin creates tasks — send a specific WhatsApp message to a specific number. Users complete tasks manually via WhatsApp, submit screenshot proof, and earn withdrawable money paid out through Bangladeshi Mobile Financial Services (bKash, Nagad, Rocket, Upay).

Key flows:

- **Auth** — phone-number + password signup (phone is converted to a synthesized email), onboarding, settings.
- **Tasks** — browse active tasks, open the WhatsApp deep link, upload proof via Cloudinary, submit.
- **Wallet & withdrawals** — verified/total balances, withdrawal requests to MFS accounts, admin approval.
- **P2P transfers** — user-to-user balance transfers (atomic, DB-enforced).
- **Referrals** — 8-char referral codes; referrer earns a bonus when the referred user submits their first task.
- **History** — unified feed of tasks, referrals, P2P, and withdrawals.
- **Support tickets** — threaded user ↔ admin conversations.
- **Admin panel** (`/rexio-admin`, noindex) — task management, submission review, withdrawal review, user management (ban/suspend), support responses.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 19 + TypeScript 5 (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| Styling | Tailwind CSS v4 — CSS-first, design tokens in `@theme` (no `tailwind.config.ts`) |
| Font | Inter Variable, self-hosted (`@fontsource-variable/inter`) |
| Router | React Router v7 (lazy route chunks) |
| State | Zustand v5 |
| Validation | Zod v4 — dual-layer (client + Edge Functions) |
| i18n | i18next + react-i18next (English / বাংলা) |
| Backend | Supabase Cloud — Postgres 17 + Auth (GoTrue) + RLS |
| Server logic | Supabase Edge Functions (Deno) — all money-moving operations |
| Media | Cloudinary — unsigned upload preset, browser-direct |
| Hosting | Vercel |

---

## Monorepo Structure

```
WAMarketingBD/
├── apps/web/                     # Vite + React app (the product)
│   ├── public/                   # favicon, og-image, robots.txt, llms.txt, sitemap.xml
│   └── src/
│       ├── assets/logo/          # logo.svg / logo-dark.svg (generated)
│       ├── components/
│       │   ├── auth/             # AuthInputField, RequireAuth, RequireAdmin
│       │   ├── landing/          # hero, how-it-works, features, FAQ, footer
│       │   ├── ui/               # Logo
│       │   └── user/             # TaskCard, WithdrawalForm, ReferralCard, SupportSection
│       ├── hooks/                # useTasks, useWallet, useHistory, useSupport,
│       │                         # useReferrals, useAdmin* (5)
│       ├── i18n/locales/         # en.json / bn.json
│       ├── layouts/              # AppLayout, AdminLayout (noindex)
│       ├── lib/                  # supabase, seo, validators, cloudinary, fingerprint,
│       │                         # edgeFunctions
│       ├── pages/
│       │   ├── landing/         # "/"
│       │   ├── auth/             # /login, /reg, /onboarding
│       │   ├── app/              # /app — task, p2p, wallet, history, settings
│       │   └── rexio-admin/      # /rexio-admin — 7 admin pages
│       ├── stores/               # authStore (Zustand)
│       └── routes.tsx
├── packages/
│   ├── shared-types/             # DB row types, Zod schemas, constants, validators
│   └── config/                   # shared tsconfig base
├── supabase/
│   ├── migrations/               # 0001–0019 SQL migrations (applied via psql)
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── create-submission/    # rate-limited submission intake
│   │   ├── verify-submission/    # admin approve/reject (DB fn 0017)
│   │   ├── process-withdrawal/   # admin withdrawal review (DB fn 0018)
│   │   ├── process-p2p-transfer/ # lookup + atomic transfer (DB fn 0015)
│   │   ├── admin-update-user/    # ban/suspend/role changes
│   │   ├── generate-referral-code/
│   │   └── og-image-generator/
│   └── seed.sql                  # site_settings (min withdrawal, referral bonus)
└── scripts/
    ├── generate-icons.ts         # logo/favicon/og-image generator
    ├── generate-sitemap.ts       # sitemap.xml + robots.txt Sitemap line
    └── bootstrap-admin.ts        # one-off su_admin creation (Admin API)
```

---

## Local Setup

### Prerequisites

- **Node.js ≥ 22** (`.nvmrc` — `nvm use`)
- **pnpm ≥ 10** (`npm install -g pnpm`)

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Create the local env file (gitignored)
cp .env.example apps/web/.env.local
#    Fill real values from SECRETS.md (owner-maintained, gitignored):
#    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CLOUDINARY_*,
#    VITE_SITE_URL (https://wa-marketing-bd.vercel.app)

# 3. Start the dev server (http://localhost:5173)
pnpm dev

# 4. Type check (strict, zero-error policy)
pnpm typecheck

# 5. Production build
pnpm build
```

### Database

Migrations are plain SQL applied directly with `psql` (no Supabase CLI):

```bash
psql "$POSTGRES_CONNECTION_STRING" -f supabase/migrations/0001_enums.sql
# …through 0019, in order
```

`POSTGRES_CONNECTION_STRING` lives in `SECRETS.md` (gitignored). All 19 migrations + `seed.sql` are already applied to the production Supabase project.

### First admin user

Run the one-off bootstrap script (reads credentials from `SECRETS.md`):

```bash
pnpm dlx tsx scripts/bootstrap-admin.ts
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page (marketing) |
| `/login` | Login |
| `/reg` | Sign up (supports `?ref=CODE`) |
| `/onboarding` | Name collection (first login) |
| `/app` | User panel |
| `/app/task` | Task list, detail & submit |
| `/app/p2p` | P2P transfer |
| `/app/wallet` | Balances, withdrawal, referral card |
| `/app/history` | All / Task / Referral / P2P / Withdrawal feed |
| `/app/settings` | Profile, password, support tickets |
| `/rexio-admin` | Admin panel (noindex, `su_admin` only) |
| `/privacy-policy` | Privacy Policy |
| `/terms-of-service` | Terms of Service |

---

## Security Model (summary)

- All money-moving logic (withdrawals, P2P, submission approval, user bans) runs in Edge Functions / SECURITY DEFINER DB functions with the service-role key — never in client JS.
- RLS on every table; users read/write only their own rows.
- Zod validation on the client **and** independently in every Edge Function.
- The browser only ever holds the anon key.
- `/rexio-admin` is `noindex,nofollow` at the layout level and excluded from the sitemap.

Full details: [`SECURITY.md`](./SECURITY.md) · Requirements: [`REQUIREMENT.md`](./REQUIREMENT.md)

---

## Screenshots

<!-- Owner: add live screenshots here once the app is deployed at
     https://wa-marketing-bd.vercel.app (landing, task submit, wallet, admin).
     As of this writing DNS is not yet pointed — placeholder intentionally left. -->

_Live screenshots to be added after deployment._

---

## License

MIT © SpritexAI — see [`LICENSE.md`](./LICENSE.md).
