// apps/web/src/pages/rexio-admin/AdminPage.tsx
// Route: "/rexio-admin" — admin dashboard (§9: noindex,nofollow via AdminLayout).
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

const CARDS: Array<{ to: string; titleKey: string; descKey: string }> = [
  { to: "tasks", titleKey: "admin.nav.tasks", descKey: "admin.dashboard.tasksDesc" },
  { to: "submissions", titleKey: "admin.nav.submissions", descKey: "admin.dashboard.submissionsDesc" },
  { to: "withdrawals", titleKey: "admin.nav.withdrawals", descKey: "admin.dashboard.withdrawalsDesc" },
  { to: "users", titleKey: "admin.nav.users", descKey: "admin.dashboard.usersDesc" },
  { to: "support", titleKey: "admin.nav.support", descKey: "admin.dashboard.supportDesc" },
];

export default function AdminPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
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
  );
}

