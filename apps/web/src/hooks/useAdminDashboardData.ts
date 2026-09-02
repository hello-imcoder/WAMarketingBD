// apps/web/src/hooks/useAdminDashboardData.ts
// Full dashboard dataset for the admin home: KPI totals, 30-day chart series,
// withdrawal provider breakdown, and the latest pending queues.
// All reads are admin-RLS (is_su_admin) direct selects; aggregation is
// client-side — sufficient at current scale, no new RPC/migration needed.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type QueueSubmission = {
  id: string;
  userName: string;
  userPhone: string;
  payoutAmount: number;
  submittedAt: string;
  screenshotUrl: string | null;
};

export type QueueWithdrawal = {
  id: string;
  userName: string;
  userPhone: string;
  amount: number;
  provider: string;
  accountNumber: string;
  requestedAt: string;
};

export type DashboardData = {
  isLoading: boolean;
  totals: {
    users: number;
    activeTasks: number;
    pendingSubmissions: number;
    pendingWithdrawals: number;
    openTickets: number;
    paidOut: number;
    approvalRate: number | null; // 0–100, null when no reviews yet
  };
  series: {
    submissions: Array<{ date: string; pending: number; approved: number }>;
    signups: Array<{ date: string; count: number }>;
  };
  withdrawalsByProvider: Array<{ provider: string; amount: number }>;
  queue: {
    submissions: QueueSubmission[];
    withdrawals: QueueWithdrawal[];
  };
};

const DAYS = 30;

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildLastNDays(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export function useAdminDashboardData(): DashboardData & { reload: () => void } {
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = (): void => setTick((n) => n + 1);
  const [data, setData] = useState<Omit<DashboardData, "isLoading">>({
    totals: {
      users: 0,
      activeTasks: 0,
      pendingSubmissions: 0,
      pendingWithdrawals: 0,
      openTickets: 0,
      paidOut: 0,
      approvalRate: null,
    },
    series: { submissions: [], signups: [] },
    withdrawalsByProvider: [],
    queue: { submissions: [], withdrawals: [] },
  });

  useEffect(() => {
    let mounted = true;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);

    async function load(): Promise<void> {
      const [
        usersRes,
        activeTasksRes,
        pendingSubsRes,
        pendingWdsRes,
        openTicketsRes,
        approvedRes,
        rejectedRes,
        completedWdRes,
        recentSubsRes,
        recentWdsRes,
        pendingAllRes,
        subs30Res,
        signups30Res,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("withdrawals").select("amount").eq("status", "completed").limit(5000),
        supabase
          .from("submissions")
          .select("id, submitted_at, screenshot_url, tasks(payout_amount), profiles(name, phone)")
          .eq("status", "pending")
          .order("submitted_at", { ascending: true })
          .limit(5),
        supabase
          .from("withdrawals")
          .select("id, amount, provider, account_number, requested_at, profiles(name, phone)")
          .eq("status", "pending")
          .order("requested_at", { ascending: true })
          .limit(5),
        supabase
          .from("withdrawals")
          .select("amount, provider")
          .eq("status", "pending")
          .limit(2000),
        supabase
          .from("submissions")
          .select("status, submitted_at")
          .gte("submitted_at", since.toISOString())
          .limit(10000),
        supabase
          .from("profiles")
          .select("created_at")
          .gte("created_at", since.toISOString())
          .limit(10000),
      ]);

      // 30-day submission series (pending vs approved per day).
      const days = buildLastNDays();
      const subMap = new Map<string, { pending: number; approved: number }>(
        days.map((d) => [d, { pending: 0, approved: 0 }]),
      );
      for (const row of (subs30Res.data ?? []) as Array<{ status: string; submitted_at: string }>) {
        const key = dayKey(new Date(row.submitted_at));
        const bucket = subMap.get(key);
        if (bucket === undefined) continue;
        if (row.status === "pending") bucket.pending += 1;
        else if (row.status === "approved") bucket.approved += 1;
      }
      const submissions = days.map((d) => ({ date: d, ...subMap.get(d)! }));

      // 30-day signup series.
      const signupMap = new Map<string, number>(days.map((d) => [d, 0]));
      for (const row of (signups30Res.data ?? []) as Array<{ created_at: string }>) {
        const key = dayKey(new Date(row.created_at));
        const bucket = signupMap.get(key);
        if (bucket !== undefined) signupMap.set(key, bucket + 1);
      }
      const signups = days.map((d) => ({ date: d, count: signupMap.get(d) ?? 0 }));

      // Withdrawals pending — provider breakdown (all pending amounts).
      const providerTotals = new Map<string, number>();
      for (const row of (pendingAllRes.data ?? []) as Array<{ provider: string; amount: number }>) {
        providerTotals.set(row.provider, (providerTotals.get(row.provider) ?? 0) + row.amount);
      }

      const approvedCount = approvedRes.count ?? 0;
      const rejectedCount = rejectedRes.count ?? 0;
      const reviewed = approvedCount + rejectedCount;

      if (!mounted) return;
      setData({
        totals: {
          users: usersRes.count ?? 0,
          activeTasks: activeTasksRes.count ?? 0,
          pendingSubmissions: pendingSubsRes.count ?? 0,
          pendingWithdrawals: pendingWdsRes.count ?? 0,
          openTickets: openTicketsRes.count ?? 0,
          paidOut: (completedWdRes.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0),
          approvalRate: reviewed === 0 ? null : Math.round((approvedCount / reviewed) * 100),
        },
        series: { submissions, signups },
        withdrawalsByProvider: [...providerTotals.entries()].map(([provider, amount]) => ({ provider, amount })),
        queue: {
          submissions: ((recentSubsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
            const profiles = r.profiles as { name: string; phone: string } | null;
            const task = r.tasks as { payout_amount: number } | null;
            return {
              id: r.id as string,
              userName: profiles?.name ?? "—",
              userPhone: profiles?.phone ?? "—",
              payoutAmount: task?.payout_amount ?? 0,
              submittedAt: r.submitted_at as string,
              screenshotUrl: (r.screenshot_url as string | null) ?? null,
            };
          }),
          withdrawals: ((recentWdsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
            const profiles = r.profiles as { name: string; phone: string } | null;
            return {
              id: r.id as string,
              userName: profiles?.name ?? "—",
              userPhone: profiles?.phone ?? "—",
              amount: r.amount as number,
              provider: r.provider as string,
              accountNumber: r.account_number as string,
              requestedAt: r.requested_at as string,
            };
          }),
        },
      });
      setIsLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [tick]);

  return { isLoading, reload, ...data };
}
