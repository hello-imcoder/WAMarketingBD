// apps/web/src/hooks/useHistory.ts
// History feed (§6.6) — pure client-side queries over RLS-scoped tables
// (no Edge Function, no RLS change). Four parallel selects, latest N each,
// normalized into a unified entry shape; "All" merges + sorts by date.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Submission, Referral, P2pTransfer, Withdrawal } from "@wa-marketing-bd/shared-types";

export type HistoryType = "task" | "referral" | "p2p" | "withdrawal";

export interface HistoryEntry {
  id: string;
  type: HistoryType;
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

interface P2pWithDirection extends P2pTransfer {
  direction: "sent" | "received";
}

export function useHistory(): {
  entries: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
} {
  const { session } = useAuthStore();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) return;
    const userId = session.user.id;

    void (async () => {
      setIsLoading(true);
      setError(null);

      const [subsRes, refsRes, p2pSentRes, p2pRecvRes, wdRes] = await Promise.all([
        supabase
          .from("submissions")
          .select("*, tasks(payout_amount)")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(PER_SOURCE),
        supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", userId)
          .eq("bonus_paid", true)
          .order("triggered_at", { ascending: false })
          .limit(PER_SOURCE),
        supabase
          .from("p2p_transfers")
          .select("*")
          .eq("sender_id", userId)
          .order("transferred_at", { ascending: false })
          .limit(PER_SOURCE),
        supabase
          .from("p2p_transfers")
          .select("*")
          .eq("recipient_id", userId)
          .order("transferred_at", { ascending: false })
          .limit(PER_SOURCE),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", userId)
          .order("requested_at", { ascending: false })
          .limit(PER_SOURCE),
      ]);

      if (subsRes.error !== null || refsRes.error !== null || p2pSentRes.error !== null ||
          p2pRecvRes.error !== null || wdRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }

      const out: HistoryEntry[] = [];

      for (const s of (subsRes.data ?? []) as SubmissionWithTask[]) {
        out.push({
          id: `task-${s.id}`,
          type: "task",
          amount: s.status === "approved" ? (s.tasks?.payout_amount ?? 0) : 0,
          status: s.status,
          date: s.submitted_at,
          descKey: "task",
        });
      }
      for (const r of (refsRes.data ?? []) as Referral[]) {
        out.push({
          id: `ref-${r.id}`,
          type: "referral",
          amount: r.bonus_amount,
          status: "paid",
          date: r.triggered_at ?? r.created_at,
          descKey: "referral",
        });
      }
      const sent = ((p2pSentRes.data ?? []) as P2pTransfer[]).map<P2pWithDirection>((t) => ({
        ...t,
        direction: "sent",
      }));
      const recv = ((p2pRecvRes.data ?? []) as P2pTransfer[]).map<P2pWithDirection>((t) => ({
        ...t,
        direction: "received",
      }));
      for (const tr of [...sent, ...recv].sort(
        (a, b) => new Date(b.transferred_at).getTime() - new Date(a.transferred_at).getTime(),
      ).slice(0, PER_SOURCE)) {
        out.push({
          id: `p2p-${tr.id}`,
          type: "p2p",
          amount: tr.direction === "sent" ? -tr.amount : tr.amount,
          status: tr.direction,
          date: tr.transferred_at,
          descKey: `p2p_${tr.direction}`,
          descParams: { amount: tr.amount },
        });
      }
      for (const w of (wdRes.data ?? []) as Withdrawal[]) {
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

      out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(out);
      setIsLoading(false);
    })();
  }, [session]);

  return { entries, isLoading, error };
}
