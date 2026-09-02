// apps/web/src/hooks/useHistory.ts
// History feed (§6.6) — queries over RLS-scoped tables (no Edge Function, no
// RLS change). Normalized into a unified entry shape.
// A specific type filter paginates that source server-side (.range() + count).
// The "all" view merges a recent slice from each source and sorts by date
// client-side (total unknown → null so the UI hides pagination).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Submission, Referral, P2pTransfer, Withdrawal } from "@wa-marketing-bd/shared-types";

export type HistoryType = "all" | "task" | "referral" | "p2p" | "withdrawal";

export interface HistoryEntry {
  id: string;
  type: Exclude<HistoryType, "all">;
  /** Signed amount: earnings positive, spends negative. */
  amount: number;
  status: string;
  date: string;
  /** i18n key suffix + params for the description. */
  descKey: string;
  descParams?: Record<string, string | number>;
}

const PER_SOURCE = 50;

interface SubmissionWithTask extends Submission {
  tasks: { payout_amount: number } | null;
}

export function useHistory(
  type: HistoryType = "all",
  page = 1,
  pageSize = 20,
): {
  entries: HistoryEntry[];
  /** null when the view merges sources (client-side "all" merge). */
  total: number | null;
  isLoading: boolean;
  error: string | null;
} {
  const { session } = useAuthStore();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) return;
    const userId = session.user.id;

    void (async () => {
      setIsLoading(true);
      setError(null);

      if (type === "all") {
        const [subsRes, refsRes, p2pRes, wdRes] = await Promise.all([
          supabase
            .from("submissions")
            .select("*, tasks(payout_amount)")
            .eq("user_id", userId)
            .order("submitted_at", { ascending: false })
            .range(0, PER_SOURCE - 1),
          supabase
            .from("referrals")
            .select("*")
            .eq("referrer_id", userId)
            .eq("bonus_paid", true)
            .order("triggered_at", { ascending: false })
            .range(0, PER_SOURCE - 1),
          supabase
            .from("p2p_transfers")
            .select("*")
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order("transferred_at", { ascending: false })
            .range(0, PER_SOURCE - 1),
          supabase
            .from("withdrawals")
            .select("*")
            .eq("user_id", userId)
            .order("requested_at", { ascending: false })
            .range(0, PER_SOURCE - 1),
        ]);

        if (subsRes.error !== null || refsRes.error !== null ||
            p2pRes.error !== null || wdRes.error !== null) {
          setError("load_failed");
          setIsLoading(false);
          return;
        }

        const out: HistoryEntry[] = [];
        pushSubmissions(out, (subsRes.data ?? []) as SubmissionWithTask[]);
        pushReferrals(out, (refsRes.data ?? []) as Referral[]);
        pushP2p(out, (p2pRes.data ?? []) as P2pTransfer[], userId);
        pushWithdrawals(out, (wdRes.data ?? []) as Withdrawal[]);

        out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(out);
        setTotal(null);
        setIsLoading(false);
        return;
      }

      // Single-source view — server-side pagination with an exact count.
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      if (type === "task") {
        const res = await supabase
          .from("submissions")
          .select("*, tasks(payout_amount)", { count: "exact" })
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .range(from, to);
        if (res.error !== null) return fail();
        const out: HistoryEntry[] = [];
        pushSubmissions(out, (res.data ?? []) as SubmissionWithTask[]);
        setEntries(out);
        setTotal(res.count ?? 0);
      } else if (type === "referral") {
        const res = await supabase
          .from("referrals")
          .select("*", { count: "exact" })
          .eq("referrer_id", userId)
          .eq("bonus_paid", true)
          .order("triggered_at", { ascending: false })
          .range(from, to);
        if (res.error !== null) return fail();
        const out: HistoryEntry[] = [];
        pushReferrals(out, (res.data ?? []) as Referral[]);
        setEntries(out);
        setTotal(res.count ?? 0);
      } else if (type === "p2p") {
        const res = await supabase
          .from("p2p_transfers")
          .select("*", { count: "exact" })
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order("transferred_at", { ascending: false })
          .range(from, to);
        if (res.error !== null) return fail();
        const out: HistoryEntry[] = [];
        pushP2p(out, (res.data ?? []) as P2pTransfer[], userId);
        setEntries(out);
        setTotal(res.count ?? 0);
      } else {
        const res = await supabase
          .from("withdrawals")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .order("requested_at", { ascending: false })
          .range(from, to);
        if (res.error !== null) return fail();
        const out: HistoryEntry[] = [];
        pushWithdrawals(out, (res.data ?? []) as Withdrawal[]);
        setEntries(out);
        setTotal(res.count ?? 0);
      }
      setIsLoading(false);

      function fail(): void {
        setError("load_failed");
        setIsLoading(false);
      }
    })();
  }, [session, type, page, pageSize]);

  return { entries, total, isLoading, error };
}

function pushSubmissions(out: HistoryEntry[], rows: SubmissionWithTask[]): void {
  for (const s of rows) {
    out.push({
      id: `task-${s.id}`,
      type: "task",
      amount: s.status === "approved" ? (s.tasks?.payout_amount ?? 0) : 0,
      status: s.status,
      date: s.submitted_at,
      descKey: "task",
    });
  }
}

function pushReferrals(out: HistoryEntry[], rows: Referral[]): void {
  for (const r of rows) {
    out.push({
      id: `ref-${r.id}`,
      type: "referral",
      amount: r.bonus_amount,
      status: "paid",
      date: r.triggered_at ?? r.created_at,
      descKey: "referral",
    });
  }
}

function pushP2p(out: HistoryEntry[], rows: P2pTransfer[], userId: string): void {
  for (const tr of rows) {
    const direction = tr.sender_id === userId ? "sent" : "received";
    out.push({
      id: `p2p-${tr.id}`,
      type: "p2p",
      amount: direction === "sent" ? -tr.amount : tr.amount,
      status: direction,
      date: tr.transferred_at,
      descKey: `p2p_${direction}`,
      descParams: { amount: tr.amount },
    });
  }
}

function pushWithdrawals(out: HistoryEntry[], rows: Withdrawal[]): void {
  for (const w of rows) {
    out.push({
      id: `wd-${w.id}`,
      type: "withdrawal",
      amount: -w.amount,
      status: w.status,
      date: w.requested_at,
      descKey: "withdrawal",
      descParams: { provider: w.provider, account: `…${w.account_number.slice(-4)}` },
    });
  }
}
