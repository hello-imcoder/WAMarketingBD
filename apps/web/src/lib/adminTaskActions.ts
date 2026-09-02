// apps/web/src/lib/adminTaskActions.ts
// Shared admin task mutations (create/edit) — used by useAdminTasks and the
// TaskFormSheet so the number-splitting insert logic stays single-sourced.
import { supabase } from "@/lib/supabase";
import type { Task } from "@wa-marketing-bd/shared-types";

export type AdminTaskCreateInput = {
  whatsappNumbers: string;
  message: string;
  payoutAmount: number;
  maxCompletions: number;
  expiresAt: string;
};

export async function createAdminTasks(
  input: AdminTaskCreateInput,
): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const adminId = sessionData.session?.user.id;
  if (adminId === undefined) return "auth_failed";

  // Split the raw numbers string and create one task row per number.
  const numbers = input.whatsappNumbers
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => /^[0-9]{7,15}$/.test(n));

  if (numbers.length === 0) return "create_failed";

  const results = await Promise.all(
    numbers.map((num) =>
      supabase.from("tasks").insert({
        whatsapp_number: num,
        message: input.message,
        payout_amount: input.payoutAmount,
        max_completions: input.maxCompletions,
        expires_at: input.expiresAt,
        status: "active",
        created_by: adminId,
      }),
    ),
  );

  const failed = results.some((r) => r.error !== null);
  return failed ? "create_failed" : null;
}

export async function updateAdminTask(
  taskId: string,
  patch: Partial<Task>,
): Promise<string | null> {
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  return error !== null ? "update_failed" : null;
}
