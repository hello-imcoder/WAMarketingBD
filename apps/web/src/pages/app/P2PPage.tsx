// apps/web/src/pages/app/P2PPage.tsx
// Route: "/app/p2p" — P2P transfer flow (§6.4): verified balance only, no fee,
// no limits. Two steps: phone → name preview → amount → confirm → execute.
// All execution is server-side via the process-p2p-transfer Edge Function.
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { useAuthStore } from "@/stores/authStore";
import { p2pLookupSchema, p2pTransferSchema, phoneSchema } from "@/lib/validators";
import { supabase } from "@/lib/supabase";

interface LookupResponse {
  ok: true;
  recipientName: string;
}

interface TransferResponse {
  ok: true;
  transferId: string;
  newSenderBalanceVerified?: number;
}

const EDGE_ERROR_KEYS: Record<string, string> = {
  SELF_TRANSFER: "selfTransfer",
  ACCOUNT_BANNED: "banned",
  RECIPIENT_NOT_FOUND: "recipientNotFound",
  INSUFFICIENT_BALANCE: "insufficientBalance",
  RATE_LIMITED: "rateLimited",
};

type Step = "phone" | "confirm" | "done";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "var(--spacing-lg)",
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-sm)",
  fontSize: "16px",
  boxSizing: "border-box",
};

export default function P2PPage(): React.ReactElement {
  const { t } = useTranslation();
  const { session, refreshProfile } = useAuthStore();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [balanceVerified, setBalanceVerified] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    applySeo({ title: t("p2p.meta.title"), description: t("p2p.meta.description") });
  }, [t]);

  useEffect(() => {
    void (async () => {
      if (session === null) return;
      const { data } = await supabase
        .from("wallets")
        .select("balance_verified")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const w = (data ?? null) as { balance_verified: number } | null;
      setBalanceVerified(w?.balance_verified ?? 0);
    })();
  }, [session, step]);

  function mapError(err: unknown): void {
    if (err instanceof EdgeFunctionError) {
      setErrorMsg(t(`p2p.error.${EDGE_ERROR_KEYS[err.code] ?? "generic"}`));
    } else {
      setErrorMsg(t("p2p.error.generic"));
    }
  }

  async function handleLookup(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMsg(null);
    if (session === null) return;

    const parsed = p2pLookupSchema.safeParse({ recipientPhone: phone });
    if (!parsed.success) {
      setErrorMsg(t("p2p.error.invalidPhone"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await invokeEdgeFunction<LookupResponse>("process-p2p-transfer", parsed.data, session);
      setRecipientName(res.recipientName);
      setStep("confirm");
    } catch (err) {
      mapError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTransfer(): Promise<void> {
    setErrorMsg(null);
    if (session === null) return;

    const parsedAmount = Number.parseInt(amount, 10);
    const parsed = p2pTransferSchema.safeParse({
      recipientPhone: phone,
      amount: Number.isNaN(parsedAmount) ? -1 : parsedAmount,
    });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }
    if (balanceVerified !== null && parsed.data.amount > balanceVerified) {
      setErrorMsg(t("p2p.error.insufficientBalance"));
      return;
    }
    setIsLoading(true);
    try {
      await invokeEdgeFunction<TransferResponse>("process-p2p-transfer", parsed.data, session);
      await refreshProfile();
      setStep("done");
    } catch (err) {
      mapError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return <P2pBody
    step={step}
    phone={phone}
    setPhone={setPhone}
    recipientName={recipientName}
    amount={amount}
    setAmount={setAmount}
    balanceVerified={balanceVerified}
    isLoading={isLoading}
    errorMsg={errorMsg}
    onLookup={(e) => void handleLookup(e)}
    onTransfer={() => void handleTransfer()}
    onReset={() => {
      setStep("phone");
      setAmount("");
      setPhone("");
    }}
  />;
}

interface BodyProps {
  step: Step;
  phone: string;
  setPhone: (v: string) => void;
  recipientName: string;
  amount: string;
  setAmount: (v: string) => void;
  balanceVerified: number | null;
  isLoading: boolean;
  errorMsg: string | null;
  onLookup: (e: FormEvent<HTMLFormElement>) => void;
  onTransfer: () => void;
  onReset: () => void;
}

function P2pBody(p: BodyProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "640px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>
        {t("p2p.title")}
      </h1>
      <p style={{ color: "var(--color-ink-mute)", margin: "0 0 24px" }}>
        {t("p2p.subtitle")}
        {p.balanceVerified !== null && <> · {t("p2p.verifiedBalance")}: ৳{p.balanceVerified}</>}
      </p>

      {p.errorMsg !== null && (
        <p role="alert" className="auth-error">
          {p.errorMsg}
        </p>
      )}

      {p.step === "phone" && (
        <form onSubmit={p.onLookup} noValidate>
          <label htmlFor="p2p-phone" style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}>
            {t("p2p.recipientPhone")}
          </label>
          <input
            id="p2p-phone"
            type="tel"
            inputMode="numeric"
            placeholder="01XXXXXXXXX"
            value={p.phone}
            onChange={(e) => p.setPhone(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" className="auth-submit-btn" disabled={p.isLoading || !phoneSchema.safeParse(p.phone).success}>
            {p.isLoading ? t("common.loading") : t("p2p.lookupButton")}
          </button>
        </form>
      )}

      {p.step === "confirm" && (
        <section
          style={{
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--rounded-lg)",
            padding: "var(--spacing-xl)",
          }}
        >
          <p style={{ margin: "0 0 4px", color: "var(--color-ink-mute)", fontSize: "14px" }}>
            {t("p2p.sendingTo")}
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "22px", fontVariationSettings: '"wght" 540' }}>
            {p.recipientName}
          </p>
          <p style={{ margin: "0 0 16px", color: "var(--color-ink-mute)", fontSize: "14px" }}>{p.phone}</p>

          <label htmlFor="p2p-amount" style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}>
            {t("p2p.amount")}
          </label>
          <input
            id="p2p-amount"
            type="number"
            min={1}
            value={p.amount}
            onChange={(e) => p.setAmount(e.target.value)}
            style={inputStyle}
          />

          <button
            type="button"
            className="auth-submit-btn"
            onClick={p.onTransfer}
            disabled={p.isLoading || p.amount === ""}
          >
            {p.isLoading ? t("common.saving") : t("p2p.confirmButton")}
          </button>
          <button
            type="button"
            className="auth-submit-btn"
            style={{ background: "transparent", color: "var(--color-ink-mute)" }}
            onClick={p.onReset}
          >
            {t("common.cancel")}
          </button>
        </section>
      )}

      {p.step === "done" && (
        <div>
          <p role="status" className="settings-success">
            {t("p2p.success", { name: p.recipientName, amount: p.amount })}
          </p>
          <button type="button" className="auth-submit-btn" style={{ maxWidth: "220px" }} onClick={p.onReset}>
            {t("p2p.sendAnother")}
          </button>
        </div>
      )}
    </main>
  );
}
