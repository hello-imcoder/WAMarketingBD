#!/usr/bin/env -S pnpm dlx tsx
// scripts/generate-icons.ts
// Generates the WA Marketing BD brand assets — all programmatically (original,
// agent-designed from DESIGN.md tokens; no stock/placeholder assets):
//   apps/web/src/assets/logo/logo.svg       — badge glyph (indigo wordmark variant)
//   apps/web/src/assets/logo/logo-dark.svg  — badge glyph (light wordmark variant)
//   apps/web/public/favicon.svg             — badge only
//   apps/web/public/favicon.ico             — 32px PNG-in-ICO raster
//   apps/web/public/og-image.png            — 1200×630 social card
//
// Design tokens (DESIGN.md): primary #1b1938, primary-deep #0e0c1f,
// surface-violet-soft #c9b4fa, surface-teal-deep #0e3030, canvas #ffffff.
//
// Note: the in-app wordmark ("WA Marketing BD") is rendered as HTML text in
// components/ui/Logo.tsx so it uses the real Inter Variable font; the SVG badge
// is the standalone glyph used for favicon/og/app icon contexts.
// Run: pnpm dlx tsx scripts/generate-icons.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const WEB = join(import.meta.dirname, "..", "apps", "web");
const LOGO_DIR = join(WEB, "src", "assets", "logo");
const PUBLIC_DIR = join(WEB, "public");

// ─── Badge glyph ──────────────────────────────────────────────────────────────
// A rounded-square indigo badge containing a violet-soft speech bubble with
// three message dots — the "send a message, earn money" brand mark.
function badgeSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#1b1938"/>
  <rect width="128" height="128" rx="28" fill="url(#g)" opacity="0.35"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3f3a52"/>
      <stop offset="1" stop-color="#0e0c1f"/>
    </linearGradient>
  </defs>
  <!-- speech bubble -->
  <path d="M64 26c-19.9 0-36 13.4-36 30 0 9.5 5.4 18 13.8 23.5-.7 4.6-2.9 9.3-6.6 12.9-.9.9-.2 2.4 1 2.3 7-.6 13.2-3 17.9-6.2 3.2.8 6.5 1.2 9.9 1.2 19.9 0 36-13.4 36-30S83.9 26 64 26z" fill="#c9b4fa"/>
  <!-- message dots -->
  <circle cx="46" cy="56" r="6" fill="#1b1938"/>
  <circle cx="64" cy="56" r="6" fill="#1b1938"/>
  <circle cx="82" cy="56" r="6" fill="#1b1938"/>
  <!-- teal earnings accent: bottom-left check chip -->
  <circle cx="96" cy="94" r="18" fill="#0e3030"/>
  <path d="M88 94l6 6 11-12" stroke="#c9b4fa" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}

// ─── OG image (1200×630) — indigo hero canvas, badge left, wordmark right ─────
function ogSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1938"/>
      <stop offset="1" stop-color="#0e0c1f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#c9b4fa" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#c9b4fa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(110,215) scale(2.5)">${badgeSvgInner()}</g>
  <text x="430" y="300" font-family="Inter, 'DejaVu Sans', Arial, sans-serif" font-size="72" font-weight="700" letter-spacing="-2" fill="#ffffff">WA Marketing BD</text>
  <text x="430" y="368" font-family="Inter, 'DejaVu Sans', Arial, sans-serif" font-size="30" font-weight="460" fill="#bcbac9">Earn from WhatsApp tasks. Withdraw via bKash, Nagad, Rocket &amp; Upay.</text>
  <rect x="430" y="410" width="120" height="6" rx="3" fill="#c9b4fa"/>
</svg>`;
}

/** Inner badge markup (without svg wrapper) for embedding in the OG image. */
function badgeSvgInner(): string {
  return badgeSvg(128).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

// ─── Minimal PNG-in-ICO writer (Vista+ format; no extra dependency) ──────────
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // data size
  entry.writeUInt32LE(22, 12); // data offset (6 + 16)

  return Buffer.concat([header, entry, png]);
}

async function main(): Promise<void> {
  mkdirSync(LOGO_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  // SVG assets
  writeFileSync(join(LOGO_DIR, "logo.svg"), badgeSvg(128));
  writeFileSync(join(LOGO_DIR, "logo-dark.svg"), badgeSvg(128)); // badge is dark-surface safe
  writeFileSync(join(PUBLIC_DIR, "favicon.svg"), badgeSvg(128));

  // Raster assets
  const png32 = await sharp(Buffer.from(badgeSvg(512))).resize(32, 32).png().toBuffer();
  writeFileSync(join(PUBLIC_DIR, "favicon.ico"), pngToIco(png32, 32));

  await sharp(Buffer.from(ogSvg())).png().toFile(join(PUBLIC_DIR, "og-image.png"));

  console.log("generate-icons: wrote logo.svg, logo-dark.svg, favicon.svg, favicon.ico, og-image.png");
}

main().catch((err: unknown) => {
  console.error("generate-icons failed:", err);
  process.exit(1);
});

