// apps/web/src/routes.tsx
// React Router v7 route tree — all routes use lazy() for code splitting (REQUIREMENT.md §11).
// /rexio-admin is a separate lazy chunk from the public/user bundle.
// Auth guards (RequireAuth, RequireAdmin) are wired at layout level — Milestone 3.
// AdminLayout enforces noindex,nofollow meta at layout level (REQUIREMENT.md §9).

import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

// ─── Layouts ─────────────────────────────────────────────────────────────────
import RootLayout from "@/layouts/RootLayout";
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));

// ─── Public pages ─────────────────────────────────────────────────────────────
const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const OnboardingPage = lazy(() => import("@/pages/auth/OnboardingPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("@/pages/TermsOfServicePage"));

// ─── User panel pages ─────────────────────────────────────────────────────────
const AppIndexPage = lazy(() => import("@/pages/app/AppIndexPage"));
const TaskPage = lazy(() => import("@/pages/app/TaskPage"));
const TaskDetailPage = lazy(() => import("@/pages/app/TaskDetailPage"));
const P2PPage = lazy(() => import("@/pages/app/P2PPage"));
const WalletPage = lazy(() => import("@/pages/app/WalletPage"));
const HistoryPage = lazy(() => import("@/pages/app/HistoryPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));

// ─── Admin panel — separate chunk (never bundled with user code) ───────────────
const AdminPage = lazy(() => import("@/pages/rexio-admin/AdminPage"));
const AdminTaskManagerPage = lazy(() => import("@/pages/rexio-admin/AdminTaskManagerPage"));
const AdminTaskDetailPage = lazy(() => import("@/pages/rexio-admin/AdminTaskDetailPage"));
const AdminSubmissionReviewPage = lazy(() => import("@/pages/rexio-admin/AdminSubmissionReviewPage"));
const AdminWithdrawalPage = lazy(() => import("@/pages/rexio-admin/AdminWithdrawalPage"));
const AdminUsersPage = lazy(() => import("@/pages/rexio-admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("@/pages/rexio-admin/AdminUserDetailPage"));
const AdminSupportPage = lazy(() => import("@/pages/rexio-admin/AdminSupportPage"));
const AdminSettingsPage = lazy(() => import("@/pages/rexio-admin/AdminSettingsPage"));

// ─── Fallback ─────────────────────────────────────────────────────────────────
function PageLoader(): React.ReactElement {
  // Milestone 13: replace with per-route skeleton loading states
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
    >
      <span>Loading…</span>
    </div>
  );
}

function withSuspense(element: React.ReactElement): React.ReactElement {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Public / landing
      { index: true, element: withSuspense(<LandingPage />) },
      { path: "login", element: withSuspense(<LoginPage />) },
      { path: "reg", element: withSuspense(<RegisterPage />) },
      { path: "onboarding", element: withSuspense(<OnboardingPage />) },
      { path: "privacy-policy", element: withSuspense(<PrivacyPolicyPage />) },
      { path: "terms-of-service", element: withSuspense(<TermsOfServicePage />) },

      // User panel — RequireAuth gate: redirects to /login or /onboarding as needed.
      // AppLayout renders the bottom nav + Outlet for child routes.
      {
        path: "app",
        element: <RequireAuth />,
        children: [
          {
            element: withSuspense(<AppLayout />),
            children: [
              { index: true, element: withSuspense(<AppIndexPage />) },
              { path: "task", element: withSuspense(<TaskPage />) },
              { path: "task/:taskId", element: withSuspense(<TaskDetailPage />) },
              { path: "p2p", element: withSuspense(<P2PPage />) },
              { path: "wallet", element: withSuspense(<WalletPage />) },
              { path: "history", element: withSuspense(<HistoryPage />) },
              { path: "settings", element: withSuspense(<SettingsPage />) },
            ],
          },
        ],
      },

      // Admin panel — RequireAdmin gate: checks session + onboarding + su_admin role.
      // AdminLayout enforces noindex,nofollow at layout level (§9).
      {
        path: "rexio-admin",
        element: <RequireAdmin />,
        children: [
          {
            element: withSuspense(<AdminLayout />),
            children: [
              { index: true, element: withSuspense(<AdminPage />) },
              { path: "tasks", element: withSuspense(<AdminTaskManagerPage />) },
              { path: "tasks/:taskId", element: withSuspense(<AdminTaskDetailPage />) },
              { path: "submissions", element: withSuspense(<AdminSubmissionReviewPage />) },
              { path: "withdrawals", element: withSuspense(<AdminWithdrawalPage />) },
              { path: "users", element: withSuspense(<AdminUsersPage />) },
              { path: "users/:userId", element: withSuspense(<AdminUserDetailPage />) },
              { path: "support", element: withSuspense(<AdminSupportPage />) },
              { path: "settings", element: withSuspense(<AdminSettingsPage />) },
            ],
          },
        ],
      },
    ],
  },
]);
