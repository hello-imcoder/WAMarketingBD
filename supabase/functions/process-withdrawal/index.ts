// supabase/functions/process-withdrawal/index.ts
// Edge Function: process-withdrawal
//
// §12 Responsibility (implemented Milestone 11):
//   - Admin withdrawal complete/reject. Caller identity from the verified JWT
//     (never the body); su_admin role re-checked server-side via a
//     service-role profiles read — a client role claim is never trusted.
//   - All money/state changes run in ONE DB transaction:
//     public.fn_process_withdrawal (migration 0018, SECURITY DEFINER, execute
//     granted to service_role only). The function:
//       * locks the withdrawals row FOR UPDATE + re-checks status='pending'
//         (idempotency — a double-click can never double-pay),
//       * RE-VALIDATES the amount at approval time against
//         site_settings.min_withdrawal_amount (live read — settings are
//         admin-configurable, so any request-time client check may be stale)
//         and against wallets.balance_verified (balance may have changed since
//         the request). Failures raise typed exceptions and roll everything
//         back — no partial state, never a negative balance,
//       * on COMPLETION deducts the amount from BOTH balance_verified and
//         balance_total (money leaves the system — mirrors 0015 P2P debit),
//       * on REJECTION records admin_note; NO wallet change (funds were never
//         reserved at request time).
//   - The actual MFS transfer (bKash/Nagad/Rocket/Upay) is performed MANUALLY
//     by the admin outside the app — this function only records the financial
//     state change in the DB. No MFS API integration exists in scope (§14).
//   - Rate-limits per admin via rate_limit_counters ('withdraw:admin:<uuid>')
//     with inline expired-row cleanup (AGENT.md §9 — no pg_cron): near-free to
//     enforce on an admin-only endpoint and protects against runaway sessions
//     hammering money-state transitions.
//   - Service-role key only — never exposed to the client.
//
// Request:  POST { withdrawalId, action: "completed"|"rejected", adminNote: string|null }
// Success:  200 { ok: true, result: "completed" | "rejected" }
// Errors:   400 INVALID_INPUT · 401 UNAUTHORIZED · 403 FORBIDDEN ·
//           404 WITHDRAWAL_NOT_FOUND · 409 ALREADY_PROCESSED |
//           BELOW_MIN | INSUFFICIENT_BALANCE · 429 RATE_LIMITED ·
//           500 WITHDRAWAL_FAILED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Local schema copy (deploy bundles only this directory — AGENT.md §5).
// Mirrors adminWithdrawalActionSchema from shared-types.
const actionSchema = z.object({
  withdrawalId: z.string().uuid(),
  action: z.enum(["completed", "rejected"]),
  adminNote: z.string().max(500).nullable(),
});

// Rate limit: max 60 withdrawal actions per rolling 10-minute window per admin.
const WITHDRAW_LIMIT = 60;
const WITHDRAW_WINDOW_MS = 10 * 60 * 1000;

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

/** Maps typed DB exceptions ('WITHDRAWAL:<CODE>') to HTTP error codes/statuses. */
function classifyDbError(message: string): { code: string; status: number } {
  if (message.includes("WITHDRAWAL:INSUFFICIENT_BALANCE")) {
    return { code: "INSUFFICIENT_BALANCE", status: 409 };
  }
  if (message.includes("WITHDRAWAL:BELOW_MIN")) return { code: "BELOW_MIN", status: 409 };
  if (message.includes("WITHDRAWAL:ALREADY_PROCESSED")) return { code: "ALREADY_PROCESSED", status: 409 };
  if (message.includes("WITHDRAWAL:INVALID_ACTION")) return { code: "INVALID_INPUT", status: 400 };
  if (message.includes("WITHDRAWAL:NOT_FOUND")) return { code: "WITHDRAWAL_NOT_FOUND", status: 404 };
  if (message.includes("WITHDRAWAL:SETTINGS_MISSING")) return { code: "WITHDRAWAL_FAILED", status: 500 };
  if (message.includes("WITHDRAWAL:WALLET_MISSING")) return { code: "WITHDRAWAL_FAILED", status: 500 };
  return { code: "WITHDRAWAL_FAILED", status: 500 };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return errorResponse("INVALID_INPUT", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (supabaseUrl === "" || serviceKey === "") return errorResponse("WITHDRAWAL_FAILED", 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Auth — identity from the verified JWT only.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token === "") return errorResponse("UNAUTHORIZED", 401);
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || userData.user === null) return errorResponse("UNAUTHORIZED", 401);
  const adminId = userData.user.id;

  // 2. Validate body (local Zod copy).
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
  if (!(await checkRateLimit(admin, `withdraw:admin:${adminId}`, WITHDRAW_LIMIT, WITHDRAW_WINDOW_MS))) {
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

  // 5. Atomic complete/reject via the 0018 SQL function (single transaction).
  const { data: result, error: rpcError } = await admin.rpc("fn_process_withdrawal", {
    p_withdrawal_id: input.withdrawalId,
    p_action: input.action,
    p_admin_note: input.adminNote,
  });

  if (rpcError !== null) {
    const { code, status } = classifyDbError(rpcError.message);
    return errorResponse(code, status);
  }
  if (result !== "completed" && result !== "rejected") {
    return errorResponse("WITHDRAWAL_FAILED", 500);
  }

  return json({ ok: true, result }, 200);
});


