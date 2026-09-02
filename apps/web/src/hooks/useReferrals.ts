// apps/web/src/hooks/useReferrals.ts
// Own referral rows (as referrer) via RLS SELECT — server-side paginated.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Referral } from "@wa-marketing-bd/shared-types";

export function useReferrals(
  page = 1,
  pageSize = 10,
): {
  referrals: Referral[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { profile } = useAuthStore();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
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
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error: dbError } = await supabase
        .from("referrals")
        .select("*", { count: "exact" })
        .eq("referrer_id", profile.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (dbError !== null) {
        setError("load_failed");
      } else {
        setReferrals((data ?? []) as Referral[]);
        setTotal(count ?? 0);
      }
      setIsLoading(false);
    })();
  }, [profile, tick, page, pageSize]);

  return { referrals, total, isLoading, error, reload };
}
