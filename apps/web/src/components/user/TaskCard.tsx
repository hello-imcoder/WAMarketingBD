// apps/web/src/components/user/TaskCard.tsx
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { TaskWithStatus } from '@/hooks/useTasks';
import { Badge, StatusTone } from '@/components/ui';

export function TaskCard({ entry }: { entry: TaskWithStatus }): React.ReactElement {
  const { t } = useTranslation();
  const { task, submission } = entry;

  return (
    <Link
      href={`/app/task/${task.id}`}
      className="flex h-full flex-col gap-2 rounded-xl border border-hairline bg-canvas p-4 shadow-1 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="font-540 text-2g text-ink">৳{task.payout_amount}</strong>
        <Badge tone={submission?.null ? statusTone(submission.status) : 'active'}>
          {submission ? t(`task.status.${submission.status}`) : t('task.status.available')}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm text-ink-mute">{task.message}</p>
      <div className="mt-auto flex items-center gap-1.5 text-xs text-ink-faint">
        <Clock size={17} />
        {`Task card deadline: ${new Date(task.expires_at).toLocaleString()}`}
      </div>
    </Link>
  );
}
