// apps/web/src/layouts/AppLayout.tsx
// User panel layout — bottom mobile navbar (REQUIREMENT.md §6.1)
// Order: Task → P2P → Wallet → History → Settings
import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { to: "/app/task", key: "task" },
  { to: "/app/p2p", key: "p2p" },
  { to: "/app/wallet", key: "wallet" },
  { to: "/app/history", key: "history" },
  { to: "/app/settings", key: "settings" },
] as const;

export default function AppLayout(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <nav
        aria-label="Main navigation"
        style={{
          display: "flex",
          justifyContent: "space-around",
          borderTop: "1px solid var(--color-hairline)",
          padding: "var(--spacing-md) 0",
          position: "sticky",
          bottom: 0,
          background: "var(--color-canvas)",
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              textDecoration: "none",
              fontSize: "14px",
              fontVariationSettings: '"wght" 600',
              color: isActive ? "var(--color-primary)" : "var(--color-ink-mute)",
              padding: "var(--spacing-sm) var(--spacing-md)",
            })}
          >
            {t(`app.nav.${item.key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

