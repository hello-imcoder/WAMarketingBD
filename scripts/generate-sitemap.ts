#!/usr/bin/env -S pnpm dlx tsx
// scripts/generate-sitemap.ts
// Generates apps/web/public/sitemap.xml and updates the Sitemap line in robots.txt.
// Run: pnpm dlx tsx scripts/generate-sitemap.ts
//
// Domain resolution order: SITE_URL env → VITE_SITE_URL env → placeholder
// (documented limitation — PROGRESS.md Q10: the production domain has not been
// provided yet; REGENERATE this file and robots.txt once the domain is known).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WEB = join(import.meta.dirname, "..", "apps", "web");

const PLACEHOLDER = "https://wa-marketing-bd-placeholder.example";
const siteUrl = (
  process.env["SITE_URL"] ??
  process.env["VITE_SITE_URL"] ??
  PLACEHOLDER
).replace(/\/+$/, "");

if (siteUrl === PLACEHOLDER) {
  console.warn(
    "generate-sitemap: WARNING — no SITE_URL/VITE_SITE_URL set. Using placeholder domain. " +
      "Regenerate after the production domain is provided (PROGRESS.md Q10).",
  );
}

interface RouteEntry {
  path: string;
  changefreq: "weekly" | "monthly";
  priority: string;
}

// Public, indexable routes only (§9): /rexio-admin, /app/*, /onboarding excluded.
const ROUTES: readonly RouteEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/login", changefreq: "monthly", priority: "0.5" },
  { path: "/reg", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "monthly", priority: "0.3" },
];

function main(): void {
  const today = new Date().toISOString().slice(0, 10);

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ROUTES.map(
      (r) =>
        `  <url>\n    <loc>${siteUrl}${r.path === "/" ? "/" : r.path}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${r.changefreq}</changefreq>\n` +
        `    <priority>${r.priority}</priority>\n  </url>`,
    ).join("\n") +
    `\n</urlset>\n`;

  writeFileSync(join(WEB, "public", "sitemap.xml"), xml);

  // Update the Sitemap line in robots.txt (currently a placeholder comment).
  const robotsPath = join(WEB, "public", "robots.txt");
  let robots = readFileSync(robotsPath, "utf8");
  robots = robots.replace(
    /# Sitemap[^\n]*\n(# Sitemap: [^\n]*)?/g,
    `Sitemap: ${siteUrl}/sitemap.xml\n`,
  );
  writeFileSync(robotsPath, robots);

  console.log(`generate-sitemap: wrote sitemap.xml + robots.txt Sitemap line (base: ${siteUrl})`);
}

main();

