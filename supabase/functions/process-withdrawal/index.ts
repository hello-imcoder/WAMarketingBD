// supabase/functions/process-withdrawal/index.ts
// Edge Function: process-withdrawal
//
// §12 Responsibility:
//   - Server-side withdrawal approval and processing.
//   - Validates withdrawal request (amount >= site min_withdrawal_amount, sufficient balance_verified).
//   - Admin-triggered: verifies caller has su_admin role (checked server-side via JWT, never trusts client claim).
//   - Deducts amount from balance_verified atomically.
//   - Updates withdrawal status to completed/rejected with admin note.
//   - Rate-limits withdrawal requests per user per time window (DB-backed counter — Edge Functions share no memory).
//   - Uses service-role client — never the anon key.
//
// TODO (Milestone 11): Implement full logic.

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
    JSON.stringify({ error: "Not implemented", milestone: 11 }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
