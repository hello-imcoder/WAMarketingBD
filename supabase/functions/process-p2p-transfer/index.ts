// supabase/functions/process-p2p-transfer/index.ts
// Edge Function: process-p2p-transfer
//
// §12 Responsibility (owner-approved decision: lookup action lives here):
//   - action=lookup   → recipient name preview by phone (read-only; prevents
//     wrong-number transfers, §6.4). Returns ONLY the name — never balance,
//     ban state, or any other profile field. `profiles` RLS stays own-row-only;
//     no policy is weakened.
//   - action=transfer → atomic P2P transfer via public.fn_process_p2p_transfer
//     (migration 0015): deduct sender, credit recipient, insert row — one DB
//     transaction with rollback on any failure. Sender identity comes from the
//     verified JWT, never the request body.
//   - Rate-limits per user via rate_limit_counters ('p2p:user:<uuid>') with
//     inline expired-row cleanup (AGENT.md §9). No fee, no limits (§14).
//   - Service-role key only — never shipped to the client.
//
// Request:  POST { action: "lookup" | "transfer", recipientPhone, amount? }
// Success:  200 { ok: true, recipientName? } | 200 { ok: true, transferId, newSenderBalanceVerified? }
// Errors:   400 INVALID_INPUT · 401 UNAUTHORIZED · 403 SELF_TRANSFER | ACCOUNT_BANNED ·
//           404 RECIPIENT_NOT_FOUND · 409 INSUFFICIENT_BALANCE | WALLET_MISSING |
//           INVALID_AMOUNT · 429 RATE_LIMITED · 500 TRANSFER_FAILED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Local schema copies (deploy bundles only this directory — AGENT.md §5).
const lookupSchema = z.object({
  action: z.literal("lookup"),
  recipientPhone: z.string().regex(/^01[3-9]\d{8}$/),
});

const transferSchema = z.object({
  action: z.literal("transfer"),
  recipientPhone: z.string().regex(/^01[3-9]\d{8}$/),
  amount: z.number().int().positive(),
});

// Rate limit: max 20 P2P actions per rolling 10-minute window per user.
const P2P_LIMIT = 20;
const P2P_WINDOW_MS = 10 * 60 * 1000;

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

async function cleanupRateLimits(admin: ReturnType<typeof createClient>): Promise<void> {
  try {
    await admin
      .from("rate_limit_counters")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .limit(50);
  } catch {
    // best-effort
  }
}

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
  const windowStart = windowActive ? row.window_start : new Date(now).toISOString();
  const expiresAt = new Date(new Date(windowStart).getTime() + windowMs).toISOString();
  const { error } = await admin
    .from("rate_limit_counters")
    .upsert({ key, count, window_start: windowStart, expires_at: expiresAt }, { onConflict: "key" });
  return !error;
}

/** Maps a `P2P:<CODE>` exception message from the DB function to a status. */
function classifyDbError(message: string): { code: string; status: number } {
  const code = message.includes("P2P:")
    ? message.split("P2P:")[1]?.split("'")[0] ?? "TRANSFER_FAILED"
    : "TRANSFER_FAILED";
  const status =
    code === "INSUFFICIENT_BALANCE" || code === "INVALID_AMOUNT" || code === "WALLET_MISSING"
      ? 409
      : code === "SELF_TRANSFER" || code === "ACCOUNT_BANNED"
        ? 403
        : code === "RECIPIENT_NOT_FOUND"
          ? 404
          : 500;
  return { code, status };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return errorResponse("INVALID_INPUT", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (supabaseUrl === "" || serviceKey === "") return errorResponse("TRANSFER_FAILED", 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Auth — identity from the verified JWT only.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token === "") return errorResponse("UNAUTHORIZED", 401);
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || userData.user === null) return errorResponse("UNAUTHORIZED", 401);
  const userId = userData.user.id;

  // 2. Validate body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }
  const action =
    typeof body === "object" && body !== null && "action" in body && typeof body.action === "string"
      ? body.action
      : "";
  const parsed =
    action === "lookup"
      ? lookupSchema.safeParse(body)
      : action === "transfer"
        ? transferSchema.safeParse(body)
        : null;
  if (parsed === null || !parsed.success) return errorResponse("INVALID_INPUT", 400);
  const input = parsed.data;

  // 3. Rate limit + caller standing.
  await cleanupRateLimits(admin);
  if (!(await checkRateLimit(admin, `p2p:user:${userId}`, P2P_LIMIT, P2P_WINDOW_MS))) {
    return errorResponse("RATE_LIMITED", 429);
  }
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("phone, is_banned, suspended_at")
    .eq("id", userId)
    .maybeSingle();
  const caller = (callerProfile ?? null) as {
    phone: string;
    is_banned: boolean;
    suspended_at: string | null;
  } | null;
  if (caller === null || caller.is_banned || caller.suspended_at !== null) {
    return errorResponse("ACCOUNT_BANNED", 403);
  }

  // ── action = lookup: recipient name preview only ────────────────────────────
  if (input.action === "lookup") {
    if (input.recipientPhone === caller.phone) return errorResponse("SELF_TRANSFER", 403);
    const { data: recipient } = await admin
      .from("profiles")
      .select("name, is_banned, suspended_at")
      .eq("phone", input.recipientPhone)
      .maybeSingle();
    const r = (recipient ?? null) as {
      name: string;
      is_banned: boolean;
      suspended_at: string | null;
    } | null;
    if (r === null) return errorResponse("RECIPIENT_NOT_FOUND", 404);
    return json({ ok: true, recipientName: r.name }, 200);
  }

  // ── action = transfer: atomic DB transaction ────────────────────────────────
  const { data: transferId, error: rpcError } = await admin.rpc("fn_process_p2p_transfer", {
    p_sender: userId,
    p_recipient_phone: input.recipientPhone,
    p_amount: input.amount,
  });

  if (rpcError !== null) {
    const { code, status } = classifyDbError(rpcError.message);
    return errorResponse(code, status);
  }
  if (typeof transferId !== "string" || transferId === "") {
    return errorResponse("TRANSFER_FAILED", 500);
  }

  // Sender's fresh verified balance for UI feedback.
  const { data: wallet } = await admin
    .from("wallets")
    .select("balance_verified")
    .eq("user_id", userId)
    .maybeSingle();
  const balanceVerified = (wallet as { balance_verified: number } | null)?.balance_verified ?? null;

  return json(
    {
      ok: true,
      transferId,
      ...(balanceVerified !== null ? { newSenderBalanceVerified: balanceVerified } : {}),
    },
    200,
  );
});

