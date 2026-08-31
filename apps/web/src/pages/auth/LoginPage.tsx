// apps/web/src/pages/auth/LoginPage.tsx
// Route: "/login"
// Phone + password login using synthesized-email auth pattern (REQUIREMENT.md §5).
// phoneToEmail() converts 01XXXXXXXXX → 01XXXXXXXXX@phone.wamarketingbd.internal.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { loginSchema, phoneToEmail } from "@wa-marketing-bd/shared-types";
import { AuthInputField } from "@/components/auth/AuthInputField";

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
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

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    const parsed = loginSchema.safeParse({ phone: normalized, password });
    if (!parsed.success) {
      const fieldPath = parsed.error.issues[0]?.path[0];
      if (fieldPath === "phone") {
        setError(t("auth.error.invalidPhone"));
      } else {
        setError(t("auth.error.passwordTooShort"));
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(normalized),
        password,
      });

      if (authError) {
        setError(mapAuthError(authError.message, t));
        return;
      }

      // authStore.onAuthStateChange handles SIGNED_IN → profile fetch + ban check.
      // RequireAuth redirects to /onboarding if onboarding is incomplete.
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
            id="phone"
            label={t("auth.login.phoneLabel")}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={t("auth.login.phonePlaceholder")}
            value={phone}
            onChange={setPhone}
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
