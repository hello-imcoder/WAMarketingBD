// apps/web/src/routes.tsx
// React Router v7 route tree — all routes use lazy() for code splitting (REQUIREMENT.md §11).
// /rexio-admin is a separate lazy chunk from the public/user bundle.
// AdminLayout enforces noindex,nofollow meta at layout level (REQUIREMENT.md §9).

import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";

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
const P2PPage = lazy(() => import("@/pages/app/P2PPage"));
const WalletPage = lazy(() => import("@/pages/app/WalletPage"));
const HistoryPage = lazy(() => import("@/pages/app/HistoryPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));

// ─── Admin panel — separate chunk (never bundled with user code) ───────────────
const AdminPage = lazy(() => import("@/pages/rexio-admin/AdminPage"));

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

      // User panel — protected (auth guard added at Milestone 3)
      {
        path: "app",
        element: withSuspense(<AppLayout />),
        children: [
          { index: true, element: withSuspense(<AppIndexPage />) },
          { path: "task", element: withSuspense(<TaskPage />) },
          { path: "p2p", element: withSuspense(<P2PPage />) },
          { path: "wallet", element: withSuspense(<WalletPage />) },
          { path: "history", element: withSuspense(<HistoryPage />) },
          { path: "settings", element: withSuspense(<SettingsPage />) },
        ],
      },

      // Admin panel — separate chunk, noindex enforced at AdminLayout level
      {
        path: "rexio-admin",
        element: withSuspense(<AdminLayout />),
        children: [
          { index: true, element: withSuspense(<AdminPage />) },
        ],
      },
    ],
  },
]);
