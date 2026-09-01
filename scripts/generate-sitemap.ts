#!/usr/bin/env -S pnpm dlx tsx
// scripts/generate-sitemap.ts
// Generates apps/web/public/sitemap.xml and updates the Sitemap line in robots.txt.
// Run: pnpm dlx tsx scripts/generate-sitemap.ts
//
// Domain resolution order: SITE_URL env → VITE_SITE_URL env → DEFAULT (production)
// Production domain confirmed: https://wamarketingbd.dpdns.org (Q10 resolved).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WEB = join(import.meta.dirname, "..", "apps", "web");

const DEFAULT_SITE_URL = "https://wamarketingbd.dpdns.org";
const siteUrl = (
  process.env["SITE_URL"] ??
  process.env["VITE_SITE_URL"] ??
  DEFAULT_SITE_URL
).replace(/\/+$/, "");

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

  // Rewrite the Sitemap line in robots.txt (idempotent — replaces any existing
  // "Sitemap:" line, or appends one if missing).
  const robotsPath = join(WEB, "public", "robots.txt");
  let robots = readFileSync(robotsPath, "utf8");
  const sitemapLine = `Sitemap: ${siteUrl}/sitemap.xml`;
  if (/^Sitemap:.*$/m.test(robots)) {
    robots = robots.replace(/^Sitemap:.*$/m, sitemapLine);
  } else {
    robots = robots.trimEnd() + `\n\n${sitemapLine}\n`;
  }
  writeFileSync(robotsPath, robots);

  console.log(`generate-sitemap: wrote sitemap.xml + robots.txt Sitemap line (base: ${siteUrl})`);
}

main();

