// apps/web/src/components/auth/RequireAuth.tsx
// Route guard for /app/** routes.
// Redirect logic:
//   isLoading         → skeleton (wait for hydration)
//   !session          → /login
//   !isOnboardingComplete → /onboarding
//   else              → render children
// Role is never read from a JWT claim — gate on profile.role fetched from DB.
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/authStore";

export function RequireAuth(): React.ReactElement {
  const { session, isLoading, isOnboardingComplete } = useAuthStore();

  if (isLoading) {
    // Milestone 13 will replace this with per-route skeleton components.
    return (
      <div
        role="status"
        aria-label="Loading"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-sans)",
          color: "var(--color-ink-mute)",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
