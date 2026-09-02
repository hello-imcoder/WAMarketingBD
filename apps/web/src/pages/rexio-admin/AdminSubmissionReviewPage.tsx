// apps/web/src/pages/rexio-admin/AdminSubmissionReviewPage.tsx
// Route: "/rexio-admin/submissions" — status tabs, paginated queue, screenshot
// lightbox, compact fraud-signal box, reject modal (§7.2).
// Fraud signals (§8) are surfaced for admin judgment — never auto-decided.
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Image as ImageIcon } from "lucide-react";
import { useAdminSubmissions } from "@/hooks/useAdminSubmissions";
import type { SubmissionStatusFilter } from "@/hooks/useAdminSubmissions";
import type { AdminSubmissionView } from "@/hooks/useAdminSubmissions";
import {
  PageHeader,
  Badge,
  statusTone,
  Button,
  Modal,
  Textarea,
  EmptyState,
  ListSkeleton,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

function StatusTabs({
  value,
  onChange,
  counts,
}: {
  value: SubmissionStatusFilter;
  onChange: (v: SubmissionStatusFilter) => void;
  counts: { pending: number };
}): React.ReactElement {
  const { t } = useTranslation();
  const tabs: Array<{ key: SubmissionStatusFilter; label: string }> = [
    { key: "pending", label: t("admin.submissions.tabPending") },
    { key: "reviewed", label: t("admin.submissions.tabReviewed") },
    { key: "approved", label: t("history.status.approved") },
    { key: "rejected", label: t("history.status.rejected") },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] wt-540 transition-colors ${
            value === tab.key
              ? "bg-primary text-on-primary"
              : "border border-hairline bg-canvas text-ink-mute hover:bg-canvas-soft"
          }`}
        >
          {tab.label}
          {tab.key === "pending" && counts.pending > 0 && (
            <span className="ml-1.5 rounded-full bg-surface-violet-soft px-1.5 text-[11px] wt-600 text-primary">
              {counts.pending}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function FraudBox({ view }: { view: AdminSubmissionView }): React.ReactElement {
  const { t } = useTranslation();
  const s = view.submission;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-canvas-soft px-3 py-2 text-xs text-ink-mute">
      <span className="flex items-center gap-1 wt-540 text-ink">
        <ShieldAlert size={13} /> {t("admin.submissions.fraudSignals")}
      </span>
      <span>
        {t("admin.submissions.waClicked")}:{" "}
        {s.wa_link_clicked_at !== null ? new Date(s.wa_link_clicked_at).toLocaleString() : "—"}
      </span>
      <span>
        {t("admin.submissions.ip")}: {s.ip_address ?? "—"}
      </span>
      <span className="min-w-0">
        {t("admin.submissions.fingerprint")}:{" "}
        {s.device_fingerprint !== null ? `${s.device_fingerprint.slice(0, 12)}…` : "—"}
      </span>
      {s.screenshot_hash !== null && (
        <span className="w-full break-all text-ink-faint">SHA-256: {s.screenshot_hash}</span>
      )}
    </div>
  );
}

function SubmissionRow({
  view,
  isPending,
  onApprove,
  onReject,
  onScreenshot,
  busy,
}: {
  view: AdminSubmissionView;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onScreenshot: (url: string) => void;
  busy: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const s = view.submission;
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="wt-540 text-sm text-ink">
            {view.userName} · {view.userPhone}
          </span>
          <Badge tone={statusTone(s.status)}>{t(`history.status.${s.status}`)}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink-mute">
          ৳{view.payoutAmount} · {new Date(s.submitted_at).toLocaleString()}
          {" · "}
          <Link to={`/rexio-admin/tasks/${view.taskId}`} className="text-info hover:underline">
            {t("admin.taskDetail.viewTask")}
          </Link>
        </p>
        <FraudBox view={view} />
        {!isPending && s.rejection_reason !== null && (
          <p className="mt-2 text-[13px] text-danger">
            {t("admin.submissions.rejectionReason")}: {s.rejection_reason}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {s.screenshot_url !== null && (
          <Button size="sm" variant="outline" onClick={() => onScreenshot(s.screenshot_url ?? "")}>
            <ImageIcon size={14} /> {t("admin.submissions.viewScreenshot")}
          </Button>
        )}
        {isPending && (
          <>
            <Button size="sm" variant="success" loading={busy} onClick={onApprove}>
              {t("admin.submissions.approve")}
            </Button>
            <Button size="sm" variant="danger" onClick={onReject}>
              {t("admin.submissions.reject")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSubmissionReviewPage(): React.ReactElement {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SubmissionStatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<AdminSubmissionView | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Pending count for the tab badge — cheap head count, refreshed via reload().
  const current = useAdminSubmissions({ page, pageSize: PAGE_SIZE, status });
  const pendingBadge = useAdminSubmissions({ page: 1, pageSize: 1, status: "pending" });
  const { submissions, total, isLoading, error, review } = current;
  const { reload: reloadBadge } = pendingBadge;

  function errorText(code: string): string {
    if (code === "REASON_REQUIRED") return t("admin.submissions.error.reasonRequired");
    if (code === "TASK_FULL") return t("admin.submissions.error.taskFull");
    if (code === "ALREADY_REVIEWED") return t("admin.submissions.error.alreadyReviewed");
    if (code === "RATE_LIMITED") return t("auth.error.rateLimited");
    return t("admin.error.generic");
  }

  async function doApprove(id: string): Promise<void> {
    setBusy(true);
    setActionError(null);
    const code = await review(id, "approved", null);
    setBusy(false);
    if (code !== null) setActionError(code);
    else reloadBadge();
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
    setBusy(false);
    if (code !== null) setActionError(code);
    else {
      setRejecting(null);
      setReason("");
      reloadBadge();
    }
  }

  return (
    <>
      <PageHeader title={t("admin.submissions.pageTitle")} description={t("admin.submissions.pageDesc")} />

      <div className="mb-4">
        <StatusTabs
          value={status}
          counts={{ pending: pendingBadge.total }}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      {actionError !== null && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorText(actionError)}
        </p>
      )}
      {error !== null && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {t("admin.error.load_failed")}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : submissions.length === 0 ? (
        <EmptyState title={status === "pending" ? t("admin.submissions.empty") : t("admin.submissions.emptyFiltered")} />
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas shadow-1">
          {submissions.map((v) => (
            <SubmissionRow
              key={v.submission.id}
              view={v}
              isPending={v.submission.status === "pending"}
              busy={busy}
              onApprove={() => void doApprove(v.submission.id)}
              onReject={() => {
                setRejecting(v);
                setReason("");
                setActionError(null);
              }}
              onScreenshot={(url) => setLightbox(url)}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </div>

      {/* ── Reject reason modal ─────────────────────────────────────── */}
      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={t("admin.submissions.rejectTitle")}
      >
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("admin.submissions.reasonPlaceholder")}
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRejecting(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void doReject()}>
            {t("admin.submissions.rejectConfirm")}
          </Button>
        </div>
      </Modal>

      {/* ── Screenshot lightbox ─────────────────────────────────────── */}
      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title={t("admin.submissions.viewScreenshot")}
        maxWidth="max-w-2xl"
      >
        {lightbox !== null && (
          <img
            src={lightbox}
            alt={t("admin.submissions.viewScreenshot")}
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </>
  );
}
