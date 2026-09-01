// supabase/functions/admin-update-user/index.ts
// Edge Function: admin-update-user (NEW — Milestone 11)
//
// §12 Responsibility:
//   - Admin user management mutations (§7.4): manual account verification,
//     ban, suspend, unban/unuspend. SECURITY.md §1 explicitly lists user
//     ban/suspend as money-adjacent sensitive logic that MUST run in a
//     service-role Edge Function — so this is NOT a direct RLS write from the
//     admin browser, even though the `profiles: admin updates any` RLS policy
//     would technically permit one.
//   - Caller identity from the verified JWT (never the body); su_admin role
//     re-checked server-side via a service-role profiles read — a client
//     role claim is never trusted.
//   - A locked-out admin cannot lock themselves out accidentally: the caller
//     may not ban/suspend their own account. The caller may not change
//     `role` at all (single su_admin model — no role escalation path, §14).
//   - Only the fields present in the request are updated; at least one must
//     be present. No other column is ever writable through this function.
//   - Rate-limits per admin via rate_limit_counters ('useradmin:admin:<uuid>')
//     with inline expired-row cleanup (AGENT.md §9 — no pg_cron).
//   - Service-role key only — never exposed to the client.
//
// Request:  POST { userId, isVerified?: boolean, isBanned?: boolean, suspendedAt?: string|null }
//           suspendedAt: ISO timestamptz to suspend now, or null to unsuspend.
//           At least one of isVerified/isBanned/suspendedAt must be present.
// Success:  200 { ok: true }
// Errors:   400 INVALID_INPUT · 401 UNAUTHORIZED · 403 FORBIDDEN | SELF_LOCKOUT ·
//           404 USER_NOT_FOUND · 429 RATE_LIMITED · 500 USER_UPDATE_FAILED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Local schema copy (deploy bundles only this directory — AGENT.md §5).
const actionSchema = z
  .object({
    userId: z.string().uuid(),
    isVerified: z.boolean().optional(),
    isBanned: z.boolean().optional(),
    suspendedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((v) => v.isVerified !== undefined || v.isBanned !== undefined || v.suspendedAt !== undefined, {
    message: "At least one of isVerified, isBanned, suspendedAt is required",
  });

// Rate limit: max 60 user-management actions per rolling 10-minute window per admin.
const LIMIT = 60;
const WINDOW_MS = 10 * 60 * 1000;

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


serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return errorResponse("INVALID_INPUT", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (supabaseUrl === "" || serviceKey === "") return errorResponse("USER_UPDATE_FAILED", 500);
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
  if (!(await checkRateLimit(admin, `useradmin:admin:${adminId}`, LIMIT, WINDOW_MS))) {
    return errorResponse("RATE_LIMITED", 429);
  }

  // 4. Admin role check — server-side profiles read, never a client claim.
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, is_banned, suspended_at")
    .eq("id", adminId)
    .maybeSingle();
  const caller = (callerProfile ?? null) as {
    role: string;
    is_banned: boolean;
    suspended_at: string | null;
  } | null;
  if (caller === null || caller.is_banned || caller.suspended_at !== null) {
    return errorResponse("FORBIDDEN", 403);
  }
  if (caller.role !== "su_admin") return errorResponse("FORBIDDEN", 403);

  // 5. Self-lockout guard: an admin cannot ban or suspend their own account.
  const suspendingSelf = input.suspendedAt !== undefined && input.suspendedAt !== null;
  if (input.userId === adminId && ((input.isBanned ?? false) || suspendingSelf)) {
    return errorResponse("SELF_LOCKOUT", 403);
  }

  // 6. Target user must exist.
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();
  if (targetError !== null || target === null) return errorResponse("USER_NOT_FOUND", 404);

  // 7. Build the update — only the provided fields; role is never writable here.
  const update: { is_verified?: boolean; is_banned?: boolean; suspended_at?: string | null } = {};
  if (input.isVerified !== undefined) update.is_verified = input.isVerified;
  if (input.isBanned !== undefined) update.is_banned = input.isBanned;
  if (input.suspendedAt !== undefined) update.suspended_at = input.suspendedAt;

  const { error: updateError } = await admin.from("profiles").update(update).eq("id", input.userId);
  if (updateError !== null) return errorResponse("USER_UPDATE_FAILED", 500);

  return json({ ok: true }, 200);
});
