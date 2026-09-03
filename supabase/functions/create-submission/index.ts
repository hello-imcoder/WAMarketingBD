// supabase/functions/create-submission/index.ts
// Edge Function: create-submission

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const submissionSchema = z.object({
  taskId: z.string().uuid(),
  screenshotPublicId: z.string().min(1).max(255).nullable(),
  screenshotHash: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  waLinkClicked: z.boolean(),
  deviceFingerprint: z.string().min(8).max(128).nullable(),
});

const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, status: number): Response {
  return json({ ok: false, error: code }, status);
}

async function cleanupRateLimits(admin: ReturnType<typeof createClient>): Promise<void> {
  try {
    await admin
      .from("rate_limit_counters")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .limit(50);
  } catch {
    // best-effort cleanup
  }
}

interface Counter {
  count: number;
  window_start: string;
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return errorResponse("INVALID_INPUT", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (supabaseUrl === "" || serviceKey === "") return errorResponse("SUBMISSION_FAILED", 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Auth
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token === "") return errorResponse("UNAUTHORIZED", 401);
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || userData.user === null) return errorResponse("UNAUTHORIZED", 401);
  const userId = userData.user.id;

  // 2. Validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400);
  const input = parsed.data;

  // 3. Rate limit
  await cleanupRateLimits(admin);
  const allowed = await checkRateLimit(admin, `submit:user:${userId}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
  if (!allowed) return errorResponse("RATE_LIMITED", 429);

  // 4. User standing
  const { data: profile } = await admin
    .from("profiles")
    .select("is_banned, suspended_at")
    .eq("id", userId)
    .maybeSingle();
  const prof = (profile ?? null) as { is_banned: boolean; suspended_at: string | null } | null;
  if (prof === null || prof.is_banned || prof.suspended_at !== null) return errorResponse("BANNED", 403);

  // 5. Task eligibility
  const { data: task } = await admin
    .from("tasks")
    .select("id, status, expires_at, max_completions, completion_count, payout_amount")
    .eq("id", input.taskId)
    .maybeSingle();
  type TaskRow = {
    id: string;
    status: string;
    expires_at: string;
    max_completions: number;
    completion_count: number;
    payout_amount: number;
  };
  const t = (task ?? null) as TaskRow | null;
  if (t === null) return errorResponse("TASK_NOT_FOUND", 404);
  if (t.status !== "active" || new Date(t.expires_at).getTime() <= Date.now()) {
    return errorResponse("TASK_EXPIRED", 409);
  }
  if (t.completion_count >= t.max_completions) return errorResponse("TASK_FULL", 409);

  // 5.5. Screenshot mode
  const { data: settings } = await admin
    .from("site_settings")
    .select("screenshot_mode")
    .eq("id", 1)
    .maybeSingle();
  const screenshotMode = (settings as { screenshot_mode: string } | null)?.screenshot_mode ?? "optional";
  if (screenshotMode === "must" && input.screenshotPublicId === null) {
    return errorResponse("SCREENSHOT_REQUIRED", 400);
  }

  // 6. Duplicate submissions
  const { data: existing } = await admin
    .from("submissions")
    .select("id")
    .eq("task_id", input.taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing !== null) return errorResponse("ALREADY_SUBMITTED", 409);

  // 7. Insert with AUTO-APPROVE (status: "approved")
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const { data: inserted, error: insertError } = await admin
    .from("submissions")
    .insert({
      task_id: input.taskId,
      user_id: userId,
      status: "approved", // <--- অটো-এপ্রুভ করার জন্য পরিবর্তন করা হয়েছে
      screenshot_url: null,
      screenshot_hash: input.screenshotHash,
      wa_link_clicked_at: input.waLinkClicked ? new Date().toISOString() : null,
      ip_address: ip !== "" ? ip : null,
      device_fingerprint: input.deviceFingerprint,
    })
    .select("id")
    .single();
  if (insertError || inserted === null) return errorResponse("SUBMISSION_FAILED", 500);
  const submissionRow = inserted as { id: string };

  // 7.5. Increment task completion count and user balance automatically
  await admin
    .from("tasks")
    .update({ completion_count: t.completion_count + 1 })
    .eq("id", input.taskId);

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();
  
  const currentBalance = currentProfile?.balance ?? 0;
  await admin
    .from("profiles")
    .update({ balance: currentBalance + t.payout_amount })
    .eq("id", userId);

  // 8. Best-effort screenshot URL derivation
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  if (input.screenshotPublicId !== null && cloudName !== "") {
    void admin
      .from("submissions")
      .update({
        screenshot_url: `https://res.cloudinary.com/${cloudName}/image/upload/${input.screenshotPublicId}`,
      })
      .eq("id", submissionRow.id);
  }

  return json({ ok: true, submissionId: submissionRow.id }, 200);
});
