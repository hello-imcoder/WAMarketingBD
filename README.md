# WA Marketing BD

> Organic WhatsApp-marketing microjob web app — built by **SpritexAI**.

<!-- Logo will be added at Milestone 4 once AI-generated assets are complete -->

---

## Overview

WA Marketing BD lets an admin publish tasks (send a specific WhatsApp message to a specific number); users complete tasks manually, submit screenshot proof, and earn withdrawable money via Bangladeshi Mobile Financial Services (bKash, Nagad, Rocket, Upay).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite 7 + React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Backend / DB | Supabase Cloud — Postgres + Auth + Edge Functions |
| Media | Cloudinary (unsigned upload preset) |
| Hosting | Vercel |
| Monorepo | pnpm workspaces |

---

## Monorepo Structure

```
WAMarketingBD/
├── apps/web/          # Vite + React app
├── packages/
│   ├── shared-types/  # Shared TypeScript types & Zod schemas
│   └── config/        # Shared tsconfig base
├── supabase/
│   ├── migrations/    # SQL migrations (applied via psql)
│   ├── functions/     # Supabase Edge Functions (Deno)
│   └── seed.sql
└── scripts/           # Dev utility scripts (tsx)
```

---

## Local Setup

### Prerequisites
- Node 22+ (use `.nvmrc` with `nvm use`)
- pnpm 10+ (`npm install -g pnpm`)

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Create local env file
cp .env.example apps/web/.env.local
# Fill in values from SECRETS.md (owner-maintained, gitignored)

# 3. Start dev server
pnpm dev

# 4. Type check
pnpm typecheck
```

### Database setup (Milestone 2+)
- Add `POSTGRES_CONNECTION_STRING` to `SECRETS.md`.
- Run migrations via `psql "$POSTGRES_CONNECTION_STRING" -f supabase/migrations/<file>.sql`.

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/reg` | Sign up |
| `/app` | User panel |
| `/app/task` | Task list & submit |
| `/app/p2p` | P2P transfer |
| `/app/wallet` | Wallet & withdrawal |
| `/app/history` | Activity history |
| `/app/settings` | Profile & support |
| `/rexio-admin` | Admin panel (noindex) |
| `/privacy-policy` | Privacy Policy |
| `/terms-of-service` | Terms of Service |

---

## License

MIT © SpritexAI — see [`LICENSE.md`](./LICENSE.md).

---

<!-- Screenshots section — to be added at Milestone 4 -->
