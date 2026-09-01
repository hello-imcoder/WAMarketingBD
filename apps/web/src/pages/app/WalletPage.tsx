// apps/web/src/pages/app/WalletPage.tsx
// Route: "/app/wallet" — balances (total + verified, §6.3) + withdrawal request.
// Balances are maintained by service-role Edge Functions (approval flows, M11);
// this page is read-only on them. Withdrawal creation is a direct RLS INSERT
// of a `pending` row — client-side validation per approved decision (a).
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { useWallet } from "@/hooks/useWallet";
import { WithdrawalForm } from "@/components/user/WithdrawalForm";

export default function WalletPage(): React.ReactElement {
  const { t } = useTranslation();
  const { wallet, settings, withdrawals, isLoading, error, reload } = useWallet();

  useEffect(() => {
    applySeo({ title: t("wallet.meta.title"), description: t("wallet.meta.description") });
  }, [t]);

  const minAmount = settings?.min_withdrawal_amount ?? 0;
  const balanceVerified = wallet?.balance_verified ?? 0;

  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "640px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontVariationSettings: '"wght" 540', margin: "0 0 24px" }}>
        {t("wallet.title")}
      </h1>

      {isLoading && <p role="status">{t("common.loading")}</p>}
      {error !== null && (
        <p role="alert" className="auth-error">
          {t("wallet.error.loadFailed")}
        </p>
      )}

      {wallet !== null && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-xxl)" }}>
          <div
            style={{
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-lg)",
              padding: "var(--spacing-xl)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("wallet.balanceTotal")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "28px", fontVariationSettings: '"wght" 540' }}>
              ৳{wallet.balance_total}
            </p>
          </div>
          <div
            style={{
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-lg)",
              padding: "var(--spacing-xl)",
              background: "var(--color-canvas-soft)",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("wallet.balanceVerified")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "28px", fontVariationSettings: '"wght" 540', color: "var(--color-surface-teal-deep)" }}>
              ৳{wallet.balance_verified}
            </p>
          </div>
        </div>
      )}

      {settings !== null && (
        <section style={{ marginBottom: "var(--spacing-xxl)" }}>
          <h2 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>
            {t("wallet.withdrawTitle")}
          </h2>
          <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 16px" }}>
            {t("wallet.minNote", { min: minAmount })}
          </p>
          <WithdrawalForm
            minAmount={minAmount}
            balanceVerified={balanceVerified}
            onRequested={reload}
          />
        </section>
      )}

      {withdrawals.length > 0 && (
        <section>
          <h2 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
            {t("wallet.historyTitle")}
          </h2>
          <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
            {withdrawals.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--rounded-md)",
                  padding: "var(--spacing-lg)",
                }}
              >
                <span>
                  ৳{w.amount} · {t(`wallet.provider.${w.provider}`)} · …{w.account_number.slice(-4)}
                </span>
                <span style={{ fontSize: "14px", color: "var(--color-ink-mute)" }}>
                  {t(`wallet.status.${w.status}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

