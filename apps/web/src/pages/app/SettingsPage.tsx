// apps/web/src/pages/app/SettingsPage.tsx
// Route: "/app/settings"
// Shows a menu list of settings sections; clicking an item slides into that
// section (with a Back button to return). Sections: Profile, Password,
// Support, Logout.
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
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SupportSection } from "@/components/user/SupportSection";
import { applySeo } from "@/lib/seo";
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "profile" | "password" | "support" | "logout";

// ─── Shared back-button style ─────────────────────────────────────────────────

const backBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "none",
  border: "none",
  padding: "0 0 var(--spacing-xl) 0",
  fontSize: "15px",
  color: "var(--color-ink-mute)",
  cursor: "pointer",
  fontVariationSettings: '"wght" 500',
};

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ onBack }: { onBack: () => void }): React.ReactElement {
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
    <section className="settings-section" style={{ borderBottom: "none" }}>
      <button type="button" style={backBtnStyle} onClick={onBack}>
        ← {t("common.back")}
      </button>
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

function PasswordSection({ onBack }: { onBack: () => void }): React.ReactElement {
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
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(profile.phone),
        password: currentPassword,
      });

      if (reAuthError) {
        setError(t("settings.password.error.wrongCurrentPassword"));
        return;
      }

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
    <section className="settings-section" style={{ borderBottom: "none" }}>
      <button type="button" style={backBtnStyle} onClick={onBack}>
        ← {t("common.back")}
      </button>
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
          {isSaving ? t("common.saving") : t("settings.password.submitButton")}
        </button>
      </form>
    </section>
  );
}

// ─── Support wrapper (with Back button) ───────────────────────────────────────

function SupportWrapper({ onBack }: { onBack: () => void }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div>
      <button type="button" style={backBtnStyle} onClick={onBack}>
        ← {t("common.back")}
      </button>
      <SupportSection />
    </div>
  );
}

// ─── Logout section ──────────────────────────────────────────────────────────

function LogoutSectionView({ onBack }: { onBack: () => void }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <section className="settings-section" style={{ borderBottom: "none" }}>
      <button type="button" style={backBtnStyle} onClick={onBack}>
        ← {t("common.back")}
      </button>
      <h2 className="settings-section-title">{t("auth.logout.title")}</h2>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-caption-size)",
          color: "var(--color-ink-mute)",
          margin: "calc(-1 * var(--spacing-md)) 0 var(--spacing-lg)",
        }}
      >
        {t("auth.logout.hint")}
      </p>
      <LogoutButton />
    </section>
  );
}

// ─── Menu list ────────────────────────────────────────────────────────────────

const MENU_ITEMS: Array<{ key: Section; icon: string; labelKey: string }> = [
  { key: "profile",  icon: "👤", labelKey: "settings.profile.title" },
  { key: "password", icon: "🔑", labelKey: "settings.password.title" },
  { key: "support",  icon: "💬", labelKey: "support.title" },
  { key: "logout",   icon: "🚪", labelKey: "auth.logout.title" },
];

function SettingsMenu({ onSelect }: { onSelect: (s: Section) => void }): React.ReactElement {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  return (
    <div>
      {/* User info header */}
      {profile !== null && (
        <div
          style={{
            padding: "var(--spacing-xl)",
            marginBottom: "var(--spacing-lg)",
            background: "var(--color-canvas-soft)",
            borderRadius: "var(--rounded-lg)",
            border: "1px solid var(--color-hairline)",
          }}
        >
          <p style={{ margin: 0, fontSize: "18px", fontVariationSettings: '"wght" 600' }}>
            {profile.name !== "" ? profile.name : t("settings.profile.namePlaceholder")}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-ink-mute)" }}>
            {profile.phone}
          </p>
        </div>
      )}

      {/* Menu items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "var(--spacing-lg) var(--spacing-xl)",
              background: "var(--color-canvas)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-lg)",
              cursor: "pointer",
              textAlign: "left",
              color: item.key === "logout" ? "#b3261e" : "var(--color-ink)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", fontSize: "15px", fontVariationSettings: '"wght" 500' }}>
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {t(item.labelKey)}
            </span>
            <span style={{ fontSize: "18px", color: "var(--color-ink-faint)" }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  useEffect(() => {
    applySeo({ title: t("settings.metaTitle"), description: "" });
  }, [t]);

  function goBack(): void {
    setActiveSection(null);
  }

  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "600px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontVariationSettings: '"wght" 540',
          margin: "0 0 var(--spacing-xl)",
          display: activeSection !== null ? "none" : "block",
        }}
      >
        {t("settings.metaTitle")}
      </h1>

      {activeSection === null && <SettingsMenu onSelect={setActiveSection} />}
      {activeSection === "profile"  && <ProfileSection onBack={goBack} />}
      {activeSection === "password" && <PasswordSection onBack={goBack} />}
      {activeSection === "support"  && <SupportWrapper onBack={goBack} />}
      {activeSection === "logout"   && <LogoutSectionView onBack={goBack} />}
    </main>
  );
}
