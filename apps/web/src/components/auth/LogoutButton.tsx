// apps/web/src/components/auth/LogoutButton.tsx
// Shared sign-out control for both the user panel (/app/settings) and the admin
// panel header (/rexio-admin).
//
// authStore.signOut() calls supabase.auth.signOut() — which clears the persisted
// session from localStorage — then resets session/profile/isOnboardingComplete in
// the store. Clearing store state is what makes RequireAuth/RequireAdmin bounce
// any still-mounted protected route, so we navigate to /login with `replace` to
// keep the signed-in page out of session history (no back-button re-entry).
//
// `variant` only selects presentation: "primary" is the full-width button used in
// the Settings page, "onDark" is the compact outlined control used on the admin
// panel's indigo header.
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";

interface LogoutButtonProps {
  variant?: "primary" | "onDark";
}

export function LogoutButton({
  variant = "primary",
}: LogoutButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleClick(): Promise<void> {
    setIsSigningOut(true);
    try {
      await signOut();
      void navigate("/login", { replace: true });
    } finally {
      // Reached only if navigation did not unmount this component (e.g. signOut
      // threw). Leaving the button disabled forever would trap the user on a
      // page whose session is already gone.
      setIsSigningOut(false);
    }
  }

  const label = isSigningOut ? t("auth.logout.pending") : t("auth.logout.button");

  if (variant === "onDark") {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSigningOut}
        style={{
          padding: "8px 14px",
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
          fontVariationSettings: '"wght" 600',
          color: "var(--color-on-primary)",
          background: "transparent",
          border: "1px solid var(--color-hairline-dark)",
          borderRadius: "var(--rounded-sm)",
          cursor: isSigningOut ? "not-allowed" : "pointer",
          opacity: isSigningOut ? 0.6 : 1,
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isSigningOut}
      className="logout-btn"
    >
      {label}
    </button>
  );
}
