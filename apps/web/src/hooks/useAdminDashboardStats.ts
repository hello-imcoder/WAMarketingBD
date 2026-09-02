// apps/web/src/hooks/useAdminDashboardStats.ts
// Fetches aggregate counts for the admin dashboard stat cards.
// Runs three parallel Supabase count queries; all three tables are
// readable by admin via RLS (is_su_admin() policies in 0012_rls.sql).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminDashboardStats = {
  activeTasks: number;
  totalCompleted: number;
  pendingReview: number;
  isLoading: boolean;
};

export function useAdminDashboardStats(): AdminDashboardStats {
  const [activeTasks, setActiveTasks] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      const [activeRes, completedRes, pendingRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (!mounted) return;
      setActiveTasks(activeRes.count ?? 0);
      setTotalCompleted(completedRes.count ?? 0);
      setPendingReview(pendingRes.count ?? 0);
      setIsLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  return { activeTasks, totalCompleted, pendingReview, isLoading };
}
