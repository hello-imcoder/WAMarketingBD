// apps/web/src/hooks/useAdminTaskDetail.ts
// Per-task detail data: the task row + all its submissions (admin RLS read)
// with user info, plus client-side aggregates for the per-task stats/charts.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Task, Submission } from "@wa-marketing-bd/shared-types";

export type TaskSubmissionRow = Submission & {
  profiles: { name: string; phone: string } | null;
};

export type TaskDetailData = {
  task: Task | null;
  submissions: TaskSubmissionRow[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    uniqueUsers: number;
    payoutCommitted: number; // approved × payout
  };
  timeline: Array<{ date: string; approved: number; pending: number; rejected: number }>;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useAdminTaskDetail(taskId: string | undefined): TaskDetailData {
  const [task, setTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    if (taskId === undefined) return;
    let mounted = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      const [taskRes, subsRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("id", taskId).maybeSingle(),
        supabase
          .from("submissions")
          .select("*, profiles(name, phone)")
          .eq("task_id", taskId)
          .order("submitted_at", { ascending: false })
          .limit(5000),
      ]);
      if (!mounted) return;
      if (taskRes.error !== null || subsRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      setTask((taskRes.data ?? null) as Task | null);
      setSubmissions((subsRes.data ?? []) as TaskSubmissionRow[]);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [taskId, tick]);

  const pending = submissions.filter((s) => s.status === "pending").length;
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;
  const uniqueUsers = new Set(submissions.map((s) => s.user_id)).size;
  const payoutCommitted = approved * (task?.payout_amount ?? 0);

  // Daily timeline over the task's first 30 days of life (or span if shorter).
  const timeline: TaskDetailData["timeline"] = [];
  if (task !== null) {
    const start = new Date(task.created_at);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const spanDays = Math.min(
      30,
      Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)),
    );
    const buckets = new Map<string, { approved: number; pending: number; rejected: number }>();
    for (let i = 0; i <= spanDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > end) break;
      buckets.set(dayKey(d), { approved: 0, pending: 0, rejected: 0 });
    }
    for (const s of submissions) {
      const key = dayKey(new Date(s.submitted_at));
      const b = buckets.get(key);
      if (b === undefined) continue;
      if (s.status === "approved") b.approved += 1;
      else if (s.status === "pending") b.pending += 1;
      else if (s.status === "rejected") b.rejected += 1;
    }
    for (const [date, v] of buckets) timeline.push({ date, ...v });
  }

  return {
    task,
    submissions,
    stats: { total: submissions.length, pending, approved, rejected, uniqueUsers, payoutCommitted },
    timeline,
    isLoading,
    error,
    reload,
  };
}
