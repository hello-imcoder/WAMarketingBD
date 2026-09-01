// apps/web/src/layouts/AdminLayout.tsx
// Admin panel layout — /rexio-admin
// §9: noindex,nofollow meta required at layout level (not just robots.txt).
import { useEffect } from "react";
import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { useAuthStore } from "@/stores/authStore";

const NAV_ITEMS: Array<{ to: string; key: string; end: boolean }> = [
  { to: "/rexio-admin", key: "admin.nav.dashboard", end: true },
  { to: "/rexio-admin/tasks", key: "admin.nav.tasks", end: false },
  { to: "/rexio-admin/submissions", key: "admin.nav.submissions", end: false },
  { to: "/rexio-admin/withdrawals", key: "admin.nav.withdrawals", end: false },
  { to: "/rexio-admin/users", key: "admin.nav.users", end: false },
  { to: "/rexio-admin/support", key: "admin.nav.support", end: false },
];

export default function AdminLayout(): React.ReactElement {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    applySeo({
      title: t("admin.nav.title"),
      description: "",
      noIndex: true, // REQUIREMENT.md §9 — must never be indexed
    });
  }, [t]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-canvas-soft)" }}>
      {/* noindex meta is applied via applySeo above */}
      <header
        style={{
          background: "var(--color-primary)",
          color: "var(--color-on-primary)",
          padding: "var(--spacing-lg) var(--spacing-xl)",
        }}
      >
        <p style={{ margin: 0, fontSize: "18px", fontVariationSettings: '"wght" 540' }}>
          {t("admin.nav.title")}
        </p>
        {profile !== null && (
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-on-dark-mute)" }}>
            {profile.name} · {profile.phone}
          </p>
        )}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-md)", marginTop: "var(--spacing-lg)" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }: { isActive: boolean }) => ({
                color: "var(--color-on-primary)",
                fontSize: "14px",
                fontVariationSettings: '"wght" 540',
                padding: "8px 14px",
                borderRadius: "var(--rounded-sm)",
                background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                textDecoration: "none",
              })}
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={{ padding: "var(--spacing-xl)", maxWidth: "960px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
