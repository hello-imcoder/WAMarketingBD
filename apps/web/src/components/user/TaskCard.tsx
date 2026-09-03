// apps/web/src/components/user/TaskCard.tsx
// Task list card — payout, message excerpt, deadline, state badge.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Clock } from "lucide-react";
import type { TaskWithStatus } from "@/hooks/useTasks";
import { Badge, statusTone } from "@/components/app/ui";

export function TaskCard({ entry }: { entry: TaskWithStatus }): React.ReactElement {
  const { t } = useTranslation();
  const { task, submission } = entry;

  return (
    <Link
      to={`/app/task/${task.id}`}
      className="flex h-full flex-col gap-2 rounded-xl border border-hairline bg-canvas p-4 shadow-1 no-underline transition-colors hover:border-ink-faint"
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="wt-540 text-lg text-ink">৳{task.payout_amount}</strong>
        <Badge tone={submission !== null ? statusTone(submission.status) : "Approved"}>
          {submission !== null
            ? t(`task.status.${submission.status}`)
            : t("task.status.available")}
        </Badge>
      </div>
      <p className="m-0 line-clamp-2 text-sm text-ink-mute">{task.message}</p>
      <p className="mt-auto mb-0 flex items-center gap-1.5 text-xs text-ink-faint">
        <Clock size={12} />
        {t("task.card.deadline")}: {new Date(task.expires_at).toLocaleString()}
      </p>
    </Link>
  );
}
