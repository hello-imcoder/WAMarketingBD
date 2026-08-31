// supabase/functions/process-p2p-transfer/index.ts
// Edge Function: process-p2p-transfer
//
// §12 Responsibility:
//   - Server-side P2P transfer execution between two users.
//   - Validates sender has sufficient balance_verified (transfers from verified balance only — §6.4).
//   - Looks up recipient by phone number; returns recipient name preview for client confirmation step.
//   - After user confirms: executes atomic transfer (deduct sender, credit recipient) in a single transaction.
//   - No fee, no daily/max limit (REQUIREMENT.md §14 — explicitly out of scope for v1).
//   - Rate-limits transfer requests per user per time window (DB-backed counter).
//   - Uses service-role client — never the anon key.
//
// TODO (Milestone 7): Implement full logic.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  return new Response(
    JSON.stringify({ error: "Not implemented", milestone: 7 }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
