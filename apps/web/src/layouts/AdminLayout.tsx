// apps/web/src/layouts/AdminLayout.tsx
// Admin panel layout — /rexio-admin
// §9: noindex,nofollow meta required at layout level (not just robots.txt).
//
// Professional shell: fixed dark-navy sidebar (desktop), hamburger drawer
// (mobile), sticky topbar, wide content column. Sidebar items carry live
// pending-count badges; the whole shell is wrapped in AdminToastProvider.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardCheck,
  Wallet,
  Users,
  LifeBuoy,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { applySeo } from "@/lib/seo";
import { useAuthStore } from "@/stores/authStore";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Logo } from "@/components/ui/Logo";
import { AdminToastProvider } from "@/components/admin/ui";
import { useAdminNavCounts } from "@/hooks/useAdminNavCounts";
import type { ReactNode } from "react";

type NavItem = {
  to: string;
  key: string;
  label: string;
  icon: ReactNode;
  end: boolean;
  badge?: number;
};

function buildNavItems(
  t: (k: string) => string,
  counts: ReturnType<typeof useAdminNavCounts>,
): NavItem[] {
  return [
    { to: "/rexio-admin", key: "admin.nav.dashboard", label: t("admin.nav.dashboard"), icon: <LayoutDashboard size={18} />, end: true },
    { to: "/rexio-admin/tasks", key: "admin.nav.tasks", label: t("admin.nav.tasks"), icon: <ListChecks size={18} />, end: false, badge: counts.activeTasks },
    { to: "/rexio-admin/submissions", key: "admin.nav.submissions", label: t("admin.nav.submissions"), icon: <ClipboardCheck size={18} />, end: false, badge: counts.pendingSubmissions },
    { to: "/rexio-admin/withdrawals", key: "admin.nav.withdrawals", label: t("admin.nav.withdrawals"), icon: <Wallet size={18} />, end: false, badge: counts.pendingWithdrawals },
    { to: "/rexio-admin/users", key: "admin.nav.users", label: t("admin.nav.users"), icon: <Users size={18} />, end: false },
    { to: "/rexio-admin/support", key: "admin.nav.support", label: t("admin.nav.support"), icon: <LifeBuoy size={18} />, end: false, badge: counts.openTickets },
    { to: "/rexio-admin/settings", key: "admin.nav.settings", label: t("admin.nav.settings"), icon: <Settings size={18} />, end: false },
  ];
}

function SidebarNav({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}): React.ReactElement {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          title={collapsed ? item.key : undefined}
          className={({ isActive }: { isActive: boolean }) =>
            `flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm no-underline transition-colors wt-540 ${
              isActive
                ? "bg-sidebar-item-active text-on-primary"
                : "text-on-dark-mute hover:bg-sidebar-item-hover hover:text-on-primary"
            }`
          }
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && item.badge !== undefined && item.badge > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-surface-violet-soft px-1.5 text-[11px] wt-600 text-primary">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout(): React.ReactElement {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const location = useLocation();
  const counts = useAdminNavCounts();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applySeo({
      title: t("admin.nav.title"),
      description: "",
      noIndex: true, // REQUIREMENT.md §9 — must never be indexed
    });
  }, [t]);

  // Close the mobile drawer after every navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const items: NavItem[] = buildNavItems(t, counts);

  const activeItem = [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );

  const navList = (collapsed: boolean, onNavigate?: () => void): React.ReactElement => (
    <SidebarNav items={items} collapsed={collapsed} onNavigate={onNavigate} />
  );

  return (
    <AdminToastProvider>
      <div className="min-h-dvh bg-canvas-soft">
        {/* ── Desktop sidebar ─────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar lg:flex ${
            collapsed ? "w-[72px]" : "w-60"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Logo variant="dark" badgeOnly={collapsed} />
          </div>
          {navList(collapsed)}
          <div className="border-t border-sidebar-border p-3">
            {!collapsed && profile !== null && (
              <p className="mb-2 truncate px-1 text-xs text-on-dark-faint">
                {profile.name} · {profile.phone}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed((c) => !c)}
                className="cursor-pointer rounded-md p-2 text-on-dark-mute transition-colors hover:bg-sidebar-item-hover hover:text-on-primary"
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              {!collapsed && <LogoutButton variant="onDark" />}
            </div>
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
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                  className="cursor-pointer rounded-md p-1.5 text-on-dark-mute hover:bg-sidebar-item-hover"
                >
                  <X size={18} />
                </button>
              </div>
              {navList(false, () => setDrawerOpen(false))}
              {profile !== null && (
                <p className="border-t border-sidebar-border px-4 py-3 text-xs text-on-dark-faint">
                  {profile.name} · {profile.phone}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className={`flex min-h-dvh flex-col transition-[padding] ${collapsed ? "lg:pl-[72px]" : "lg:pl-60"}`}>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-canvas px-4 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="cursor-pointer rounded-md p-1.5 text-ink-mute hover:bg-canvas-soft lg:hidden"
            >
              <Menu size={20} />
            </button>
            <p className="wt-540 m-0 truncate text-base text-ink">
              {activeItem !== undefined ? t(activeItem.key) : t("admin.nav.title")}
            </p>
            {profile !== null && (
              <p className="m-0 ml-auto hidden truncate text-[13px] text-ink-mute sm:block">
                {profile.name} · {profile.phone}
              </p>
            )}
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
