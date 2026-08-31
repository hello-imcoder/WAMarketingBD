// apps/web/src/layouts/AppLayout.tsx
// User panel layout — bottom mobile navbar (REQUIREMENT.md §6.1)
// Order: Task → P2P → Wallet → History → Settings
import { NavLink, Outlet } from "react-router";

const NAV_ITEMS = [
  { to: "/app/task",     label: "Task" },
  { to: "/app/p2p",      label: "P2P" },
  { to: "/app/wallet",   label: "Wallet" },
  { to: "/app/history",  label: "History" },
  { to: "/app/settings", label: "Settings" },
] as const;

export default function AppLayout(): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <nav aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
