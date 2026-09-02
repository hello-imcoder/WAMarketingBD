// apps/web/src/layouts/AppLayout.tsx
// User panel layout — /app
// Mobile: sticky bottom nav (REQUIREMENT.md §6.1) with icons, labels and
// actionable-count badges. Desktop (≥lg): dark sidebar like the admin panel,
// wide content column. Whole shell wrapped in AppToastProvider.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  ArrowLeftRight,
  Wallet,
  History as HistoryIcon,
  Settings,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { applySeo } from "@/lib/seo";
import { useAuthStore } from "@/stores/authStore";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Logo } from "@/components/ui/Logo";
import { AppToastProvider } from "@/components/app/ui";
import { GlobalNoticeManager } from "@/components/app/GlobalNoticeManager";
import { useAppNavCounts } from "@/hooks/useAppNavCounts";

type NavItem = {
  to: string;
  labelKey: string;
  icon: ReactNode;
  end: boolean;
  badge?: number;
};

function buildNavItems(counts: ReturnType<typeof useAppNavCounts>): NavItem[] {
  return [
    { to: "/app/task", labelKey: "app.nav.task", icon: <ClipboardList size={20} />, end: false, badge: counts.activeTasks },
    { to: "/app/p2p", labelKey: "app.nav.p2p", icon: <ArrowLeftRight size={20} />, end: false },
    { to: "/app/wallet", labelKey: "app.nav.wallet", icon: <Wallet size={20} />, end: false, badge: counts.pendingWithdrawals },
    { to: "/app/history", labelKey: "app.nav.history", icon: <HistoryIcon size={20} />, end: false },
    { to: "/app/settings", labelKey: "app.nav.settings", icon: <Settings size={20} />, end: false },
  ];
}

function NavBadge({ count }: { count: number }): React.ReactElement | null {
  if (count <= 0) return null;
  return (
    <span className="grid min-w-4 place-items-center rounded-full bg-surface-violet-soft px-1 text-[10px] wt-600 text-primary">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AppLayout(): React.ReactElement {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const location = useLocation();
  const counts = useAppNavCounts();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    applySeo({
      title: t("app.nav.title"),
      description: "",
      noIndex: true, // REQUIREMENT.md §9 — must never be indexed
    });
  }, [t]);

  // Close the mobile drawer after every navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const items: NavItem[] = buildNavItems(counts);

  // Mobile bottom nav — hidden ≥lg where the sidebar takes over.
  const bottomNav = (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 no-underline transition-colors ${
                isActive ? "text-primary" : "text-ink-mute hover:text-ink"
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span className="relative">
                  {item.icon}
                  <span className="absolute -right-2.5 -top-1.5">
                    <NavBadge count={item.badge ?? 0} />
                  </span>
                </span>
                <span className={`text-[11px] leading-tight ${isActive ? "wt-600" : "wt-460"}`}>
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );

  // Sidebar nav list — shared between the desktop rail and the mobile drawer.
  const sidebarNav = (onNavigate?: () => void): React.ReactElement => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm no-underline transition-colors wt-540 ${
              isActive
                ? "bg-sidebar-item-active text-on-primary"
                : "text-on-dark-mute hover:bg-sidebar-item-hover hover:text-on-primary"
            }`
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 truncate">{t(item.labelKey)}</span>
          <NavBadge count={item.badge ?? 0} />
        </NavLink>
      ))}
    </nav>
  );

  return (
    <AppToastProvider>
      <div className="min-h-dvh bg-canvas-soft">
        <GlobalNoticeManager />

        {/* ── Desktop sidebar (≥lg) ───────────────────────────────────── */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar lg:flex">
          <div className="flex items-center gap-3 px-4 py-4">
            <Logo variant="dark" />
          </div>
          {sidebarNav()}
          <div className="border-t border-sidebar-border p-3">
            {profile !== null && (
              <p className="mb-2 truncate px-1 text-xs text-on-dark-faint">
                {profile.name} · {profile.phone}
              </p>
            )}
            <LogoutButton variant="onDark" />
          </div>
        </aside>

        {/* ── Mobile drawer ───────────────────────────────────────────── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-[rgba(14,12,31,0.55)] lg:hidden"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-64 flex-col bg-sidebar"
            >
              <div className="flex items-center justify-between px-4 py-4">
                <Logo variant="dark" />
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => setDrawerOpen(false)}
                  className="cursor-pointer rounded-md p-1.5 text-on-dark-mute hover:bg-sidebar-item-hover"
                >
                  <X size={18} />
                </button>
              </div>
              {sidebarNav(() => setDrawerOpen(false))}
              {profile !== null && (
                <p className="border-t border-sidebar-border px-4 py-3 text-xs text-on-dark-faint">
                  {profile.name} · {profile.phone}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-h-dvh flex-col lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-canvas px-4 lg:hidden">
            <button
              type="button"
              aria-label={t("common.openMenu")}
              onClick={() => setDrawerOpen(true)}
              className="cursor-pointer rounded-md p-1.5 text-ink-mute hover:bg-canvas-soft"
            >
              <Menu size={20} />
            </button>
            <Logo badgeOnly />
            <span className="wt-540 truncate text-sm text-ink">WA Marketing BD</span>
            {profile !== null && (
              <p className="m-0 ml-auto truncate text-[13px] text-ink-mute">
                {profile.name}
              </p>
            )}
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
            <Outlet />
          </main>
        </div>

        {bottomNav}
      </div>
    </AppToastProvider>
  );
}
