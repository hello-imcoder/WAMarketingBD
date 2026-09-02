// apps/web/src/pages/app/TaskPage.tsx
// Route: "/app/task" — list of active, non-expired tasks (§6.2).
// Multiple tasks can be taken concurrently (no one-at-a-time lock).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, RefreshCw } from "lucide-react";
import { applySeo } from "@/lib/seo";
import { useAuthStore } from "@/stores/authStore";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/user/TaskCard";
import {
  Button,
  CardGridSkeleton,
  EmptyState,
  PageHeader,
  Pagination,
} from "@/components/app/ui";

const PAGE_SIZE = 12;

export default function TaskPage(): React.ReactElement {
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const [page, setPage] = useState(1);
  const { tasks, total, isLoading, error, reload } = useTasks(session, page, PAGE_SIZE);

  useEffect(() => {
    applySeo({ title: t("task.list.metaTitle"), description: t("task.list.metaDescription") });
  }, [t]);

  return (
    <>
      <PageHeader
        title={t("task.list.title")}
        actions={
          <Button
            variant="outline"
            size="sm"
            loading={isLoading}
            onClick={() => {
              setPage(1);
              reload();
            }}
          >
            <RefreshCw size={14} />
            {t("task.list.refresh")}
          </Button>
        }
      />

      {error !== null && (
        <p role="alert" className="text-sm text-danger">
          {t("task.error.loadFailed")}
        </p>
      )}

      {isLoading ? (
        <CardGridSkeleton cards={6} />
      ) : error === null && tasks.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title={t("task.list.empty")}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} />
              {t("task.list.refresh")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((entry) => (
              <TaskCard key={entry.task.id} entry={entry} />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}
    </>
  );
}
