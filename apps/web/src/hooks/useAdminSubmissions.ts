// apps/web/src/hooks/useAdminSubmissions.ts
// Admin submission review (§7.2) — paginated queue via admin RLS reads with
// status filter; approve/reject via the shared reviewSubmission flow (Edge
// Function with RPC fallback — money logic is server-side only, SECURITY.md §1).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { reviewSubmission } from "@/lib/adminSubmissionReview";
import type { ReviewErrorCode } from "@/lib/adminSubmissionReview";
import type { Submission } from "@wa-marketing-bd/shared-types";

export type { ReviewErrorCode };

export interface AdminSubmissionView {
  submission: Submission;
  taskId: string;
  payoutAmount: number;
  userName: string;
  userPhone: string;
}

export type SubmissionStatusFilter = "pending" | "reviewed" | "approved" | "rejected";

interface JoinedRow {
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  screenshot_url: string | null;
  screenshot_hash: string | null;
  rejection_reason: string | null;
  wa_link_clicked_at: string | null;
  ip_address: string | null;
  device_fingerprint: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  tasks: { payout_amount: number } | null;
  profiles: { name: string; phone: string } | null;
}

function toView(r: JoinedRow): AdminSubmissionView {
  return {
    submission: {
      id: r.id,
      task_id: r.task_id,
      user_id: r.user_id,
      status: r.status as Submission["status"],
      screenshot_url: r.screenshot_url,
      screenshot_hash: r.screenshot_hash,
      rejection_reason: r.rejection_reason,
      wa_link_clicked_at: r.wa_link_clicked_at,
      ip_address: r.ip_address,
      device_fingerprint: r.device_fingerprint,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
    },
    taskId: r.task_id,
    payoutAmount: r.tasks?.payout_amount ?? 0,
    userName: r.profiles?.name ?? "—",
    userPhone: r.profiles?.phone ?? "—",
  };
}

export function useAdminSubmissions(options: {
  page: number; // 1-based
  pageSize: number;
  status: SubmissionStatusFilter;
}): {
  submissions: AdminSubmissionView[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  review: (
    submissionId: string,
    action: "approved" | "rejected",
    rejectionReason: string | null,
  ) => Promise<ReviewErrorCode | null>;
} {
  const { page, pageSize, status } = options;
  const session = useAuthStore((s) => s.session);
  const [submissions, setSubmissions] = useState<AdminSubmissionView[]>([]);
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
      let query = supabase
        .from("submissions")
        .select("*, tasks(payout_amount), profiles(name, phone)", { count: "exact" })
        .order("submitted_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (status === "pending") query = query.eq("status", "pending");
      else if (status === "reviewed") query = query.neq("status", "pending");
      else query = query.eq("status", status);
      const { data, count, error: dbError } = await query;
      if (!mounted) return;
      if (dbError !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      setSubmissions(((data ?? []) as JoinedRow[]).map(toView));
      setTotal(count ?? 0);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [tick, page, pageSize, status]);

  async function review(
    submissionId: string,
    action: "approved" | "rejected",
    rejectionReason: string | null,
  ): Promise<ReviewErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    const code = await reviewSubmission(session, submissionId, action, rejectionReason);
    if (code === null) reload();
    return code;
  }

  return { submissions, total, isLoading, error, reload, review };
}
