// apps/web/src/pages/rexio-admin/AdminUserDetailPage.tsx
// Route: "/rexio-admin/users/:userId" — profile, wallet, submission/withdrawal
// history (admin RLS reads) + verify/ban/suspend actions via the
// admin-update-user Edge Function (SECURITY.md §1 — server-side only).
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { Profile, Submission, Wallet, Withdrawal } from "@wa-marketing-bd/shared-types";

const rowStyle: React.CSSProperties = {
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-md)",
  padding: "var(--spacing-lg)",
  background: "var(--color-canvas)",
};
const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "var(--rounded-md)",
  border: "1px solid var(--color-hairline)",
  background: "transparent",
  fontSize: "13px",
  cursor: "pointer",
};

export default function AdminUserDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { updateUser } = useAdminUsers();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (userId === undefined) return;
    setIsLoading(true);
    setError(null);
    const [pRes, wRes, sRes, wdRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(20),
      supabase.from("withdrawals").select("*").eq("user_id", userId).order("requested_at", { ascending: false }).limit(20),
    ]);
    if (pRes.error !== null) setError("load_failed");
    else {
      setProfile((pRes.data ?? null) as Profile | null);
      setWallet((wRes.data ?? null) as Wallet | null);
      setSubmissions((sRes.data ?? []) as Submission[]);
      setWithdrawals((wdRes.data ?? []) as Withdrawal[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null }): Promise<void> {
    if (userId === undefined) return;
    const code = await updateUser(userId, patch);
    if (code !== null) setError(code);
    else await load();
  }

  if (isLoading) return <p role="status">{t("common.loading")}</p>;
  if (profile === null) return <p role="alert">{t("admin.error.load_failed")}</p>;

  return (
    <div style={{ display: "grid", gap: "var(--spacing-xl)" }}>
      {error !== null && <p role="alert" style={{ color: "#b3261e" }}>{t("admin.error.generic")}</p>}
      <section style={rowStyle}>
        <h1 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>
          {profile.name === "" ? "—" : profile.name} <span style={{ color: "var(--color-ink-mute)", fontSize: "14px" }}>{profile.phone}</span>
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-ink-mute)" }}>
          {t("admin.users.referralCode")}: {profile.referral_code}
          {" · "}
          {t("admin.users.joined")}: {new Date(profile.created_at).toLocaleDateString()}
        </p>
        <div style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap", marginTop: "var(--spacing-lg)" }}>
          <button type="button" style={btnStyle} onClick={() => void act({ isVerified: !profile.is_verified })}>
            {profile.is_verified ? t("admin.users.unverify") : t("admin.users.verify")}
          </button>
          <button type="button" style={btnStyle} onClick={() => void act({ suspendedAt: profile.suspended_at === null ? new Date().toISOString() : null })}>
            {profile.suspended_at === null ? t("admin.users.suspend") : t("admin.users.unsuspend")}
          </button>
          <button type="button" style={{ ...btnStyle, color: "#b3261e", borderColor: "#b3261e" }} onClick={() => void act({ isBanned: !profile.is_banned })}>
            {profile.is_banned ? t("admin.users.unban") : t("admin.users.ban")}
          </button>
        </div>
      </section>

      {wallet !== null && (
        <section style={rowStyle}>
          <h2 style={{ fontSize: "16px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>{t("admin.users.wallet")}</h2>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {t("wallet.balanceTotal")}: ৳{wallet.balance_total} · {t("wallet.balanceVerified")}: ৳{wallet.balance_verified}
          </p>
        </section>
      )}

      <section style={rowStyle}>
        <h2 style={{ fontSize: "16px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>{t("admin.users.submissions")}</h2>
        {submissions.length === 0 && <p style={{ margin: 0, fontSize: "13px", color: "var(--color-ink-mute)" }}>{t("admin.users.none")}</p>}
        {submissions.map((s) => (
          <p key={s.id} style={{ margin: "6px 0 0", fontSize: "13px" }}>
            {new Date(s.submitted_at).toLocaleDateString()} · {t(`history.status.${s.status}`)}
            {s.rejection_reason !== null && ` — ${s.rejection_reason}`}
          </p>
        ))}
      </section>

      <section style={rowStyle}>
        <h2 style={{ fontSize: "16px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>{t("admin.users.withdrawals")}</h2>
        {withdrawals.length === 0 && <p style={{ margin: 0, fontSize: "13px", color: "var(--color-ink-mute)" }}>{t("admin.users.none")}</p>}
        {withdrawals.map((w) => (
          <p key={w.id} style={{ margin: "6px 0 0", fontSize: "13px" }}>
            ৳{w.amount} · {t(`wallet.provider.${w.provider}`)} · {t(`history.status.${w.status}`)}
          </p>
        ))}
      </section>
    </div>
  );
}
