// supabase/functions/verify-submission/index.ts
// Edge Function: verify-submission
//
// §12 Responsibility (implemented Milestone 11):
//   - Admin task-submission approve/reject. Caller identity from the verified
//     JWT (never the body); su_admin role re-checked server-side via a
//     service-role profiles read — a client role claim is never trusted.
//   - All money/state changes run in ONE DB transaction:
//     public.fn_verify_submission (migration 0017, SECURITY DEFINER, execute
//     granted to service_role only). The function:
//       * locks the submissions row FOR UPDATE + re-checks status='pending'
//         (idempotency — a double review can never double-pay),
//       * race-safe slot increment on tasks
//         (UPDATE ... WHERE completion_count < max_completions RETURNING id;
//         fails SUBMISSION:TASK_FULL if the task filled while pending),
//       * on APPROVAL credits the submitter's wallet: balance_verified AND
//         balance_total BOTH incremented by tasks.payout_amount (verified
//         Milestone 11 finding: create-submission never writes the wallet at
//         submission time, so the payout is NOT yet in balance_total),
//       * on REJECTION records rejection_reason; NO wallet change,
//       * NEVER touches referrals — the bonus is already paid at submission
//         time by trigger 0016 (Milestone 8, interpretation A).
//   - Rate-limits per admin via rate_limit_counters ('verify:admin:<uuid>')
//     with inline expired-row cleanup (AGENT.md §9 — no pg_cron). Even though
//     this is an admin-only endpoint, the limit is near-free to enforce and
//     protects against runaway/compromised admin sessions hammering
//     money-state transitions.
//   - Service-role key only — never exposed to the client.
//
// Request:  POST { submissionId, action: "approved"|"rejected", rejectionReason: string|null }
//           rejectionReason must be non-empty (≤1000 chars) when action="rejected".
// Success:  200 { ok: true, result: "approved" | "rejected" }
// Errors:   400 INVALID_INPUT · 401 UNAUTHORIZED · 403 FORBIDDEN ·
//           404 SUBMISSION_NOT_FOUND · 409 TASK_FULL | ALREADY_REVIEWED ·
//           429 RATE_LIMITED · 500 VERIFICATION_FAILED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Local schema copy (deploy bundles only this directory — AGENT.md §5).
// Mirrors adminSubmissionActionSchema from shared-types, plus the refinement
// the shared schema cannot express locally: rejectionReason is REQUIRED (and
// non-blank) when action="rejected".
const REJECTION_REASON_MAX = 1000;
const actionSchema = z
  .object({
    submissionId: z.string().uuid(),
    action: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().max(REJECTION_REASON_MAX).nullable(),
  })
  .refine(
    (v) =>
      v.action !== "rejected" ||
      (v.rejectionReason !== null && v.rejectionReason.trim().length > 0),
    { message: "Rejection reason is required when rejecting a submission" },
  );

// Rate limit: max 60 review actions per rolling 10-minute window per admin.
const VERIFY_LIMIT = 60;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, status: number): Response {
  return json({ ok: false, error: code }, status);
}

interface Counter {
  count: number;
  window_start: string;
}

/** Opportunistic inline cleanup of expired rate-limit rows (AGENT.md §9). */
async function cleanupRateLimits(admin: ReturnType<typeof createClient>): Promise<void> {
  try {
    await admin
      .from("rate_limit_counters")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .limit(50);
  } catch {
    // cleanup is best-effort; never block the request on it
  }
}

/** Returns true (and upserts the counter) if the action is allowed under the rate limit. */
async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const { data } = await admin
    .from("rate_limit_counters")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();
  const row = (data ?? null) as Counter | null;
  const windowActive = row !== null && new Date(row.window_start).getTime() + windowMs >= now;
  const count = windowActive ? row.count + 1 : 1;
  if (count > limit) return false;
  const expires = new Date(now + windowMs).toISOString();
  if (windowActive) {
    await admin
      .from("rate_limit_counters")
      .update({ count, expires_at: expires })
      .eq("key", key);
  } else {
    await admin
      .from("rate_limit_counters")
      .upsert({ key, count, window_start: new Date(now).toISOString(), expires_at: expires });
  }
  return true;
}

/** Maps typed DB exceptions ('SUBMISSION:<CODE>') to HTTP error codes/statuses. */
function classifyDbError(message: string): { code: string; status: number } {
  if (message.includes("SUBMISSION:TASK_FULL")) return { code: "TASK_FULL", status: 409 };
  if (message.includes("SUBMISSION:ALREADY_REVIEWED")) return { code: "ALREADY_REVIEWED", status: 409 };
  if (message.includes("SUBMISSION:REASON_REQUIRED")) return { code: "INVALID_INPUT", status: 400 };
  if (message.includes("SUBMISSION:INVALID_ACTION")) return { code: "INVALID_INPUT", status: 400 };
  if (message.includes("SUBMISSION:NOT_FOUND")) return { code: "SUBMISSION_NOT_FOUND", status: 404 };
  return { code: "VERIFICATION_FAILED", status: 500 };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return errorResponse("INVALID_INPUT", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (supabaseUrl === "" || serviceKey === "") return errorResponse("VERIFICATION_FAILED", 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Auth — identity from the verified JWT only.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token === "") return errorResponse("UNAUTHORIZED", 401);
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || userData.user === null) return errorResponse("UNAUTHORIZED", 401);
  const adminId = userData.user.id;

  // 2. Validate body (local Zod copy + rejection-reason refinement).
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400);
  const input = parsed.data;

  // 3. Rate limit (with inline expired-row cleanup — AGENT.md §9).
  await cleanupRateLimits(admin);
  if (!(await checkRateLimit(admin, `verify:admin:${adminId}`, VERIFY_LIMIT, VERIFY_WINDOW_MS))) {
    return errorResponse("RATE_LIMITED", 429);
  }

  // 4. Admin role check — server-side profiles read, never a client claim.
  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_banned, suspended_at")
    .eq("id", adminId)
    .maybeSingle();
  const prof = (profile ?? null) as {
    role: string;
    is_banned: boolean;
    suspended_at: string | null;
  } | null;
  if (prof === null || prof.is_banned || prof.suspended_at !== null) {
    return errorResponse("FORBIDDEN", 403);
  }
  if (prof.role !== "su_admin") return errorResponse("FORBIDDEN", 403);

  // 5. Atomic approve/reject via the 0017 SQL function (single transaction).
  const { data: result, error: rpcError } = await admin.rpc("fn_verify_submission", {
    p_submission_id: input.submissionId,
    p_action: input.action,
    p_rejection_reason: input.rejectionReason,
  });

  if (rpcError !== null) {
    const { code, status } = classifyDbError(rpcError.message);
    return errorResponse(code, status);
  }
  if (result !== "approved" && result !== "rejected") {
    return errorResponse("VERIFICATION_FAILED", 500);
  }

  return json({ ok: true, result }, 200);
});


