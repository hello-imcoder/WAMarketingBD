// apps/web/src/pages/rexio-admin/AdminSubmissionReviewPage.tsx
// Route: "/rexio-admin/submissions" — pending queue + approve/reject (§7.2).
// Fraud signals (§8) are surfaced for admin judgment — never auto-decided.
// Approve/reject goes through the verify-submission Edge Function.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminSubmissions } from "@/hooks/useAdminSubmissions";
import type { AdminSubmissionView, ReviewErrorCode } from "@/hooks/useAdminSubmissions";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-md)",
  padding: "var(--spacing-lg)",
  background: "var(--color-canvas)",
  display: "flex",
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

export default function AdminSubmissionReviewPage(): React.ReactElement {
  const { t } = useTranslation();
  const { pending, reviewed, isLoading, error, review } = useAdminSubmissions();
  const [rejecting, setRejecting] = useState<AdminSubmissionView | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<ReviewErrorCode | "REASON_REQUIRED" | null>(null);
  const [busy, setBusy] = useState(false);

  async function doApprove(id: string): Promise<void> {
    setBusy(true);
    setActionError(null);
    const code = await review(id, "approved", null);
    if (code !== null) setActionError(code);
    setBusy(false);
  }

  async function doReject(): Promise<void> {
    if (rejecting === null) return;
    if (reason.trim() === "") {
      setActionError("REASON_REQUIRED");
      return;
    }
    setBusy(true);
    setActionError(null);
    const code = await review(rejecting.submission.id, "rejected", reason.trim());
    if (code !== null) setActionError(code);
    else {
      setRejecting(null);
      setReason("");
    }
    setBusy(false);
  }

  function errorText(code: string): string {
    if (code === "REASON_REQUIRED") return t("admin.submissions.error.reasonRequired");
    if (code === "TASK_FULL") return t("admin.submissions.error.taskFull");
    if (code === "ALREADY_REVIEWED") return t("admin.submissions.error.alreadyReviewed");
    if (code === "RATE_LIMITED") return t("auth.error.rateLimited");
    return t("admin.error.generic");
  }

  function renderCard(view: AdminSubmissionView, isPending: boolean): React.ReactElement {
    const s = view.submission;
    return (
      <div key={s.id} style={cardStyle}>
        <div style={{ flex: "1 1 280px" }}>
          <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>
            {view.userName} · {view.userPhone}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
            ৳{view.payoutAmount} · {new Date(s.submitted_at).toLocaleString()}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-ink-mute)" }}>
            {t("admin.submissions.waClicked")}: {s.wa_link_clicked_at !== null ? new Date(s.wa_link_clicked_at).toLocaleString() : "—"}
            {" · "}
            {t("admin.submissions.ip")}: {s.ip_address ?? "—"}
            {" · "}
            {t("admin.submissions.fingerprint")}: {s.device_fingerprint !== null ? `${s.device_fingerprint.slice(0, 12)}…` : "—"}
          </p>
          {s.screenshot_hash !== null && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-ink-faint)", wordBreak: "break-all" }}>
              SHA-256: {s.screenshot_hash}
            </p>
          )}
          {!isPending && s.rejection_reason !== null && (
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#b3261e" }}>
              {t("admin.submissions.rejectionReason")}: {s.rejection_reason}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
          {s.screenshot_url !== null && (
            <a href={s.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: "13px" }}>
              {t("admin.submissions.viewScreenshot")}
            </a>
          )}
          {isPending && (
            <>
              <button type="button" disabled={busy} onClick={() => void doApprove(s.id)}
                style={{ ...btnStyle, background: "var(--color-surface-teal-deep)", color: "#fff" }}>
                {t("admin.submissions.approve")}
              </button>
              <button type="button" disabled={busy} onClick={() => { setRejecting(view); setActionError(null); }}
                style={{ ...btnStyle, background: "#b3261e", color: "#fff" }}>
                {t("admin.submissions.reject")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--spacing-xxl)" }}>
      {actionError !== null && (
        <p role="alert" style={{ color: "#b3261e", fontSize: "14px", margin: 0 }}>{errorText(actionError)}</p>
      )}
      <section>
        <h1 style={{ fontSize: "22px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
          {t("admin.submissions.pendingTitle")}
        </h1>
        {isLoading && <p role="status">{t("common.loading")}</p>}
        {error !== null && <p role="alert">{t("admin.error.load_failed")}</p>}
        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          {pending.map((v) => renderCard(v, true))}
          {!isLoading && pending.length === 0 && (
            <p style={{ color: "var(--color-ink-mute)" }}>{t("admin.submissions.empty")}</p>
          )}
        </div>
      </section>
      {reviewed.length > 0 && (
        <section>
          <h2 style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
            {t("admin.submissions.reviewedTitle")}
          </h2>
          <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
            {reviewed.map((v) => renderCard(v, false))}
          </div>
        </section>
      )}
      {rejecting !== null && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(14,12,31,0.5)", display: "grid", placeItems: "center", padding: "var(--spacing-xl)" }}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "var(--rounded-lg)", padding: "var(--spacing-xl)", maxWidth: "420px", width: "100%" }}>
            <p style={{ margin: "0 0 12px", fontSize: "16px", fontVariationSettings: '"wght" 540' }}>
              {t("admin.submissions.rejectTitle")}
            </p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("admin.submissions.reasonPlaceholder")}
              style={{ width: "100%", minHeight: "90px", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-sm)", fontSize: "14px", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-lg)" }}>
              <button type="button" disabled={busy} onClick={() => void doReject()}
                style={{ ...btnStyle, background: "#b3261e", color: "#fff" }}>
                {t("admin.submissions.rejectConfirm")}
              </button>
              <button type="button" onClick={() => setRejecting(null)} style={{ ...btnStyle, border: "1px solid var(--color-hairline)", background: "transparent" }}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
