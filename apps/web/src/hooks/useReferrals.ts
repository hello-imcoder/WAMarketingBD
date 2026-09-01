// apps/web/src/hooks/useReferrals.ts
// Own referral rows (as referrer) via RLS SELECT.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Referral } from "@wa-marketing-bd/shared-types";

export function useReferrals(): {
  referrals: Referral[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { profile } = useAuthStore();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    if (profile === null) {
      setIsLoading(false);
      return;
    }
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (dbError !== null) {
        setError("load_failed");
      } else {
        setReferrals((data ?? []) as Referral[]);
      }
      setIsLoading(false);
    })();
  }, [profile, tick]);

  return { referrals, isLoading, error, reload };
}
