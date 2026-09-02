// apps/web/src/hooks/useWallet.ts
// Wallet data — own wallet row (RLS) + site_settings singleton + own
// withdrawals (server-side paginated via .range() + count).
// Waits for an authenticated session before querying; each resource fails
// independently so a wallet-row problem does not block settings or withdrawals.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { SiteSettings, Wallet, Withdrawal } from "@wa-marketing-bd/shared-types";

export function useWallet(
  page = 1,
  pageSize = 10,
): {
  wallet: Wallet | null;
  settings: SiteSettings | null;
  withdrawals: Withdrawal[];
  withdrawalsTotal: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const session = useAuthStore((s) => s.session);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    // Don't query until the auth session is resolved.
    if (session === null) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      setError(null);

      const userId = session.user.id;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const [walletRes, settingsRes, withdrawalsRes] = await Promise.all([
        // Explicitly filter by user_id so RLS + explicit filter both apply;
        // avoids PGRST116 if somehow multiple rows slip through.
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .order("requested_at", { ascending: false })
          .range(from, to),
      ]);

      // Log individual errors to console for easier debugging.
      if (walletRes.error !== null) {
        console.error("[useWallet] wallets error:", walletRes.error);
      }
      if (settingsRes.error !== null) {
        console.error("[useWallet] site_settings error:", settingsRes.error);
      }
      if (withdrawalsRes.error !== null) {
        console.error("[useWallet] withdrawals error:", withdrawalsRes.error);
      }

      // Only show the error banner if the wallet itself failed to load —
      // settings and withdrawal errors degrade gracefully (defaults/empty list).
      if (walletRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }

      setWallet((walletRes.data ?? null) as Wallet | null);
      setSettings((settingsRes.data ?? null) as SiteSettings | null);
      setWithdrawals((withdrawalsRes.data ?? []) as Withdrawal[]);
      setWithdrawalsTotal(withdrawalsRes.count ?? 0);
      setIsLoading(false);
    })();
  }, [session, tick, page, pageSize]);

  return { wallet, settings, withdrawals, withdrawalsTotal, isLoading, error, reload };
}
