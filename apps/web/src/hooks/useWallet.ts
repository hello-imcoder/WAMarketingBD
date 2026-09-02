// apps/web/src/hooks/useWallet.ts
// Wallet data — own wallet row (RLS) + site_settings singleton + own withdrawals.
// Waits for an authenticated session before querying; each resource fails
// independently so a wallet-row problem does not block settings or withdrawals.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { SiteSettings, Wallet, Withdrawal } from "@wa-marketing-bd/shared-types";

export function useWallet(): {
  wallet: Wallet | null;
  settings: SiteSettings | null;
  withdrawals: Withdrawal[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const session = useAuthStore((s) => s.session);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
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

      const [walletRes, settingsRes, withdrawalsRes] = await Promise.all([
        // Explicitly filter by user_id so RLS + explicit filter both apply;
        // avoids PGRST116 if somehow multiple rows slip through.
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", userId)
          .order("requested_at", { ascending: false })
          .limit(20),
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
      setIsLoading(false);
    })();
  }, [session, tick]);

  return { wallet, settings, withdrawals, isLoading, error, reload };
}

