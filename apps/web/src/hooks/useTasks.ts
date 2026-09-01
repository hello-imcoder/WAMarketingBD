// apps/web/src/hooks/useTasks.ts
// Task list/detail data hooks — queries `tasks` (publicly readable) and the
// user's own `submissions` (RLS own-row) to annotate each task's state.
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Submission, Task } from "@wa-marketing-bd/shared-types";

export interface TaskWithStatus {
  task: Task;
  submission: Submission | null;
}

function isTaskAvailable(task: Task): boolean {
  return (
    task.status === "active" &&
    new Date(task.expires_at).getTime() > Date.now() &&
    task.completion_count < task.max_completions
  );
}

/** Loads all active, non-expired tasks annotated with the user's submission state. */
export function useTasks(session: Session | null): {
  tasks: TaskWithStatus[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data: taskRows, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        ;
      if (taskError !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      const available = ((taskRows ?? []) as Task[]).filter(isTaskAvailable);

      let submissionRows: Submission[] = [];
      if (session !== null) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("*")
          .eq("user_id", session.user.id)
          ;
        submissionRows = (subs ?? []) as Submission[];
      }
      const byTaskId = new Map(submissionRows.map((s) => [s.task_id, s]));

      setTasks(available.map((task) => ({ task, submission: byTaskId.get(task.id) ?? null })));
      setIsLoading(false);
    })();
    return () => controller.abort();
  }, [session, tick]);

  return { tasks, isLoading, error, reload };
}

/** Loads one task (any active status) + the user's submission for it. */
export function useTaskDetail(
  taskId: string | undefined,
  session: Session | null,
): { entry: TaskWithStatus | null; isLoading: boolean; error: string | null } {
  const [entry, setEntry] = useState<TaskWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId === undefined) {
      setError("not_found");
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle()
        ;
      if (taskError !== null || task === null) {
        setError("not_found");
        setIsLoading(false);
        return;
      }
      const t = task as Task;
      if (!isTaskAvailable(t)) {
        setError("not_found");
        setIsLoading(false);
        return;
      }
      let submission: Submission | null = null;
      if (session !== null) {
        const { data: sub } = await supabase
          .from("submissions")
          .select("*")
          .eq("task_id", taskId)
          .eq("user_id", session.user.id)
          .maybeSingle()
          ;
        submission = (sub ?? null) as Submission | null;
      }
      setEntry({ task: t, submission });
      setIsLoading(false);
    })();
    return () => controller.abort();
  }, [taskId, session]);

  return { entry, isLoading, error };
}
