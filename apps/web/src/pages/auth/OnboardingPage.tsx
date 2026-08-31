// apps/web/src/pages/auth/OnboardingPage.tsx
// Route: "/onboarding" — shown immediately after signup and on any login where name = ''.
// Collects name (required) and optional real contact email → stored in profiles.name / profiles.email.
// profiles.email is a separate contact field; auth.users.email remains the synthesized login email.
// Completing onboarding sets name to a non-empty string, which flips isOnboardingComplete = true.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { onboardingSchema } from "@wa-marketing-bd/shared-types";
import { AuthInputField } from "@/components/auth/AuthInputField";

export default function OnboardingPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, refreshProfile } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const parsed = onboardingSchema.safeParse({
      name: name.trim(),
      email: email.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }

    if (!session) {
      setError(t("auth.error.generic"));
      return;
    }

    setIsSubmitting(true);
    try {
      const update: { name: string; email?: string } = { name: parsed.data.name };
      if (parsed.data.email) {
        update.email = parsed.data.email;
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", session.user.id);

      if (dbError) {
        setError(t("auth.error.generic"));
        return;
      }

      // Refresh store so isOnboardingComplete flips to true → RequireAuth lets through.
      await refreshProfile();
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
          <h1 className="auth-wordmark">{t("auth.onboarding.title")}</h1>
          <p className="auth-subtitle">{t("auth.onboarding.subtitle")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <AuthInputField
            id="onboarding-name"
            label={t("auth.onboarding.nameLabel")}
            type="text"
            autoComplete="name"
            placeholder={t("auth.onboarding.namePlaceholder")}
            value={name}
            onChange={setName}
          />

          <AuthInputField
            id="onboarding-email"
            label={t("auth.onboarding.emailLabel")}
            type="email"
            autoComplete="email"
            placeholder={t("auth.onboarding.emailPlaceholder")}
            value={email}
            onChange={setEmail}
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
              ? t("common.saving")
              : t("auth.onboarding.submitButton")}
          </button>
        </form>
      </div>
    </main>
  );
}
