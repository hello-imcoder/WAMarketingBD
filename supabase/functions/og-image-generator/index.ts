// supabase/functions/og-image-generator/index.ts
// Edge Function: og-image-generator
//
// §9 Responsibility:
//   - Generates dynamic Open Graph images for per-page social sharing previews.
//   - Returns a PNG image with the page title/description rendered over the brand design.
//   - Respects DESIGN.md color and typography tokens:
//     primary: #1b1938, canvas: #ffffff, font: Inter Variable at weights 460/540.
//   - Cached at the edge (immutable cache headers) to avoid regenerating on every crawl.
//   - Does NOT require auth — public GET endpoint.
//
// TODO (Milestone 4): Implement using a Deno-compatible image generation approach
// (e.g., @resvg/resvg-wasm or similar Deno-compatible SVG → PNG pipeline).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  return new Response(
    JSON.stringify({ error: "Not implemented", milestone: 4 }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
