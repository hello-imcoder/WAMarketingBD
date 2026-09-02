// apps/web/src/hooks/useAppNavCounts.ts
// Actionable counts for the user panel nav badges (bottom nav on mobile,
// sidebar on desktop). Refetches on every route change so badges stay fresh
// after actions (submission, withdrawal request).
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export type AppNavCounts = {
  activeTasks: number;
  pendingWithdrawals: number;
};

export function useAppNavCounts(): AppNavCounts {
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const [counts, setCounts] = useState<AppNavCounts>({
    activeTasks: 0,
    pendingWithdrawals: 0,
  });

  useEffect(() => {
    if (session === null) return;
    const userId = session.user.id;
    let mounted = true;
    async function load(): Promise<void> {
      const now = new Date().toISOString();
      const [tasks, wds] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .gt("expires_at", now),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending"),
      ]);
      if (!mounted) return;
      setCounts({
        activeTasks: tasks.count ?? 0,
        pendingWithdrawals: wds.count ?? 0,
      });
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [location.pathname, session]);

  return counts;
}
