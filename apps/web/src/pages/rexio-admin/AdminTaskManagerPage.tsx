// apps/web/src/pages/rexio-admin/AdminTaskManagerPage.tsx
// Route: "/rexio-admin/tasks" — task list with progress bars, status filter,
// pagination, and a slide-over TaskFormSheet for create/edit (?new=1 opens it).
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, ChevronRight } from "lucide-react";
import { useAdminTasks } from "@/hooks/useAdminTasks";
import type { TaskStatusFilter } from "@/hooks/useAdminTasks";
import type { Task } from "@wa-marketing-bd/shared-types";
import {
  PageHeader,
  Button,
  Badge,
  statusTone,
  EmptyState,
  ListSkeleton,
  Pagination,
} from "@/components/admin/ui";
import { TaskFormSheet } from "@/components/admin/TaskFormSheet";

const PAGE_SIZE = 20;

function FilterChips({
  value,
  onChange,
}: {
  value: TaskStatusFilter;
  onChange: (v: TaskStatusFilter) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const options: Array<{ key: TaskStatusFilter; label: string }> = [
    { key: "all", label: t("admin.filter.all") },
    { key: "active", label: t("history.status.active") },
    { key: "paused", label: t("history.status.paused") },
    { key: "expired", label: t("history.status.expired") },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] wt-540 transition-colors ${
            value === o.key
              ? "bg-primary text-on-primary"
              : "bg-canvas text-ink-mute border border-hairline hover:bg-canvas-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Progress({ done, max }: { done: number; max: number }): React.ReactElement {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((done / max) * 100));
  const full = done >= max;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas-soft">
        <div
          className={`h-full rounded-full ${full ? "bg-success" : "bg-info"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-ink-mute">
        {done}/{max} · {pct}%
      </span>
    </div>
  );
}

function TaskRow({
  task,
  onToggleStatus,
  onEdit,
  busy,
}: {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  busy: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="wt-540 text-sm text-ink">৳{task.payout_amount}</span>
          <span className="text-sm text-ink-mute">+{task.whatsapp_number}</span>
          <Badge tone={statusTone(task.status)}>{t(`history.status.${task.status}`)}</Badge>
        </div>
        <p className="mt-1 truncate text-[13px] text-ink-mute">{task.message}</p>
        <p className="mt-1 text-xs text-ink-faint">
          {t("admin.tasks.completionCount", { count: task.completion_count, max: task.max_completions })} ·{" "}
          {new Date(task.expires_at).toLocaleString()}
        </p>
        <div className="mt-2">
          <Progress done={task.completion_count} max={task.max_completions} />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" loading={busy} onClick={() => onToggleStatus(task)}>
          {task.status === "active" ? t("admin.tasks.pause") : t("admin.tasks.resume")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
          {t("admin.tasks.edit")}
        </Button>
        <Link
          to={`/rexio-admin/tasks/${task.id}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-hairline bg-canvas px-3 text-[13px] wt-540 text-info no-underline transition-colors hover:bg-canvas-soft"
        >
          {t("admin.tasks.details")} <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function AdminTaskManagerPage(): React.ReactElement {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<TaskStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { tasks, total, isLoading, error, reload, updateTask } = useAdminTasks({
    page,
    pageSize: PAGE_SIZE,
    status,
  });

  // Dashboard quick action "?new=1" opens the create sheet.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setSheetOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function toggleStatus(task: Task): Promise<void> {
    setBusyId(task.id);
    await updateTask(task.id, { status: task.status === "active" ? "paused" : "active" });
    setBusyId(null);
  }

  return (
    <>
      <PageHeader
        title={t("admin.tasks.listTitle")}
        description={t("admin.tasks.listDesc")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus size={16} /> {t("admin.tasks.newButton")}
          </Button>
        }
      />

      <div className="mb-4">
        <FilterChips
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      {error !== null && (
        <p role="alert" className="mt-0 mb-4 text-sm text-danger">
          {t("admin.error.load_failed")}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Plus size={22} />}
          title={t("admin.tasks.empty")}
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              <Plus size={16} /> {t("admin.tasks.newButton")}
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-hairline rounded-xl border border-hairline bg-canvas shadow-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggleStatus={(tt) => void toggleStatus(tt)}
              onEdit={(tt) => {
                setEditing(tt);
                setSheetOpen(true);
              }}
              busy={busyId === task.id}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </div>

      <TaskFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        onSaved={reload}
      />
    </>
  );
}
