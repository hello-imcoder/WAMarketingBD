// apps/web/src/hooks/useAdminWithdrawals.ts
// Admin withdrawal review (§7.3) — pending queue via admin RLS reads;
// complete/reject via the process-withdrawal Edge Function (server-side
// re-validation of min amount + balance at approval time — Milestone 6 note).
// Also exposes the site_settings singleton for the min-withdrawal editor
// (direct RLS write via `site_settings: admin updates`).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { useAuthStore } from "@/stores/authStore";
import type { SiteSettings, Withdrawal } from "@wa-marketing-bd/shared-types";

export type WithdrawalErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "WITHDRAWAL_NOT_FOUND"
  | "ALREADY_PROCESSED"
  | "BELOW_MIN"
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "WITHDRAWAL_FAILED"
  | "UNKNOWN_ERROR";

interface JoinedWithdrawal extends Withdrawal {
  profiles: { name: string; phone: string } | null;
}

export function useAdminWithdrawals(): {
  pending: JoinedWithdrawal[];
  processed: JoinedWithdrawal[];
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
  const session = useAuthStore((s) => s.session);
  const [pending, setPending] = useState<JoinedWithdrawal[]>([]);
  const [processed, setProcessed] = useState<JoinedWithdrawal[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const [wRes, sRes] = await Promise.all([
        supabase
          .from("withdrawals")
          .select("*, profiles(name, phone)")
          .order("requested_at", { ascending: false })
          .limit(200),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (wRes.error !== null || sRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      const rows = (wRes.data ?? []) as JoinedWithdrawal[];
      setPending(rows.filter((r) => r.status === "pending"));
      setProcessed(rows.filter((r) => r.status !== "pending"));
      setSettings((sRes.data ?? null) as SiteSettings | null);
      setIsLoading(false);
    })();
  }, [tick]);

  async function review(
    withdrawalId: string,
    action: "completed" | "rejected",
    adminNote: string | null,
  ): Promise<WithdrawalErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    try {
      await invokeEdgeFunction<{ ok: true; result: "completed" | "rejected" }>(
        "process-withdrawal",
        { withdrawalId, action, adminNote },
        session,
      );
      reload();
      return null;
    } catch (err) {
      const isMissing =
        (err instanceof EdgeFunctionError && err.status === 404) ||
        (err instanceof TypeError && err.message.includes("fetch"));
        
      if (isMissing) {
        // Fallback to database RPC since Edge Functions are not deployed
        const { error: rpcError } = await supabase.rpc("fn_process_withdrawal", {
          p_withdrawal_id: withdrawalId,
          p_action: action,
          p_admin_note: adminNote ?? "",
        });
        
        if (rpcError !== null) {
          const match = rpcError.message.match(/WITHDRAWAL:([A-Z_]+)/);
          if (match && match[1]) {
            return match[1] as WithdrawalErrorCode;
          }
          return "WITHDRAWAL_FAILED";
        }
        
        reload();
        return null;
      }

      return err instanceof EdgeFunctionError
        ? (err.code as WithdrawalErrorCode)
        : "UNKNOWN_ERROR";
    }
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

  return { pending, processed, settings, isLoading, error, reload, review, updateMinWithdrawal };
}
