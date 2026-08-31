// supabase/functions/generate-referral-code/index.ts
// Edge Function: generate-referral-code
//
// §6.5 Responsibility:
//   - Generates a unique referral code for a new user at signup/onboarding.
//   - Ensures uniqueness by checking against existing codes in the profiles table.
//   - Stores the generated code in profiles.referral_code.
//   - Called server-side during the onboarding flow (not client-generated — codes must be verified unique).
//   - Uses service-role client — never the anon key.
//
// TODO (Milestone 8): Implement full logic.

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
    JSON.stringify({ error: "Not implemented", milestone: 8 }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
