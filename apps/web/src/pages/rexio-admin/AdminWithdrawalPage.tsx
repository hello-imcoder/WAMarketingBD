// apps/web/src/pages/rexio-admin/AdminWithdrawalPage.tsx
// Route: "/rexio-admin/withdrawals" — pending queue + complete/reject (§7.3).
// The MFS transfer itself is manual (outside the app) — this page only
// records the DB state change via the process-withdrawal Edge Function.
// Includes the min_withdrawal_amount editor (site_settings RLS admin update).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminWithdrawals } from "@/hooks/useAdminWithdrawals";
import type { WithdrawalErrorCode } from "@/hooks/useAdminWithdrawals";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-md)",
  padding: "var(--spacing-lg)",
  background: "var(--color-canvas)",
  display: "flex",
  justifyContent: "space-between",
  gap: "var(--spacing-lg)",
  flexWrap: "wrap",
};
const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "var(--rounded-md)",
  border: "none",
  fontSize: "13px",
  fontVariationSettings: '"wght" 600',
  cursor: "pointer",
};

export default function AdminWithdrawalPage(): React.ReactElement {
  const { t } = useTranslation();
  const { pending, processed, settings, isLoading, error, review, updateMinWithdrawal } = useAdminWithdrawals();
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; action: "completed" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [minInput, setMinInput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function errorText(code: string): string {
    if (code === "BELOW_MIN") return t("admin.withdrawals.error.belowMin");
    if (code === "INSUFFICIENT_BALANCE") return t("admin.withdrawals.error.insufficientBalance");
    if (code === "ALREADY_PROCESSED") return t("admin.withdrawals.error.alreadyProcessed");
    if (code === "RATE_LIMITED") return t("auth.error.rateLimited");
    return t("admin.error.generic");
  }

  async function confirmAction(): Promise<void> {
    if (noteFor === null) return;
    setBusy(true);
    setActionError(null);
    const code: WithdrawalErrorCode | null = await review(
      noteFor.id,
      noteFor.action,
      note.trim() === "" ? null : note.trim(),
    );
    if (code !== null) setActionError(code);
    else {
      setNoteFor(null);
      setNote("");
    }
    setBusy(false);
  }

  async function saveMin(): Promise<void> {
    const amount = Number(minInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      setActionError("INVALID_INPUT");
      return;
    }
    const err = await updateMinWithdrawal(amount);
    if (err !== null) setActionError("WITHDRAWAL_FAILED");
    else setMinInput(null);
  }

  return (
    <div style={{ display: "grid", gap: "var(--spacing-xxl)" }}>
      {actionError !== null && (
        <p role="alert" style={{ color: "#b3261e", fontSize: "14px", margin: 0 }}>{errorText(actionError)}</p>
      )}

      <section>
        <h1 style={{ fontSize: "22px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
          {t("admin.withdrawals.pendingTitle")}
        </h1>
        {isLoading && <p role="status">{t("common.loading")}</p>}
        {error !== null && <p role="alert">{t("admin.error.load_failed")}</p>}
        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          {pending.map((w) => (
            <div key={w.id} style={cardStyle}>
              <div>
                <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>
                  {w.profiles?.name ?? "—"} · {w.profiles?.phone ?? "—"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "14px" }}>
                  ৳{w.amount} · {t(`wallet.provider.${w.provider}`)} · {w.account_number}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-ink-faint)" }}>
                  {new Date(w.requested_at).toLocaleString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                <button type="button" disabled={busy} onClick={() => { setNoteFor({ id: w.id, action: "completed" }); setActionError(null); }}
                  style={{ ...btnStyle, background: "var(--color-surface-teal-deep)", color: "#fff" }}>
                  {t("admin.withdrawals.complete")}
                </button>
                <button type="button" disabled={busy} onClick={() => { setNoteFor({ id: w.id, action: "rejected" }); setActionError(null); }}
                  style={{ ...btnStyle, background: "#b3261e", color: "#fff" }}>
                  {t("admin.withdrawals.reject")}
                </button>
              </div>
            </div>
          ))}
          {!isLoading && pending.length === 0 && (
            <p style={{ color: "var(--color-ink-mute)" }}>{t("admin.withdrawals.empty")}</p>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
          {t("admin.withdrawals.settingsTitle")}
        </h2>
        {settings !== null && (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: "14px" }}>{t("admin.withdrawals.minAmount")}</p>
            {minInput === null ? (
              <div style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
                <span style={{ fontSize: "16px", fontVariationSettings: '"wght" 600' }}>৳{settings.min_withdrawal_amount}</span>
                <button type="button" onClick={() => { setMinInput(String(settings.min_withdrawal_amount)); setActionError(null); }} style={{ ...btnStyle, border: "1px solid var(--color-hairline)", background: "transparent" }}>
                  {t("admin.withdrawals.editMin")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                <input value={minInput} inputMode="numeric" onChange={(e) => setMinInput(e.target.value)}
                  style={{ width: "100px", padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-sm)", fontSize: "14px" }} />
                <button type="button" onClick={() => void saveMin()} style={{ ...btnStyle, background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
                  {t("admin.tasks.saveButton")}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      {processed.length > 0 && (
        <section>
          <h2 style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
            {t("admin.withdrawals.processedTitle")}
          </h2>
          <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
            {processed.map((w) => (
              <div key={w.id} style={cardStyle}>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>
                    {w.profiles?.name ?? "—"} · ৳{w.amount} · {t(`wallet.provider.${w.provider}`)}
                  </p>
                  {w.admin_note !== null && (
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-ink-mute)" }}>{w.admin_note}</p>
                  )}
                </div>
                <span style={{ fontSize: "13px", color: w.status === "completed" ? "var(--color-surface-teal-deep)" : "#b3261e" }}>
                  {t(`history.status.${w.status}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {noteFor !== null && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(14,12,31,0.5)", display: "grid", placeItems: "center", padding: "var(--spacing-xl)" }}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "var(--rounded-lg)", padding: "var(--spacing-xl)", maxWidth: "420px", width: "100%" }}>
            <p style={{ margin: "0 0 12px", fontSize: "16px", fontVariationSettings: '"wght" 540' }}>
              {noteFor.action === "completed" ? t("admin.withdrawals.completeTitle") : t("admin.withdrawals.rejectTitle")}
            </p>
            {noteFor.action === "completed" && (
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--color-ink-mute)" }}>
                {t("admin.withdrawals.manualNote")}
              </p>
            )}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.withdrawals.notePlaceholder")}
              style={{ width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-sm)", fontSize: "14px", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-lg)" }}>
              <button type="button" disabled={busy} onClick={() => void confirmAction()}
                style={{ ...btnStyle, background: noteFor.action === "completed" ? "var(--color-surface-teal-deep)" : "#b3261e", color: "#fff" }}>
                {noteFor.action === "completed" ? t("admin.withdrawals.completeConfirm") : t("admin.withdrawals.rejectConfirm")}
              </button>
              <button type="button" onClick={() => setNoteFor(null)} style={{ ...btnStyle, border: "1px solid var(--color-hairline)", background: "transparent" }}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
