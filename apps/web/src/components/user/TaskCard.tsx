// apps/web/src/components/user/TaskCard.tsx
// Task list card — number, message excerpt, payout, deadline, state badge.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { TaskWithStatus } from "@/hooks/useTasks";

export function TaskCard({ entry }: { entry: TaskWithStatus }): React.ReactElement {
  const { t } = useTranslation();
  const { task, submission } = entry;

  return (
    <Link
      to={`/app/task/${task.id}`}
      style={{
        display: "block",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--rounded-lg)",
        padding: "var(--spacing-xl)",
        textDecoration: "none",
        color: "inherit",
        background: "var(--color-canvas)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-sm)",
        }}
      >
        <strong style={{ fontSize: "18px", fontVariationSettings: '"wght" 540' }}>
          ৳{task.payout_amount}
        </strong>
        <span
          style={{
            fontSize: "12px",
            fontVariationSettings: '"wght" 600',
            color: submission !== null ? "#1a7a3c" : "var(--color-ink-mute)",
          }}
        >
          {submission !== null
            ? t(`task.status.${submission.status}`)
            : t("task.status.available")}
        </span>
      </div>
      <p style={{ margin: 0, color: "var(--color-ink-mute)", fontSize: "14px" }}>
        {task.message.length > 80 ? `${task.message.slice(0, 80)}…` : task.message}
      </p>
      <p style={{ margin: "8px 0 0", color: "var(--color-ink-faint)", fontSize: "12px" }}>
        {t("task.card.deadline")}: {new Date(task.expires_at).toLocaleString()}
      </p>
    </Link>
  );
}
