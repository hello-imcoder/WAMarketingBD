// apps/web/src/pages/app/TaskPage.tsx
// Route: "/app/task" — list of active, non-expired tasks (§6.2).
// Multiple tasks can be taken concurrently (no one-at-a-time lock).
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { useAuthStore } from "@/stores/authStore";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/user/TaskCard";

export default function TaskPage(): React.ReactElement {
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const { tasks, isLoading, error, reload } = useTasks(session);

  useEffect(() => {
    applySeo({ title: t("task.list.metaTitle"), description: t("task.list.metaDescription") });
  }, [t]);

  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "640px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontVariationSettings: '"wght" 540', margin: "0 0 24px" }}>
        {t("task.list.title")}
      </h1>

      {isLoading && <p role="status">{t("common.loading")}</p>}

      {error !== null && (
        <p role="alert" className="auth-error">
          {t("task.error.loadFailed")}
        </p>
      )}

      {!isLoading && error === null && tasks.length === 0 && (
        <p style={{ color: "var(--color-ink-mute)" }}>{t("task.list.empty")}</p>
      )}

      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        {tasks.map((entry) => (
          <TaskCard key={entry.task.id} entry={entry} />
        ))}
      </div>

      <button
        type="button"
        onClick={reload}
        className="auth-submit-btn"
        style={{ maxWidth: "200px", marginTop: "var(--spacing-xl)" }}
      >
        {t("task.list.refresh")}
      </button>
    </main>
  );
}

