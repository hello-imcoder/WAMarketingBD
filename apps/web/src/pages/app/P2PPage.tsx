// apps/web/src/pages/app/P2PPage.tsx
// Route: "/app/p2p" — P2P transfer flow (§6.4): verified balance only, no fee,
// no limits. Two steps: phone → name preview → amount → confirm → execute.
// All execution is server-side via the process-p2p-transfer Edge Function.
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, CheckCircle2, Phone, UserRound } from "lucide-react";
import { applySeo } from "@/lib/seo";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { useAuthStore } from "@/stores/authStore";
import { p2pLookupSchema, p2pTransferSchema, phoneSchema } from "@/lib/validators";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  useToast,
} from "@/components/app/ui";

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

export default function P2PPage(): React.ReactElement {
  const { t } = useTranslation();
  const { session, refreshProfile } = useAuthStore();
  const { error: toastError, success: toastSuccess } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [balanceVerified, setBalanceVerified] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      toastError(t(`p2p.error.${EDGE_ERROR_KEYS[err.code] ?? "generic"}`));
    } else {
      toastError(t("p2p.error.generic"));
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
      toastSuccess(t("p2p.success", { name: recipientName, amount }));
    } catch (err) {
      mapError(err);
    } finally {
      setIsLoading(false);
    }
  }

  const description =
    t("p2p.subtitle") +
    (balanceVerified !== null ? ` · ${t("p2p.verifiedBalance")}: ৳${balanceVerified}` : "");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title={t("p2p.title")} description={description} />

      {/* ── Step indicator ────────────────────────────────────────────── */}
      <ol className="m-0 flex list-none items-center gap-2 p-0 text-xs text-ink-mute">
        {[
          { icon: <Phone size={13} />, label: t("p2p.step.recipient"), active: step === "phone", done: step !== "phone" },
          { icon: <ArrowLeftRight size={13} />, label: t("p2p.step.amount"), active: step === "confirm", done: step === "done" },
          { icon: <CheckCircle2 size={13} />, label: t("p2p.step.done"), active: step === "done", done: false },
        ].map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="h-px w-5 bg-hairline" />}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                s.active
                  ? "bg-primary text-on-primary wt-540"
                  : s.done
                    ? "bg-success-soft text-success"
                    : "bg-canvas-soft"
              }`}
            >
              {s.icon}
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {errorMsg !== null && (
        <p role="alert" className="m-0 text-sm text-danger">
          {errorMsg}
        </p>
      )}

      {step === "phone" && (
        <Card>
          <CardHeader title={t("p2p.recipientPhone")} icon={<Phone size={18} />} />
          <CardBody>
            <form onSubmit={(e) => void handleLookup(e)} noValidate className="flex flex-col gap-4">
              <Field label={t("p2p.recipientPhone")} htmlFor="p2p-phone" hint="01XXXXXXXXX">
                <Input
                  id="p2p-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Button
                type="submit"
                loading={isLoading}
                disabled={!phoneSchema.safeParse(phone).success}
                className="w-full sm:w-auto"
              >
                {t("p2p.lookupButton")}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader title={t("p2p.step.amount")} icon={<ArrowLeftRight size={18} />} />
          <CardBody className="flex flex-col gap-4">
            <div>
              <p className="m-0 text-[13px] text-ink-mute">{t("p2p.sendingTo")}</p>
              <p className="wt-540 m-0 flex items-center gap-2 text-xl text-ink">
                <UserRound size={18} className="text-ink-mute" />
                {recipientName}
              </p>
              <p className="m-0 font-mono text-sm text-ink-mute">{phone}</p>
            </div>

            <Field label={t("p2p.amount")} htmlFor="p2p-amount">
              <Input
                id="p2p-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => setConfirmOpen(true)}
                disabled={isLoading || amount === ""}
                className="w-full sm:w-auto"
              >
                {t("p2p.confirmButton")}
              </Button>
              <Button variant="outline" onClick={() => { setStep("phone"); setAmount(""); setPhone(""); }}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={40} className="text-success" />
            <p role="status" className="wt-540 m-0 text-base text-ink">
              {t("p2p.success", { name: recipientName, amount })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStep("phone"); setAmount(""); setPhone(""); }}
            >
              {t("p2p.sendAnother")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* P2P transfer is irreversible — explicit confirmation required. */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("p2p.confirmTitle")}
        message={t("p2p.confirmMessage", { name: recipientName, amount })}
        confirmLabel={t("p2p.confirmButton")}
        cancelLabel={t("common.cancel")}
        tone="primary"
        busy={isLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleTransfer();
        }}
      />
    </div>
  );
}
