// apps/web/src/components/user/WithdrawalForm.tsx
// Withdrawal request form (§6.3) — provider, amount, MFS account number.
// Validation is client-side (approved decision (a)): Zod schema + min from
// site_settings + user's own balance_verified. The INSERT is a direct RLS
// insert creating a `pending` row — no money moves until admin approval
// (process-withdrawal, Milestone 11), which re-validates server-side.
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { withdrawalRequestSchema, MFS_PROVIDER } from "@/lib/validators";

const PROVIDERS = Object.values(MFS_PROVIDER) as MfsProvider[];
type MfsProvider = (typeof MFS_PROVIDER)[keyof typeof MFS_PROVIDER];

interface WithdrawalFormProps {
  minAmount: number;
  balanceVerified: number;
  onRequested: () => void;
}

export function WithdrawalForm({
  minAmount,
  balanceVerified,
  onRequested,
}: WithdrawalFormProps): React.ReactElement {
  const { t } = useTranslation();
  const { session } = useAuthStore();

  const [provider, setProvider] = useState<MfsProvider>(PROVIDERS[0] ?? "bkash");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (session === null) return;

    const parsedAmount = Number.parseInt(amount, 10);
    const parsed = withdrawalRequestSchema.safeParse({
      amount: Number.isNaN(parsedAmount) ? -1 : parsedAmount,
      provider,
      accountNumber,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }
    // Client-side money checks (approved decision (a)) — the withdrawal is a
    // pending row only; server re-validation happens at approval time (M11).
    if (parsed.data.amount < minAmount) {
      setError(t("wallet.error.belowMin", { min: minAmount }));
      return;
    }
    if (parsed.data.amount > balanceVerified) {
      setError(t("wallet.error.overBalance"));
      return;
    }

    setIsSaving(true);
    const { error: dbError } = await supabase.from("withdrawals").insert({
      user_id: session.user.id,
      amount: parsed.data.amount,
      provider: parsed.data.provider,
      account_number: parsed.data.accountNumber,
      status: "pending",
    });
    setIsSaving(false);

    if (dbError !== null) {
      setError(t("auth.error.generic"));
      return;
    }
    setAmount("");
    setAccountNumber("");
    setSuccess(true);
    onRequested();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <label
        htmlFor="wd-provider"
        style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}
      >
        {t("wallet.form.provider")}
      </label>
      <select
        id="wd-provider"
        value={provider}
        onChange={(e) => setProvider(e.target.value as MfsProvider)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "var(--spacing-lg)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-sm)",
          fontSize: "16px",
        }}
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {t(`wallet.provider.${p}`)}
          </option>
        ))}
      </select>

      <label
        htmlFor="wd-amount"
        style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}
      >
        {t("wallet.form.amount")}
      </label>
      <input
        id="wd-amount"
        type="number"
        min={minAmount}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={String(minAmount)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "var(--spacing-lg)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-sm)",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
      />

      <label
        htmlFor="wd-account"
        style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}
      >
        {t("wallet.form.account")}
      </label>
      <input
        id="wd-account"
        type="tel"
        inputMode="numeric"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="01XXXXXXXXX"
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "var(--spacing-lg)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-sm)",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
      />

      {error !== null && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="settings-success">
          {t("wallet.form.success")}
        </p>
      )}

      <button type="submit" className="auth-submit-btn" disabled={isSaving}>
        {isSaving ? t("common.saving") : t("wallet.form.submit")}
      </button>
    </form>
  );
}
