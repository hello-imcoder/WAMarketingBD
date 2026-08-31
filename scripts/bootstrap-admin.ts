#!/usr/bin/env tsx
// scripts/bootstrap-admin.ts
// One-off local script to create the su_admin account.
// Run: pnpm dlx tsx scripts/bootstrap-admin.ts
//
// Requirements:
//   - SECRETS.md must exist at the repo root with the following fields:
//       SUPABASE_URL: https://...
//       SUPABASE_SERVICE_ROLE_KEY: eyJ...
//       SU_ADMIN_EMAIL: admin@example.com
//       SU_ADMIN_PASSWORD: <strong password>
//   - SU_ADMIN_PASSWORD must be: ≥16 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char
//
// What it does:
//   1. Parses SECRETS.md for the four required values
//   2. Validates the admin password strength
//   3. Creates auth.users row via Supabase Auth Admin API (email_confirm: true)
//      Passes phone = '00000000000' as sentinel to satisfy the handle_new_user() trigger NOT NULL constraint
//   4. Updates profiles.role = 'su_admin' for the new user
//   5. Prints the new UUID (no secret values are printed)
//
// Keep this script after first run — it is safe to commit (no hardcoded secrets).
// Secrets are read at runtime from SECRETS.md which is gitignored.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ─── Parse SECRETS.md ─────────────────────────────────────────────────────────

function parseSecretsFile(): Record<string, string> {
  const secretsPath = resolve(process.cwd(), "SECRETS.md");
  let raw: string;
  try {
    raw = readFileSync(secretsPath, "utf8");
  } catch {
    throw new Error(
      `Cannot read SECRETS.md at ${secretsPath}. ` +
        "Ensure SECRETS.md exists at the repo root and is populated.",
    );
  }

  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    // Match lines like: KEY: value  or  KEY=value
    const match = /^([A-Z_][A-Z0-9_]*)\s*[:=]\s*(.+)$/.exec(line.trim());
    if (match?.[1] && match?.[2]) {
      result[match[1]] = match[2].trim();
    }
  }
  return result;
}

// ─── Password strength validation ─────────────────────────────────────────────
// Admin password requirements (§12 — compensate for no 2FA):
//   ≥ 16 characters, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character

function validateAdminPassword(password: string): void {
  const errors: string[] = [];
  if (password.length < 16) {
    errors.push("at least 16 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("at least 1 uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("at least 1 lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("at least 1 digit");
  }
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    errors.push("at least 1 special character (!@#$%^&* etc.)");
  }
  if (errors.length > 0) {
    throw new Error(
      `SU_ADMIN_PASSWORD does not meet strength requirements:\n  - ${errors.join("\n  - ")}`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🔐 WA Marketing BD — Admin Bootstrap");
  console.log("─".repeat(45));

  // 1. Parse secrets
  const secrets = parseSecretsFile();

  const supabaseUrl = secrets["SUPABASE_URL"];
  const serviceRoleKey = secrets["SUPABASE_SERVICE_ROLE_KEY"];
  const adminEmail = secrets["SU_ADMIN_EMAIL"];
  const adminPassword = secrets["SU_ADMIN_PASSWORD"];

  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !adminEmail && "SU_ADMIN_EMAIL",
    !adminPassword && "SU_ADMIN_PASSWORD",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields in SECRETS.md: ${missing.join(", ")}`,
    );
  }

  // 2. Validate password strength before making any API calls
  validateAdminPassword(adminPassword);
  console.log("✅ Password meets strength requirements");

  // 3. Create service-role client (never shipped to browser)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 4. Create auth.users row via Admin API
  //    phone = '00000000000' is a sentinel value that satisfies the handle_new_user()
  //    trigger's NOT NULL constraint on profiles.phone. The admin never logs in with
  //    a phone — they use SU_ADMIN_EMAIL directly as their Auth identity.
  console.log("⏳ Creating admin auth.users row…");
  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        phone: "00000000000",
        referral_code_used: null,
      },
    });

  if (createError ?? !createData.user) {
    throw new Error(
      `Failed to create auth user: ${createError?.message ?? "unknown error"}`,
    );
  }

  const userId = createData.user.id;
  console.log(`✅ auth.users row created — UUID: ${userId}`);

  // 5. Elevate role to su_admin in profiles table
  //    The trigger already created the profiles row; we just update the role column.
  //    RLS is bypassed because we're using the service-role key.
  console.log("⏳ Setting role = su_admin in profiles…");
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "su_admin" })
    .eq("id", userId);

  if (updateError) {
    throw new Error(
      `Failed to update profiles.role: ${updateError.message}\n` +
        `The auth.users row was created (UUID: ${userId}). ` +
        "Run the UPDATE manually:\n" +
        `  UPDATE public.profiles SET role = 'su_admin' WHERE id = '${userId}';`,
    );
  }

  console.log("✅ profiles.role set to su_admin");
  console.log("─".repeat(45));
  console.log(`🎉 Admin bootstrap complete!`);
  console.log(`   UUID: ${userId}`);
  console.log(
    `   Login: use SU_ADMIN_EMAIL + SU_ADMIN_PASSWORD at /login`,
  );
  console.log(
    `   Note: Admin logs in with their real email — NOT a synthesized phone email.`,
  );
}

main().catch((err: unknown) => {
  console.error("\n❌ Bootstrap failed:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
