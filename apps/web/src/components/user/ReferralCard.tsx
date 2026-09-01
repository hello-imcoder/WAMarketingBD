// apps/web/src/components/user/ReferralCard.tsx
// Referral section (§6.5) — code, copyable invite link, bonus history.
// Code generation itself is done at signup (0013 handle_new_user); ?ref=CODE
// pre-fill works since Milestone 3.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useReferrals } from "@/hooks/useReferrals";
import { useAuthStore } from "@/stores/authStore";

export function ReferralCard(): React.ReactElement | null {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { referrals, isLoading, error } = useReferrals();
  const [copied, setCopied] = useState(false);

  if (profile === null) return null;
  const code = profile.referral_code;
  const link = `${window.location.origin}/reg?ref=${code}`;

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <section style={{ marginBottom: "var(--spacing-xxl)" }}>
      <h2 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>
        {t("referral.title")}
      </h2>
      <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 16px" }}>
        {t("referral.description")}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-md)",
          padding: "var(--spacing-lg)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <code style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', letterSpacing: "2px" }}>
          {code}
        </code>
        <button
          type="button"
          className="auth-submit-btn"
          style={{ maxWidth: "160px", marginBottom: 0 }}
          onClick={() => void copyLink()}
        >
          {copied ? t("referral.copied") : t("referral.copyLink")}
        </button>
      </div>

      {isLoading && <p role="status">{t("common.loading")}</p>}
      {error !== null && (
        <p role="alert" className="auth-error">
          {t("referral.error.loadFailed")}
        </p>
      )}
      {!isLoading && error === null && referrals.length === 0 && (
        <p style={{ color: "var(--color-ink-mute)", fontSize: "14px" }}>{t("referral.empty")}</p>
      )}
      {referrals.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--color-hairline)",
            padding: "var(--spacing-md) 0",
            fontSize: "14px",
          }}
        >
          <span>
            {t("referral.bonusAmount")}: ৳{r.bonus_amount}
          </span>
          <span style={{ color: r.bonus_paid ? "#1a7a3c" : "var(--color-ink-mute)" }}>
            {r.bonus_paid ? t("referral.paid") : t("referral.pendingBonus")}
          </span>
        </div>
      ))}
    </section>
  );
}
