// apps/web/src/pages/app/SettingsPage.tsx
// Route: "/app/settings"
// Profile section (Milestone 3): name, contact email, password change.
// Support section (Milestone 10): stubbed — filled in at that milestone.
//
// Password change flow:
//   1. Re-authenticate via signInWithPassword using the synthesized email + current password.
//   2. If that succeeds, call supabase.auth.updateUser({ password: newPassword }).
//   This is the practical workaround for Supabase lacking a "verify current password" API.
//   Required for a financial app — prevents a hijacked session from silently changing credentials.
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import {
  profileUpdateSchema,
  passwordChangeSchema,
  phoneToEmail,
} from "@wa-marketing-bd/shared-types";
import { AuthInputField } from "@/components/auth/AuthInputField";

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection(): React.ReactElement {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useAuthStore();

  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = profileUpdateSchema.safeParse({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }

    if (!session) return;

    setIsSaving(true);
    try {
      const update: Record<string, string> = {};
      if (parsed.data.name !== undefined) update["name"] = parsed.data.name;
      // Always send email field (even if empty string) to allow clearing it
      update["email"] = parsed.data.email ?? "";

      const { error: dbError } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", session.user.id);

      if (dbError) {
        setError(t("auth.error.generic"));
        return;
      }

      await refreshProfile();
      setSuccess(true);
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t("settings.profile.title")}</h2>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <AuthInputField
          id="settings-name"
          label={t("settings.profile.nameLabel")}
          type="text"
          autoComplete="name"
          placeholder={t("settings.profile.namePlaceholder")}
          value={name}
          onChange={setName}
        />

        <AuthInputField
          id="settings-email"
          label={t("settings.profile.emailLabel")}
          type="email"
          autoComplete="email"
          placeholder={t("settings.profile.emailPlaceholder")}
          value={email}
          onChange={setEmail}
        />

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-caption-size)",
            color: "var(--color-ink-mute)",
            marginBottom: "var(--spacing-lg)",
            marginTop: "calc(-1 * var(--spacing-sm))",
          }}
        >
          {t("settings.profile.emailHint")}
        </p>

        {error !== null && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="settings-success">
            {t("settings.profile.savedMessage")}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="auth-submit-btn"
          style={{ maxWidth: "200px" }}
        >
          {isSaving ? t("common.saving") : t("settings.profile.saveButton")}
        </button>
      </form>
    </section>
  );
}

// ─── Password-change section ──────────────────────────────────────────────────

function PasswordSection(): React.ReactElement {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = passwordChangeSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }

    if (!profile) return;

    setIsSaving(true);
    try {
      // Step 1: Re-authenticate to verify current password.
      // Supabase has no "verify current password" API, so we re-sign-in as the workaround.
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(profile.phone),
        password: currentPassword,
      });

      if (reAuthError) {
        setError(t("settings.password.error.wrongCurrentPassword"));
        return;
      }

      // Step 2: Current password verified — update to new password.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(t("auth.error.generic"));
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t("settings.password.title")}</h2>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <AuthInputField
          id="settings-current-pw"
          label={t("settings.password.currentLabel")}
          type="password"
          autoComplete="current-password"
          placeholder={t("settings.password.currentPlaceholder")}
          value={currentPassword}
          onChange={setCurrentPassword}
        />

        <AuthInputField
          id="settings-new-pw"
          label={t("settings.password.newLabel")}
          type="password"
          autoComplete="new-password"
          placeholder={t("settings.password.newPlaceholder")}
          value={newPassword}
          onChange={setNewPassword}
        />

        {error !== null && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="settings-success">
            {t("settings.password.successMessage")}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="auth-submit-btn"
          style={{ maxWidth: "220px" }}
        >
          {isSaving
            ? t("common.saving")
            : t("settings.password.submitButton")}
        </button>
      </form>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage(): React.ReactElement {
  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <ProfileSection />
      <PasswordSection />
      {/* Support section — Milestone 10 */}
    </main>
  );
}
