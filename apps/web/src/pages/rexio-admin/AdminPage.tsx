// apps/web/src/pages/rexio-admin/AdminPage.tsx
// Route: "/rexio-admin" — admin dashboard (§9: noindex,nofollow via AdminLayout).
// KPI row + 30-day charts + quick actions + inline action queue.
// Settings moved to /rexio-admin/settings; nav duplication removed (sidebar only).
import { useTranslation } from "react-i18next";
import {
  Users,
  ListChecks,
  ClipboardCheck,
  Wallet,
  LifeBuoy,
  Banknote,
  Plus,
} from "lucide-react";
import { StatCard, Card, CardHeader, Button, Skeleton, PageHeader } from "@/components/admin/ui";
import {
  SubmissionsTrendChart,
  SignupsChart,
  ProviderDonut,
  ApprovalRing,
} from "@/components/admin/charts/DashboardCharts";
import { AdminActionQueue } from "@/components/admin/AdminActionQueue";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";

const PROVIDER_COLORS: Record<string, string> = {
  bkash: "#e2136e",
  nagad: "#f6921e",
  rocket: "#8c3494",
  upay: "#00a99d",
};

export default function AdminPage(): React.ReactElement {
  const { t } = useTranslation();
  const { isLoading, totals, series, withdrawalsByProvider, queue, reload } =
    useAdminDashboardData();

  const kpis = [
    {
      icon: <Users size={20} />,
      label: t("admin.dashboard.totalUsers"),
      value: totals.users.toLocaleString(),
      to: "/rexio-admin/users",
      tone: "neutral" as const,
    },
    {
      icon: <ListChecks size={20} />,
      label: t("admin.dashboard.statActiveTasks"),
      value: totals.activeTasks.toLocaleString(),
      to: "/rexio-admin/tasks",
      tone: "neutral" as const,
    },
    {
      icon: <ClipboardCheck size={20} />,
      label: t("admin.dashboard.pendingSubmissions"),
      value: totals.pendingSubmissions.toLocaleString(),
      to: "/rexio-admin/submissions",
      tone: "warning" as const,
    },
    {
      icon: <Wallet size={20} />,
      label: t("admin.dashboard.pendingWithdrawals"),
      value: totals.pendingWithdrawals.toLocaleString(),
      to: "/rexio-admin/withdrawals",
      tone: "warning" as const,
    },
    {
      icon: <LifeBuoy size={20} />,
      label: t("admin.dashboard.openTickets"),
      value: totals.openTickets.toLocaleString(),
      to: "/rexio-admin/support",
      tone: "info" as const,
    },
    {
      icon: <Banknote size={20} />,
      label: t("admin.dashboard.totalPaidOut"),
      value: `৳${totals.paidOut.toLocaleString()}`,
      to: "/rexio-admin/withdrawals",
      tone: "success" as const,
    },
  ];

  return (
    <>
      {/* ── Header + quick actions ──────────────────────────────────── */}
      <PageHeader
        title={t("admin.dashboard.title")}
        description={t("admin.dashboard.subtitle")}
        actions={
          <>
            <Button to="/rexio-admin/tasks?new=1" variant="primary" size="sm">
              <Plus size={15} /> {t("admin.dashboard.newTask")}
            </Button>
            <Button to="/rexio-admin/submissions" variant="outline" size="sm">
              <ClipboardCheck size={15} /> {t("admin.dashboard.reviewQueue")}
            </Button>
            <Button to="/rexio-admin/withdrawals" variant="outline" size="sm">
              <Wallet size={15} /> {t("admin.dashboard.withdrawalsQueue")}
            </Button>
          </>
        }
      />

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            icon={k.icon}
            label={k.label}
            value={k.value}
            to={k.to}
            tone={k.tone}
            loading={isLoading}
          />
        ))}
      </div>

      {/* ── Charts: 30-day activity ─────────────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("admin.chart.submissionsTitle")}
            description={t("admin.chart.submissionsDesc")}
          />
          <div className="p-4 pt-2">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <SubmissionsTrendChart data={series.submissions} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title={t("admin.chart.signupsTitle")}
            description={t("admin.chart.signupsDesc")}
          />
          <div className="p-4 pt-2">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <SignupsChart data={series.signups} />
            )}
          </div>
        </Card>
      </div>

      {/* ── Charts: money + quality ─────────────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("admin.chart.providersTitle")}
            description={t("admin.chart.providersDesc")}
          />
          <div className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : withdrawalsByProvider.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-mute">
                {t("admin.chart.noPending")}
              </p>
            ) : (
              <>
                <ProviderDonut data={withdrawalsByProvider} />
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {withdrawalsByProvider.map((p) => (
                    <span key={p.provider} className="flex items-center gap-1.5 text-xs text-ink-mute">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ background: PROVIDER_COLORS[p.provider] ?? "var(--color-primary)" }}
                      />
                      {t(`wallet.provider.${p.provider}`)} · ৳{p.amount.toLocaleString()}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title={t("admin.chart.approvalTitle")}
            description={t("admin.chart.approvalDesc")}
          />
          <div className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : totals.approvalRate === null ? (
              <p className="py-16 text-center text-sm text-ink-mute">
                {t("admin.chart.noReviews")}
              </p>
            ) : (
              <ApprovalRing rate={totals.approvalRate} />
            )}
          </div>
        </Card>
      </div>

      {/* ── Action queue ────────────────────────────────────────────── */}
      <div className="mt-6">
        <AdminActionQueue
          submissions={queue.submissions}
          withdrawals={queue.withdrawals}
          onActionDone={reload}
        />
      </div>
    </>
  );
}
