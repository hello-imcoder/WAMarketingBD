// apps/web/src/hooks/useAdminTasks.ts
// Admin task management (§7.1) — direct RLS-scoped writes (is_su_admin() policies).
// Server-side pagination (.range) + status filter + total count.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Task } from "@wa-marketing-bd/shared-types";

export type TaskStatusFilter = "all" | "active" | "paused" | "expired";

export function useAdminTasks(options: {
  page: number; // 1-based
  pageSize: number;
  status: TaskStatusFilter;
}): {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  createTask: (input: {
    whatsappNumbers: string;
    message: string;
    payoutAmount: number;
    maxCompletions: number;
    expiresAt: string;
  }) => Promise<string | null>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<string | null>;
} {
  const { page, pageSize, status } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (status !== "all") query = query.eq("status", status);
      const { data, count, error: dbError } = await query;
      if (!mounted) return;
      if (dbError !== null) setError("load_failed");
      else {
        setTasks((data ?? []) as Task[]);
        setTotal(count ?? 0);
      }
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [tick, page, pageSize, status]);

  async function createTask(input: {
    whatsappNumbers: string;
    message: string;
    payoutAmount: number;
    maxCompletions: number;
    expiresAt: string;
  }): Promise<string | null> {
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
    if (failed) return "create_failed";
    reload();
    return null;
  }

  async function updateTask(taskId: string, patch: Partial<Task>): Promise<string | null> {
    const { error: dbError } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (dbError !== null) return "update_failed";
    reload();
    return null;
  }

  return { tasks, total, isLoading, error, reload, createTask, updateTask };
}
