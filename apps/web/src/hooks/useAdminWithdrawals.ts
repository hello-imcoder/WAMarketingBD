// apps/web/src/hooks/useAdminWithdrawals.ts
// Admin withdrawal review (§7.3) — paginated queue via admin RLS reads with
// status + provider filters and a pending-amount summary; complete/reject via
// the shared reviewWithdrawal flow (Edge Function with RPC fallback).
// Also exposes the site_settings singleton for the min-withdrawal editor
// (direct RLS write via `site_settings: admin updates`).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { reviewWithdrawal } from "@/lib/adminWithdrawalReview";
import type { WithdrawalErrorCode } from "@/lib/adminWithdrawalReview";
import type { SiteSettings, Withdrawal } from "@wa-marketing-bd/shared-types";

export type { WithdrawalErrorCode };

export type WithdrawalStatusFilter = "pending" | "completed" | "rejected" | "all";

export interface JoinedWithdrawal extends Withdrawal {
  profiles: { name: string; phone: string } | null;
}

export function useAdminWithdrawals(options: {
  page: number; // 1-based
  pageSize: number;
  status: WithdrawalStatusFilter;
  provider: string; // "all" | mfs_provider
}): {
  withdrawals: JoinedWithdrawal[];
  total: number;
  pendingAmount: number;
  pendingCount: number;
  settings: SiteSettings | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  review: (
    withdrawalId: string,
    action: "completed" | "rejected",
    adminNote: string | null,
  ) => Promise<WithdrawalErrorCode | null>;
  updateMinWithdrawal: (amount: number) => Promise<string | null>;
} {
  const { page, pageSize, status, provider } = options;
  const session = useAuthStore((s) => s.session);
  const [withdrawals, setWithdrawals] = useState<JoinedWithdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
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
        .from("withdrawals")
        .select("*, profiles(name, phone)", { count: "exact" })
        .order("requested_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (status !== "all") query = query.eq("status", status);
      if (provider !== "all") query = query.eq("provider", provider);

      const [wRes, sumRes, sRes] = await Promise.all([
        query,
        supabase.from("withdrawals").select("amount").eq("status", "pending").limit(5000),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (!mounted) return;
      if (wRes.error !== null || sRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      setWithdrawals((wRes.data ?? []) as JoinedWithdrawal[]);
      setTotal(wRes.count ?? 0);
      const amounts = (sumRes.data ?? []) as Array<{ amount: number }>;
      setPendingAmount(amounts.reduce((s, r) => s + (r.amount ?? 0), 0));
      setPendingCount(sumRes.count ?? amounts.length);
      setSettings((sRes.data ?? null) as SiteSettings | null);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [tick, page, pageSize, status, provider]);

  async function review(
    withdrawalId: string,
    action: "completed" | "rejected",
    adminNote: string | null,
  ): Promise<WithdrawalErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    const code = await reviewWithdrawal(session, withdrawalId, action, adminNote);
    if (code === null) reload();
    return code;
  }

  async function updateMinWithdrawal(amount: number): Promise<string | null> {
    const { error: dbError } = await supabase
      .from("site_settings")
      .update({ min_withdrawal_amount: amount })
      .eq("id", 1);
    if (dbError !== null) return "settings_failed";
    reload();
    return null;
  }

  return { withdrawals, total, pendingAmount, pendingCount, settings, isLoading, error, reload, review, updateMinWithdrawal };
}
