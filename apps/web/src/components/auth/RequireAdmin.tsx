// apps/web/src/components/auth/RequireAdmin.tsx
// Route guard for /rexio-admin routes.
// Applies all RequireAuth checks, then additionally verifies profile.role === 'su_admin'.
// Role is read from the DB-fetched profile, never from a JWT claim alone (§12).
// A non-admin authenticated user is redirected to /app, not /login.
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import { USER_ROLE } from "@wa-marketing-bd/shared-types";

export function RequireAdmin(): React.ReactElement {
  const { session, profile, isLoading, isOnboardingComplete } = useAuthStore();

  if (isLoading) {
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

  // Server-fetched role check — profile.role comes from the DB, not a JWT claim.
  if (profile?.role !== USER_ROLE.SU_ADMIN) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
