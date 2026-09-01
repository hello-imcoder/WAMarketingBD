// apps/web/src/hooks/useAdminTasks.ts
// Admin task management (§7.1) — direct RLS-scoped writes (is_su_admin() policies).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Task } from "@wa-marketing-bd/shared-types";

export function useAdminTasks(): {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  createTask: (input: {
    whatsappNumber: string;
    message: string;
    payoutAmount: number;
    maxCompletions: number;
    expiresAt: string;
  }) => Promise<string | null>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<string | null>;
} {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (dbError !== null) setError("load_failed");
      else setTasks((data ?? []) as Task[]);
      setIsLoading(false);
    })();
  }, [tick]);

  async function createTask(input: {
    whatsappNumber: string;
    message: string;
    payoutAmount: number;
    maxCompletions: number;
    expiresAt: string;
  }): Promise<string | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData.session?.user.id;
    if (adminId === undefined) return "auth_failed";
    const { error: dbError } = await supabase.from("tasks").insert({
      whatsapp_number: input.whatsappNumber,
      message: input.message,
      payout_amount: input.payoutAmount,
      max_completions: input.maxCompletions,
      expires_at: input.expiresAt,
      status: "active",
      created_by: adminId,
    });
    if (dbError !== null) return "create_failed";
    reload();
    return null;
  }

  async function updateTask(taskId: string, patch: Partial<Task>): Promise<string | null> {
    const { error: dbError } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (dbError !== null) return "update_failed";
    reload();
    return null;
  }

  return { tasks, isLoading, error, reload, createTask, updateTask };
}
