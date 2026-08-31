#!/usr/bin/env -S pnpm dlx tsx
// scripts/generate-icons.ts
// Generates favicon.ico, favicon.svg, og-image.png, and src/assets/logo/*.
// Run: pnpm dlx tsx scripts/generate-icons.ts
//
// TODO (Milestone 4):
//   - Design and generate the WA Marketing BD logo (original, AI-agent-generated).
//   - Output: apps/web/public/favicon.ico
//             apps/web/public/favicon.svg
//             apps/web/public/og-image.png  (1200×630px)
//             apps/web/src/assets/logo/logo.svg
//             apps/web/src/assets/logo/logo-dark.svg  (for use on dark hero backgrounds)
//
//   Design constraints from DESIGN.md:
//   - Primary color: #1b1938 (indigo navy)
//   - Accent: #c9b4fa (surface-violet-soft)
//   - Teal: #0e3030 (for closing CTA band variant if needed)
//   - Typography: Inter Variable at weight 540
//   - The brand reads editorial and human — not typical SaaS clip-art.
//
//   Suggested approach: generate SVG programmatically, then convert to PNG/ICO
//   using a Deno-compatible or Node rasterization library.

console.log("generate-icons: TODO — implement at Milestone 4");
