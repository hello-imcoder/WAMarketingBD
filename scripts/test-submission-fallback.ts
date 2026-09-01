// scripts/test-submission-fallback.ts
// End-to-end test of the user-panel task submission flow, mirroring the
// browser's exact behaviour after the TaskDetailPage fallback fix:
//   1. Cloudinary unsigned upload works (real POST, tiny PNG).
//   2. create-submission Edge Function is reachable (expected: currently NOT
//      deployed → 404 — this is the documented reason the fallback exists).
//   3. Fallback: direct RLS INSERT into `submissions` as a real authenticated
//      user (fresh test signup) succeeds, screenshot_url is derived from the
//      Cloudinary public_id, and a duplicate insert is rejected with 23505.
//   4. Cleanup: the test user's data is removed via service-role.
//
// Requires apps/web/.env.local (VITE_*) and SECRETS.md values for cleanup.
// Run: pnpm test:submission
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../apps/web/.env.local") });

// Tiny 1x1 PNG for the Cloudinary upload test.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface CloudinaryResponse {
  public_id?: string;
  secure_url?: string;
  error?: { message: string };
}

function secrets(): Record<string, string> {
  const text = readFileSync(resolve(__dirname, "../SECRETS.md"), "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main(): Promise<void> {
  const sec = secrets();
  const url = process.env.VITE_SUPABASE_URL ?? sec.SUPABASE_URL ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? sec.SUPABASE_ANON_KEY ?? "";
  const service = sec.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME ?? "";
  const preset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "";
  if (url === "" || anon === "" || service === "" || cloudName === "" || preset === "") {
    throw new Error("Missing env values (VITE_* / SECRETS.md)");
  }

  let failures = 0;
  const check = (name: string, ok: boolean, detail = ""): void => {
    console.log(`${ok ? "✅" : "❌"} ${name}${detail === "" ? "" : ` — ${detail}`}`);
    if (!ok) failures++;
  };

  // ── 1. Cloudinary unsigned upload (same call the browser makes) ────────────
  let publicId = "";
  try {
    const form = new FormData();
    form.append("file", `data:image/png;base64,${TINY_PNG_BASE64}`);
    form.append("upload_preset", preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as CloudinaryResponse;
    publicId = data.public_id ?? "";
    check("Cloudinary unsigned upload", res.ok && publicId !== "", publicId);
  } catch (err) {
    check("Cloudinary unsigned upload", false, String(err));
  }

  // ── 2. Edge Function availability (documents why the fallback exists) ──────
  // NOTE: an "ok" here means the function is deployed; 404 means it is not,
  // which is EXPECTED until the owner deploys the functions. The fallback in
  // TaskDetailPage handles this case, so this is informational — it never
  // fails the test run.
  let edgeStatus = 0;
  try {
    const res = await fetch(`${url}/functions/v1/create-submission`, { method: "POST" });
    edgeStatus = res.status;
    check(
      "create-submission Edge Function",
      true,
      res.ok ? "deployed — primary path active" : `HTTP ${String(res.status)} — client fallback will handle submission`,
    );
  } catch (err) {
    check("create-submission Edge Function", true, `unreachable (${String(err)}) — client fallback will handle submission`);
  }

  // ── 3. Fallback RLS insert as a real authenticated user ───────────────────
  const userClient = createClient(url, anon);
  const admin = createClient(url, service);

  const email = `fallback-test-${Date.now()}@example.com`;
  const password = "TestPass!2345";
  const phone = `01${String(Date.now()).slice(-9).padStart(9, "0")}`;

  const { data: signUp, error: signUpErr } = await userClient.auth.signUp({
    email,
    password,
    options: { data: { phone, name: "Fallback Test" } },
  });
  if (signUpErr !== null || signUp.session === null) {
    // Email confirmation may be enabled — fall back to signing in as the
    // existing su_admin is NOT appropriate (RLS would let admin insert for
    // themselves only). Instead report and exit.
    check("Test user signup", false, signUpErr?.message ?? "session null (email confirm on?)");
    finish(failures);
    return;
  }
  check("Test user signup", true, email);

  // A task row to submit against (created as admin via service role).
  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .insert({
      whatsapp_number: "8801700000000",
      message: "fallback test task",
      payout_amount: 5,
      max_completions: 1000,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      status: "active",
      created_by: signUp.user!.id,
    })
    .select("id")
    .single();
  if (taskErr !== null || task === null) {
    check("Create test task", false, taskErr?.message ?? "null");
    finish(failures);
    return;
  }
  check("Create test task", true, task.id);

  // Exact insert shape the TaskDetailPage fallback performs.
  const insertRow = {
    task_id: task.id,
    user_id: signUp.user!.id,
    status: "pending",
    screenshot_url: `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`,
    screenshot_hash: null,
    wa_link_clicked_at: new Date().toISOString(),
    device_fingerprint: "fallback-test-device",
  };
  const { error: insertErr } = await userClient.from("submissions").insert(insertRow);
  check("Fallback RLS insert (submissions)", insertErr === null, insertErr?.message ?? "");

  // Duplicate insert must be rejected with the unique-violation code.
  const { error: dupErr } = await userClient.from("submissions").insert(insertRow);
  check(
    "Duplicate insert rejected (23505)",
    dupErr !== null && dupErr.code === "23505",
    dupErr?.code ?? dupErr?.message ?? "",
  );

  // ── 4. Cleanup (service role bypasses RLS) ─────────────────────────────────
  await admin.from("submissions").delete().eq("task_id", task.id);
  await admin.from("tasks").delete().eq("id", task.id);
  await admin.auth.admin.deleteUser(signUp.user!.id);
  console.log("🧹 Test data cleaned up.");

  finish(failures);
}

function finish(failures: number): void {
  if (failures === 0) {
    console.log("\nAll submission-fallback tests passed.");
    process.exit(0);
  }
  console.error(`\n${String(failures)} test(s) failed.`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
