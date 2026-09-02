// apps/web/src/hooks/useAdminNavCounts.ts
// Pending-work counts for the admin sidebar badges (submissions, withdrawals,
// support). Refetches on every route change so badges stay fresh after actions.
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { supabase } from "@/lib/supabase";

export type AdminNavCounts = {
  pendingSubmissions: number;
  pendingWithdrawals: number;
  openTickets: number;
  activeTasks: number;
};

export function useAdminNavCounts(): AdminNavCounts {
  const location = useLocation();
  const [counts, setCounts] = useState<AdminNavCounts>({
    pendingSubmissions: 0,
    pendingWithdrawals: 0,
    openTickets: 0,
    activeTasks: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      const [subs, wds, tickets, tasks] = await Promise.all([
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .neq("status", "closed"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
      ]);
      if (!mounted) return;
      setCounts({
        pendingSubmissions: subs.count ?? 0,
        pendingWithdrawals: wds.count ?? 0,
        openTickets: tickets.count ?? 0,
        activeTasks: tasks.count ?? 0,
      });
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  return counts;
}
