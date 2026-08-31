#!/usr/bin/env -S pnpm dlx tsx
// scripts/generate-sitemap.ts
// Generates apps/web/public/sitemap.xml.
// Run: pnpm dlx tsx scripts/generate-sitemap.ts
//
// TODO (Milestone 4):
//   - Production domain must be set in SECRETS.md (VITE_SITE_URL) before running.
//   - Include all public routes: /, /login, /reg, /privacy-policy, /terms-of-service.
//   - Exclude: /rexio-admin, /app/*, /onboarding (not for search engines).
//   - Set <lastmod> from git commit date of the relevant page files.
//   - Set <changefreq> and <priority> per page type:
//       / → weekly, 1.0
//       /privacy-policy, /terms-of-service → monthly, 0.3
//       /login, /reg → monthly, 0.5
//   - Output: apps/web/public/sitemap.xml (linked from robots.txt).

console.log("generate-sitemap: TODO — implement at Milestone 4");
