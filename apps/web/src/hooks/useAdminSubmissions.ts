// apps/web/src/hooks/useAdminSubmissions.ts
// Admin submission review (§7.2) — pending queue via admin RLS reads;
// approve/reject via the verify-submission Edge Function (money logic is
// server-side only — SECURITY.md §1).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { useAuthStore } from "@/stores/authStore";
import type { Submission } from "@wa-marketing-bd/shared-types";

export interface AdminSubmissionView {
  submission: Submission;
  taskId: string;
  payoutAmount: number;
  userName: string;
  userPhone: string;
}

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

export type ReviewErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SUBMISSION_NOT_FOUND"
  | "TASK_FULL"
  | "ALREADY_REVIEWED"
  | "RATE_LIMITED"
  | "VERIFICATION_FAILED"
  | "UNKNOWN_ERROR";

export function useAdminSubmissions(): {
  pending: AdminSubmissionView[];
  reviewed: AdminSubmissionView[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  review: (
    submissionId: string,
    action: "approved" | "rejected",
    rejectionReason: string | null,
  ) => Promise<ReviewErrorCode | null>;
} {
  const session = useAuthStore((s) => s.session);
  const [pending, setPending] = useState<AdminSubmissionView[]>([]);
  const [reviewed, setReviewed] = useState<AdminSubmissionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("submissions")
        .select("*, tasks(payout_amount), profiles(name, phone)")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (dbError !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      const rows = (data ?? []) as JoinedRow[];
      const toView = (r: JoinedRow): AdminSubmissionView => ({
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
      });
      setPending(rows.filter((r) => r.status === "pending").map(toView));
      setReviewed(rows.filter((r) => r.status !== "pending").map(toView));
      setIsLoading(false);
    })();
  }, [tick]);

  async function review(
    submissionId: string,
    action: "approved" | "rejected",
    rejectionReason: string | null,
  ): Promise<ReviewErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    try {
      await invokeEdgeFunction<{ ok: true; result: "approved" | "rejected" }>(
        "verify-submission",
        { submissionId, action, rejectionReason },
        session,
      );
      reload();
      return null;
    } catch (err) {
      return err instanceof EdgeFunctionError ? (err.code as ReviewErrorCode) : "UNKNOWN_ERROR";
    }
  }

  return { pending, reviewed, isLoading, error, reload, review };
}
