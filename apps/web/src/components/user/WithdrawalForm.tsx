// apps/web/src/components/user/WithdrawalForm.tsx
// Withdrawal request form (§6.3) — provider, amount, MFS account number.
// Validation is client-side (approved decision (a)): Zod schema + min from
// site_settings + user's own balance_verified. The INSERT is a direct RLS
// insert creating a `pending` row — no money moves until admin approval
// (process-withdrawal, Milestone 11), which re-validates server-side.
// The request is irreversible → explicit ConfirmDialog before insert.
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { withdrawalRequestSchema, MFS_PROVIDER } from "@/lib/validators";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Select,
  useToast,
} from "@/components/app/ui";

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
  const { success: toastSuccess, error: toastError } = useToast();

  const [provider, setProvider] = useState<MfsProvider>(PROVIDERS[0] ?? "bkash");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Validate on submit; a valid request opens the confirmation dialog.
  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
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
    setConfirmOpen(true);
  }

  async function confirmRequest(): Promise<void> {
    if (session === null) return;
    setIsSaving(true);
    const parsedAmount = Number.parseInt(amount, 10);
    const { error: dbError } = await supabase.from("withdrawals").insert({
      user_id: session.user.id,
      amount: parsedAmount,
      provider,
      account_number: accountNumber,
      status: "pending",
    });
    setIsSaving(false);
    setConfirmOpen(false);

    if (dbError !== null) {
      toastError(t("auth.error.generic"));
      return;
    }
    setAmount("");
    setAccountNumber("");
    toastSuccess(t("wallet.form.success"));
    onRequested();
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label={t("wallet.form.provider")} htmlFor="wd-provider">
          <Select
            id="wd-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as MfsProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {t(`wallet.provider.${p}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t("wallet.form.amount")}
          htmlFor="wd-amount"
          hint={`${t("wallet.balanceVerified")}: ৳${balanceVerified}`}
        >
          <Input
            id="wd-amount"
            type="number"
            min={minAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(minAmount)}
          />
        </Field>

        <Field label={t("wallet.form.account")} htmlFor="wd-account" hint="01XXXXXXXXX">
          <Input
            id="wd-account"
            type="tel"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </Field>

        {error !== null && (
          <p role="alert" className="m-0 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full sm:w-auto">
          {t("wallet.form.submit")}
        </Button>
      </form>

      {/* Withdrawal request is irreversible — explicit confirmation required. */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("wallet.form.confirmTitle")}
        message={t("wallet.form.confirmMessage", { amount, provider: t(`wallet.provider.${provider}`) })}
        confirmLabel={t("wallet.form.submit")}
        cancelLabel={t("common.cancel")}
        tone="primary"
        busy={isSaving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void confirmRequest()}
      />
    </>
  );
}
