// apps/web/src/pages/auth/LoginPage.tsx
// Route: "/login"
// Phone + password login using synthesized-email auth pattern (REQUIREMENT.md §5).
// phoneToEmail() converts 01XXXXXXXXX → 01XXXXXXXXX@phone.wamarketingbd.internal.
//
// The identifier field also accepts a real email address. The su_admin account is
// created by scripts/bootstrap-admin.ts with a real email as its Auth identity
// (not a synthesized phone email), so email login is required for admin access
// (REQUIREMENT.md §5 — "Admin login: single super-admin"). Regular users still
// sign up and sign in with a phone number.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { loginSchema, phoneToEmail } from "@wa-marketing-bd/shared-types";
import { AuthInputField } from "@/components/auth/AuthInputField";

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

/** An identifier containing "@" is treated as an email, never as a phone number. */
function isEmailIdentifier(raw: string): boolean {
  return raw.includes("@");
}

function mapAuthError(message: string, t: (k: string) => string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return t("auth.error.invalidCredentials");
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return t("auth.error.rateLimited");
  }
  return t("auth.error.generic");
}

export default function LoginPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const raw = identifier.trim();
    const usingEmail = isEmailIdentifier(raw);

    // Email path (admin): validate only the password via the shared schema —
    // Supabase itself rejects a malformed email with an auth error.
    // Phone path (users): validate both fields against loginSchema as before.
    let authEmail: string;
    if (usingEmail) {
      const parsedPassword = loginSchema.shape.password.safeParse(password);
      if (!parsedPassword.success) {
        setError(t("auth.error.passwordTooShort"));
        return;
      }
      authEmail = raw.toLowerCase();
    } else {
      const normalized = normalizePhone(raw);
      const parsed = loginSchema.safeParse({ phone: normalized, password });
      if (!parsed.success) {
        const fieldPath = parsed.error.issues[0]?.path[0];
        if (fieldPath === "phone") {
          setError(t("auth.error.invalidIdentifier"));
        } else {
          setError(t("auth.error.passwordTooShort"));
        }
        return;
      }
      authEmail = phoneToEmail(normalized);
    }

    setIsSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError) {
        setError(mapAuthError(authError.message, t));
        return;
      }

      // authStore.onAuthStateChange handles SIGNED_IN → profile fetch + ban check.
      // RequireAuth redirects to /onboarding if onboarding is incomplete.
      // Admins land on /app, then navigate to /rexio-admin (RequireAdmin gates it).
      void navigate("/app");
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-wordmark">WA Marketing BD</h1>
          <p className="auth-subtitle">{t("auth.login.subtitle")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <AuthInputField
            id="identifier"
            label={t("auth.login.identifierLabel")}
            type="text"
            autoComplete="username"
            placeholder={t("auth.login.identifierPlaceholder")}
            value={identifier}
            onChange={setIdentifier}
          />

          <AuthInputField
            id="password"
            label={t("auth.login.passwordLabel")}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />

          {error !== null && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
          >
            {isSubmitting ? t("common.loading") : t("auth.login.submitButton")}
          </button>
        </form>

        <p className="auth-footer-text">
          {t("auth.login.noAccount")}{" "}
          <Link to="/reg" className="auth-link">
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
