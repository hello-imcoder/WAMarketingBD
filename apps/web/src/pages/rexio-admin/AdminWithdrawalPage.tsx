// apps/web/src/pages/rexio-admin/AdminWithdrawalPage.tsx
// Route: "/rexio-admin/withdrawals" — status tabs + provider filter + pending
// summary + paginated queue. Complete/reject via process-withdrawal Edge
// Function (§7.3); the MFS transfer itself is manual (outside the app).
// Min-withdrawal setting lives on the Settings page now.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote } from "lucide-react";
import { useAdminWithdrawals } from "@/hooks/useAdminWithdrawals";
import type { WithdrawalStatusFilter, JoinedWithdrawal } from "@/hooks/useAdminWithdrawals";
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
  Select,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;
const PROVIDERS = ["all", "bkash", "nagad", "rocket", "upay"] as const;

export default function AdminWithdrawalPage(): React.ReactElement {
  const { t } = useTranslation();
  const [status, setStatus] = useState<WithdrawalStatusFilter>("pending");
  const [provider, setProvider] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ w: JoinedWithdrawal; action: "completed" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { withdrawals, total, pendingAmount, pendingCount, isLoading, error, review } =
    useAdminWithdrawals({ page, pageSize: PAGE_SIZE, status, provider });

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
    const code = await review(
      noteFor.w.id,
      noteFor.action,
      note.trim() === "" ? null : note.trim(),
    );
    setBusy(false);
    if (code !== null) setActionError(code);
    else {
      setNoteFor(null);
      setNote("");
    }
  }

  const tabs: Array<{ key: WithdrawalStatusFilter; label: string }> = [
    { key: "pending", label: t("admin.withdrawals.tabPending") },
    { key: "completed", label: t("history.status.completed") },
    { key: "rejected", label: t("history.status.rejected") },
    { key: "all", label: t("admin.filter.all") },
  ];

  return (
    <>
      <PageHeader title={t("admin.withdrawals.pageTitle")} description={t("admin.withdrawals.pageDesc")} />

      {/* ── Pending summary ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-canvas p-4 shadow-1">
        <span className="grid size-10 place-items-center rounded-lg bg-warning-soft text-warning">
          <Banknote size={20} />
        </span>
        <div>
          <p className="m-0 text-xs text-ink-mute">{t("admin.withdrawals.pendingSummary")}</p>
          <p className="wt-540 m-0 text-xl text-ink">
            ৳{pendingAmount.toLocaleString()}{" "}
            <span className="text-sm wt-460 text-ink-mute">· {pendingCount}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] wt-540 transition-colors ${
                status === tab.key
                  ? "bg-primary text-on-primary"
                  : "border border-hairline bg-canvas text-ink-mute hover:bg-canvas-soft"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="md:w-44">
          <Select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setPage(1);
            }}
            aria-label={t("admin.withdrawals.providerFilter")}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? t("admin.filter.allProviders") : t(`wallet.provider.${p}`)}
              </option>
            ))}
          </Select>
        </div>
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
      ) : withdrawals.length === 0 ? (
        <EmptyState title={status === "pending" ? t("admin.withdrawals.empty") : t("admin.submissions.emptyFiltered")} />
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas shadow-1">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="wt-540 text-sm text-ink">৳{w.amount}</span>
                  <span className="text-sm text-ink-mute">
                    {w.profiles?.name ?? "—"} · {w.profiles?.phone ?? "—"}
                  </span>
                  <Badge tone={statusTone(w.status)}>{t(`history.status.${w.status}`)}</Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                  <Badge tone="info">{t(`wallet.provider.${w.provider}`)}</Badge>
                  {w.account_number}
                  {" · "}
                  {new Date(w.requested_at).toLocaleString()}
                </p>
                {w.admin_note !== null && (
                  <p className="mt-1 text-xs text-ink-faint">{w.admin_note}</p>
                )}
              </div>
              {w.status === "pending" && (
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setNoteFor({ w, action: "completed" });
                      setActionError(null);
                    }}
                  >
                    {t("admin.withdrawals.complete")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setNoteFor({ w, action: "rejected" });
                      setActionError(null);
                    }}
                  >
                    {t("admin.withdrawals.reject")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </div>

      {noteFor !== null && (
        <Modal
          open
          onClose={() => setNoteFor(null)}
          title={
            noteFor.action === "completed"
              ? t("admin.withdrawals.completeTitle")
              : t("admin.withdrawals.rejectTitle")
          }
        >
          {noteFor.action === "completed" && (
            <p className="mb-3 text-[13px] text-ink-mute">{t("admin.withdrawals.manualNote")}</p>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("admin.withdrawals.notePlaceholder")}
            rows={3}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={noteFor.action === "completed" ? "success" : "danger"}
              loading={busy}
              onClick={() => void confirmAction()}
            >
              {noteFor.action === "completed"
                ? t("admin.withdrawals.completeConfirm")
                : t("admin.withdrawals.rejectConfirm")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
