// apps/web/src/pages/app/SettingsPage.tsx
// Route: "/app/settings"
// Shows a menu list of settings sections; clicking an item slides into that
// section (with a Back button to return). Sections: Profile, Password,
// Support, Logout.
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LifeBuoy,
  LogOut,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
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
import { Button, Card, CardBody, CardHeader, PageHeader } from "@/components/app/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "profile" | "password" | "support" | "logout";

// ─── Shared back button ───────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="sm" onClick={onBack}>
      <ArrowLeft size={16} />
      {t("common.back")}
    </Button>
  );
}

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
    <Card>
      <CardHeader title={t("settings.profile.title")} icon={<UserRound size={18} />} />
      <CardBody className="flex flex-col gap-4">
        <BackButton onBack={onBack} />

        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
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

          <p className="m-0 text-xs text-ink-mute">{t("settings.profile.emailHint")}</p>

          {error !== null && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="m-0 text-sm text-success">
              {t("settings.profile.savedMessage")}
            </p>
          )}

          <Button type="submit" loading={isSaving} className="w-full sm:w-auto">
            {t("settings.profile.saveButton")}
          </Button>
        </form>
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader title={t("settings.password.title")} icon={<KeyRound size={18} />} />
      <CardBody className="flex flex-col gap-4">
        <BackButton onBack={onBack} />

        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
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
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="m-0 text-sm text-success">
              {t("settings.password.successMessage")}
            </p>
          )}

          <Button type="submit" loading={isSaving} className="w-full sm:w-auto">
            {t("settings.password.submitButton")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

// ─── Support wrapper (with Back button) ───────────────────────────────────────

function SupportWrapper({ onBack }: { onBack: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackButton onBack={onBack} />
      </div>
      <SupportSection />
    </div>
  );
}

// ─── Logout section ──────────────────────────────────────────────────────────

function LogoutSectionView({ onBack }: { onBack: () => void }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t("auth.logout.title")} icon={<LogOut size={18} />} />
      <CardBody className="flex flex-col gap-4">
        <BackButton onBack={onBack} />
        <p className="m-0 text-sm text-ink-mute">{t("auth.logout.hint")}</p>
        <LogoutButton />
      </CardBody>
    </Card>
  );
}

// ─── Menu list ────────────────────────────────────────────────────────────────

const MENU_ITEMS: Array<{ key: Section; icon: ReactNode; labelKey: string; danger?: boolean }> = [
  { key: "profile", icon: <UserRound size={18} />, labelKey: "settings.profile.title" },
  { key: "password", icon: <KeyRound size={18} />, labelKey: "settings.password.title" },
  { key: "support", icon: <LifeBuoy size={18} />, labelKey: "support.title" },
  { key: "logout", icon: <LogOut size={18} />, labelKey: "auth.logout.title", danger: true },
];

function SettingsMenu({ onSelect }: { onSelect: (s: Section) => void }): React.ReactElement {
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  return (
    <div className="flex flex-col gap-4">
      {/* User info header */}
      {profile !== null && (
        <Card className="bg-canvas-soft">
          <CardBody className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <p className="wt-540 m-0 truncate text-base text-ink">
                {profile.name !== "" ? profile.name : t("settings.profile.namePlaceholder")}
              </p>
              <p className="m-0 truncate text-[13px] text-ink-mute">{profile.phone}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Menu items */}
      <Card className="divide-y divide-hairline overflow-hidden">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-canvas-soft ${
              item.danger === true ? "text-danger" : "text-ink"
            }`}
          >
            <span className="flex items-center gap-3 text-sm wt-460">
              <span
                className={`grid size-9 place-items-center rounded-lg ${
                  item.danger === true
                    ? "bg-danger-soft text-danger"
                    : "bg-canvas-soft text-ink-mute"
                }`}
              >
                {item.icon}
              </span>
              {t(item.labelKey)}
            </span>
            <ChevronRight size={18} className="text-ink-faint" />
          </button>
        ))}
      </Card>
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {activeSection === null && (
        <PageHeader title={t("settings.metaTitle")} />
      )}

      {activeSection === null && <SettingsMenu onSelect={setActiveSection} />}
      {activeSection === "profile" && <ProfileSection onBack={goBack} />}
      {activeSection === "password" && <PasswordSection onBack={goBack} />}
      {activeSection === "support" && <SupportWrapper onBack={goBack} />}
      {activeSection === "logout" && <LogoutSectionView onBack={goBack} />}
    </div>
  );
}
