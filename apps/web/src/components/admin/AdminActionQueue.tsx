// apps/web/src/components/admin/AdminActionQueue.tsx
// Dashboard action queue — latest pending submissions + withdrawals with
// inline one-click approve/complete. Review actions reuse the existing
// Edge Function flows from useAdminSubmissions / useAdminWithdrawals.
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, Wallet, ArrowRight, Check } from "lucide-react";
import { Card, CardHeader, Badge, Button, EmptyState, useToast } from "./ui";
import { useAuthStore } from "@/stores/authStore";
import { reviewSubmission } from "@/lib/adminSubmissionReview";
import { reviewWithdrawal } from "@/lib/adminWithdrawalReview";
import type { QueueSubmission, QueueWithdrawal } from "@/hooks/useAdminDashboardData";

export function AdminActionQueue({
  submissions,
  withdrawals,
  onActionDone,
}: {
  submissions: QueueSubmission[];
  withdrawals: QueueWithdrawal[];
  onActionDone: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const session = useAuthStore((s) => s.session);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approveSubmission(id: string): Promise<void> {
    if (session === null) return;
    setBusyId(id);
    const code = await reviewSubmission(session, id, "approved", null);
    setBusyId(null);
    if (code !== null) {
      error(t("admin.error.generic"));
      return;
    }
    success(t("admin.queue.approvedToast"));
    onActionDone();
  }

  async function completeWithdrawal(id: string): Promise<void> {
    if (session === null) return;
    setBusyId(id);
    const code = await reviewWithdrawal(session, id, "completed", null);
    setBusyId(null);
    if (code !== null) {
      error(t("admin.error.generic"));
      return;
    }
    success(t("admin.queue.completedToast"));
    onActionDone();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t("admin.queue.pendingSubmissions")}
          icon={<ClipboardCheck size={18} />}
          actions={
            <Link
              to="/rexio-admin/submissions"
              className="flex items-center gap-1 text-[13px] text-info no-underline hover:underline"
            >
              {t("admin.queue.viewAll")} <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="flex flex-col divide-y divide-hairline">
          {submissions.length === 0 && (
            <div className="p-4">
              <EmptyState icon={<Check size={20} />} title={t("admin.submissions.empty")} />
            </div>
          )}
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm wt-540 text-ink">
                  {s.userName} · {s.userPhone}
                </p>
                <p className="m-0 text-xs text-ink-mute">
                  ৳{s.payoutAmount} · {new Date(s.submittedAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="success"
                loading={busyId === s.id}
                onClick={() => void approveSubmission(s.id)}
              >
                {t("admin.submissions.approve")}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t("admin.queue.pendingWithdrawals")}
          icon={<Wallet size={18} />}
          actions={
            <Link
              to="/rexio-admin/withdrawals"
              className="flex items-center gap-1 text-[13px] text-info no-underline hover:underline"
            >
              {t("admin.queue.viewAll")} <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="flex flex-col divide-y divide-hairline">
          {withdrawals.length === 0 && (
            <div className="p-4">
              <EmptyState icon={<Check size={20} />} title={t("admin.withdrawals.empty")} />
            </div>
          )}
          {withdrawals.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm wt-540 text-ink">
                  ৳{w.amount} · {w.userName} · {w.userPhone}
                </p>
                <p className="m-0 flex items-center gap-2 text-xs text-ink-mute">
                  <Badge tone="info">{t(`wallet.provider.${w.provider}`)}</Badge>
                  {w.accountNumber}
                </p>
              </div>
              <Button
                size="sm"
                variant="success"
                loading={busyId === w.id}
                onClick={() => void completeWithdrawal(w.id)}
              >
                {t("admin.withdrawals.complete")}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
