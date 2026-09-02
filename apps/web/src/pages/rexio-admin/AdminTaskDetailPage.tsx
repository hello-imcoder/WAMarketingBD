// apps/web/src/pages/rexio-admin/AdminTaskDetailPage.tsx
// Route: "/rexio-admin/tasks/:taskId" — per-task statistics:
// progress, status counts, status donut, submissions-over-time chart, and the
// task's submission list with inline approve/reject (shared review flow).
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ClipboardCheck,
  Clock,
  CircleCheck,
  CircleX,
  Users,
  Banknote,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminTaskDetail } from "@/hooks/useAdminTaskDetail";
import { reviewSubmission } from "@/lib/adminSubmissionReview";
import type { ReviewErrorCode } from "@/lib/adminSubmissionReview";
import { useAuthStore } from "@/stores/authStore";
import {
  Badge,
  statusTone,
  Button,
  Card,
  CardHeader,
  Modal,
  Textarea,
  ListSkeleton,
  EmptyState,
  useToast,
} from "@/components/admin/ui";
import { TaskStatusDonut, TaskSubmissionsChart } from "@/components/admin/charts/DashboardCharts";
import type { TaskSubmissionRow } from "@/hooks/useAdminTaskDetail";

function MiniStat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}): React.ReactElement {
  const tones: Record<string, string> = {
    neutral: "bg-canvas-soft text-ink-mute",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas p-3.5 shadow-1">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 truncate text-xs text-ink-mute">{label}</p>
        <p className="wt-540 m-0 text-lg text-ink">{value}</p>
      </div>
    </div>
  );
}

export default function AdminTaskDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { taskId } = useParams<{ taskId: string }>();
  const session = useAuthStore((s) => s.session);
  const { success, error: toastError } = useToast();
  const { task, submissions, stats, timeline, isLoading, error, reload } =
    useAdminTaskDetail(taskId);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TaskSubmissionRow | null>(null);
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function decide(
    row: TaskSubmissionRow,
    action: "approved" | "rejected",
    rejectionReason: string | null,
  ): Promise<void> {
    if (session === null) return;
    setBusyId(row.id);
    const code: ReviewErrorCode | null = await reviewSubmission(
      session,
      row.id,
      action,
      rejectionReason,
    );
    setBusyId(null);
    if (code !== null) {
      toastError(t("admin.error.generic"));
      return;
    }
    success(action === "approved" ? t("admin.queue.approvedToast") : t("admin.taskDetail.rejectedToast"));
    setRejecting(null);
    setReason("");
    reload();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <ListSkeleton rows={6} />
      </div>
    );
  }
  if (error !== null || task === null) {
    return (
      <EmptyState
        title={t("admin.error.load_failed")}
        action={
          <Button variant="outline" size="sm" onClick={reload}>
            {t("common.retry", "Retry")}
          </Button>
        }
      />
    );
  }

  const pct =
    task.max_completions === 0
      ? 0
      : Math.min(100, Math.round((task.completion_count / task.max_completions) * 100));

  return (
    <>
      <Link
        to="/rexio-admin/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-info no-underline hover:underline"
      >
        <ArrowLeft size={14} /> {t("admin.taskDetail.backToTasks")}
      </Link>

      {/* ── Task header ─────────────────────────────────────────────── */}
      <Card className="mb-5">
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="wt-540 text-lg text-ink">৳{task.payout_amount}</span>
            <span className="text-sm text-ink-mute">+{task.whatsapp_number}</span>
            <Badge tone={statusTone(task.status)}>{t(`history.status.${task.status}`)}</Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{task.message}</p>
          <p className="mt-1 text-xs text-ink-faint">
            {t("admin.tasks.expiresAt")}: {new Date(task.expires_at).toLocaleString()} ·{" "}
            {t("admin.users.joined")}: {new Date(task.created_at).toLocaleDateString()}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas-soft">
              <div
                className={`h-full rounded-full ${stats.approved >= task.max_completions ? "bg-success" : "bg-info"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs wt-540 text-ink-mute">
              {task.completion_count}/{task.max_completions} · {pct}%
            </span>
          </div>
        </div>
      </Card>

      {/* ── Per-task stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat icon={<ClipboardCheck size={18} />} label={t("admin.taskDetail.total")} value={String(stats.total)} />
        <MiniStat icon={<Clock size={18} />} label={t("admin.taskDetail.pending")} value={String(stats.pending)} tone="warning" />
        <MiniStat icon={<CircleCheck size={18} />} label={t("admin.taskDetail.approved")} value={String(stats.approved)} tone="success" />
        <MiniStat icon={<CircleX size={18} />} label={t("admin.taskDetail.rejected")} value={String(stats.rejected)} tone="danger" />
        <MiniStat icon={<Users size={18} />} label={t("admin.taskDetail.uniqueUsers")} value={String(stats.uniqueUsers)} tone="info" />
        <MiniStat icon={<Banknote size={18} />} label={t("admin.taskDetail.payoutCommitted")} value={`৳${stats.payoutCommitted.toLocaleString()}`} />
      </div>

      {/* ── Per-task charts ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("admin.taskDetail.statusBreakdown")}
            description={t("admin.taskDetail.statusBreakdownDesc")}
          />
          <div className="p-4 pt-0">
            <TaskStatusDonut
              pending={stats.pending}
              approved={stats.approved}
              rejected={stats.rejected}
            />
          </div>
        </Card>
        <Card>
          <CardHeader
            title={t("admin.taskDetail.overTime")}
            description={t("admin.taskDetail.overTimeDesc")}
          />
          <div className="p-4 pt-2">
            <TaskSubmissionsChart data={timeline} />
          </div>
        </Card>
      </div>

      {/* ── Task submissions ────────────────────────────────────────── */}
      <h2 className="wt-540 mb-3 mt-6 text-base text-ink">{t("admin.taskDetail.submissionsTitle")}</h2>
      {submissions.length === 0 ? (
        <EmptyState title={t("admin.taskDetail.noSubmissions")} />
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas shadow-1">
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="wt-540 text-sm text-ink">
                    {s.profiles?.name ?? "—"} · {s.profiles?.phone ?? "—"}
                  </span>
                  <Badge tone={statusTone(s.status)}>{t(`history.status.${s.status}`)}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {new Date(s.submitted_at).toLocaleString()}
                  {" · "}
                  {t("admin.submissions.ip")}: {s.ip_address ?? "—"}
                  {" · "}
                  {t("admin.submissions.fingerprint")}:{" "}
                  {s.device_fingerprint !== null ? `${s.device_fingerprint.slice(0, 12)}…` : "—"}
                </p>
                {s.rejection_reason !== null && (
                  <p className="mt-1 text-xs text-danger">
                    {t("admin.submissions.rejectionReason")}: {s.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {s.screenshot_url !== null && (
                  <Button size="sm" variant="outline" onClick={() => setLightbox(s.screenshot_url)}>
                    <ImageIcon size={14} /> {t("admin.submissions.viewScreenshot")}
                  </Button>
                )}
                {s.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      loading={busyId === s.id}
                      onClick={() => void decide(s, "approved", null)}
                    >
                      {t("admin.submissions.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busyId === s.id}
                      onClick={() => {
                        setRejecting(s);
                        setReason("");
                      }}
                    >
                      {t("admin.submissions.reject")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
        {reason.trim() === "" && rejecting !== null && (
          <p className="mt-2 text-xs text-ink-faint">{t("admin.submissions.error.reasonRequired")}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRejecting(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim() === ""}
            loading={rejecting !== null && busyId === rejecting.id}
            onClick={() => {
              if (rejecting !== null) void decide(rejecting, "rejected", reason.trim());
            }}
          >
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
