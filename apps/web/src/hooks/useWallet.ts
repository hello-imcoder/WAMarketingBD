// apps/web/src/hooks/useWallet.ts
// Wallet data — own wallet row (RLS) + site_settings singleton + own withdrawals.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SiteSettings, Wallet, Withdrawal } from "@wa-marketing-bd/shared-types";

export function useWallet(): {
  wallet: Wallet | null;
  settings: SiteSettings | null;
  withdrawals: Withdrawal[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);

      const [walletRes, settingsRes, withdrawalsRes] = await Promise.all([
        supabase.from("wallets").select("*").maybeSingle(),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("withdrawals").select("*").order("requested_at", { ascending: false }).limit(20),
      ]);

      if (walletRes.error !== null || settingsRes.error !== null || withdrawalsRes.error !== null) {
        setError("load_failed");
        setIsLoading(false);
        return;
      }
      setWallet((walletRes.data ?? null) as Wallet | null);
      setSettings((settingsRes.data ?? null) as SiteSettings | null);
      setWithdrawals((withdrawalsRes.data ?? []) as Withdrawal[]);
      setIsLoading(false);
    })();
  }, [tick]);

  return { wallet, settings, withdrawals, isLoading, error, reload };
}
