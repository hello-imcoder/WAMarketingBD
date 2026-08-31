// apps/web/src/pages/auth/RegisterPage.tsx
// Route: "/reg"
// Phone + password signup with optional referral code (REQUIREMENT.md §5, §6.5).
// Phone → synthesized email via phoneToEmail(). Referral code read from ?ref= query param.
// If referral code is invalid, the DB trigger silently ignores it — signup is never blocked.
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { signupSchema, phoneToEmail } from "@wa-marketing-bd/shared-types";
import { AuthInputField } from "@/components/auth/AuthInputField";

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

function mapAuthError(message: string, t: (k: string) => string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return t("auth.error.phoneAlreadyExists");
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return t("auth.error.rateLimited");
  }
  return t("auth.error.generic");
}

export default function RegisterPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Pre-fill referral code from ?ref= query param; user can clear it
  const [referralCode, setReferralCode] = useState(
    searchParams.get("ref") ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    const trimmedCode = referralCode.trim() || undefined;

    const parsed = signupSchema.safeParse({
      phone: normalized,
      password,
      referralCodeUsed: trimmedCode,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path[0];
      if (fieldPath === "phone") {
        setError(t("auth.error.invalidPhone"));
      } else if (fieldPath === "password") {
        setError(t("auth.error.passwordTooShort"));
      } else {
        setError(t("auth.error.generic"));
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: phoneToEmail(normalized),
        password,
        options: {
          data: {
            phone: normalized,
            // Passed to handle_new_user() trigger via raw_user_meta_data.
            // Trigger resolves the code to a referrer UUID; silently nulls if invalid.
            referral_code_used: trimmedCode ?? null,
          },
          // emailRedirectTo intentionally omitted — email confirmations are disabled (config.toml).
        },
      });

      if (authError) {
        setError(mapAuthError(authError.message, t));
        return;
      }

      // Supabase returns session immediately when email confirmation is OFF.
      // If session is null, email confirmation is still enabled in the Dashboard —
      // this needs to be turned off in: Auth > Settings > "Confirm email".
      if (!data.session) {
        setError(
          "Account created but confirmation is required. Contact support.",
        );
        return;
      }

      // Navigate to onboarding to collect name (required) and optional real email.
      void navigate("/onboarding");
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
          <p className="auth-subtitle">{t("auth.register.subtitle")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <AuthInputField
            id="reg-phone"
            label={t("auth.register.phoneLabel")}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={t("auth.register.phonePlaceholder")}
            value={phone}
            onChange={setPhone}
          />

          <AuthInputField
            id="reg-password"
            label={t("auth.register.passwordLabel")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />

          <AuthInputField
            id="reg-referral"
            label={t("auth.register.referralLabel")}
            type="text"
            autoComplete="off"
            placeholder={t("auth.register.referralPlaceholder")}
            value={referralCode}
            onChange={setReferralCode}
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
            {isSubmitting
              ? t("common.loading")
              : t("auth.register.submitButton")}
          </button>
        </form>

        <p className="auth-footer-text">
          {t("auth.register.hasAccount")}{" "}
          <Link to="/login" className="auth-link">
            {t("auth.register.loginLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
