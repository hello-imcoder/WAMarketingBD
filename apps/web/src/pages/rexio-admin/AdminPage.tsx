// apps/web/src/pages/rexio-admin/AdminPage.tsx
// Route: "/rexio-admin" — admin dashboard (§9: noindex,nofollow via AdminLayout).
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AdminNoticeSettings } from "@/components/admin/AdminNoticeSettings";
import { AdminScreenshotSettings } from "@/components/admin/AdminScreenshotSettings";
import { useAdminDashboardStats } from "@/hooks/useAdminDashboardStats";

const CARDS: Array<{ to: string; titleKey: string; descKey: string }> = [
  { to: "tasks", titleKey: "admin.nav.tasks", descKey: "admin.dashboard.tasksDesc" },
  { to: "submissions", titleKey: "admin.nav.submissions", descKey: "admin.dashboard.submissionsDesc" },
  { to: "withdrawals", titleKey: "admin.nav.withdrawals", descKey: "admin.dashboard.withdrawalsDesc" },
  { to: "users", titleKey: "admin.nav.users", descKey: "admin.dashboard.usersDesc" },
  { to: "support", titleKey: "admin.nav.support", descKey: "admin.dashboard.supportDesc" },
];

export default function AdminPage(): React.ReactElement {
  const { t } = useTranslation();
  const { activeTasks, totalCompleted, pendingReview, isLoading: statsLoading } = useAdminDashboardStats();

  const statCards = [
    { emoji: "⚡", labelKey: "admin.dashboard.statActiveTasks", value: activeTasks },
    { emoji: "✅", labelKey: "admin.dashboard.statTotalCompleted", value: totalCompleted },
    { emoji: "⏳", labelKey: "admin.dashboard.statPendingReview", value: pendingReview },
  ];

  return (
    <>
      {/* ── Navigation cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: "var(--spacing-lg)", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            style={{
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-lg)",
              padding: "var(--spacing-xl)",
              textDecoration: "none",
              color: "var(--color-ink)",
              background: "var(--color-canvas)",
              display: "block",
            }}
          >
            <p style={{ margin: 0, fontSize: "18px", fontVariationSettings: '"wght" 540' }}>
              {t(card.titleKey)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "var(--color-ink-mute)" }}>
              {t(card.descKey)}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: "var(--spacing-md)",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          marginTop: "var(--spacing-xl)",
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.labelKey}
            style={{
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-lg)",
              padding: "var(--spacing-xl)",
              background: "var(--color-canvas)",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: "28px", fontVariationSettings: '"wght" 700' }}>
              {statsLoading ? "—" : String(s.value)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-ink-mute)" }}>
              {s.emoji} {t(s.labelKey)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Settings panels ──────────────────────────────────────────── */}
      <AdminNoticeSettings />
      <AdminScreenshotSettings />
    </>
  );
}
