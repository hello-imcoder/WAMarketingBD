// supabase/functions/verify-submission/index.ts
// Edge Function: verify-submission
//
// §12 Responsibility:
//   - Server-side task submission verification and approval/rejection.
//   - Validates the submission request (task ID, user ID, screenshot hash).
//   - Detects duplicate screenshots (SHA-256 hash comparison).
//   - Logs IP address and device fingerprint for fraud signals (REQUIREMENT.md §8).
//   - On approval: moves payout amount from pending to balance_verified in the wallet.
//   - On rejection: records rejection_reason visible to the user (REQUIREMENT.md §7.2).
//   - Checks for referral bonus trigger (first task completion by a referred user — §6.5).
//   - All DB writes run inside a transaction; never partial updates.
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
