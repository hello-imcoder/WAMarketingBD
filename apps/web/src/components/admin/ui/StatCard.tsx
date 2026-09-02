// apps/web/src/components/admin/ui/StatCard.tsx
// KPI card — icon, label, value; optionally a react-router Link.
import { Link } from "react-router";
import type { ReactNode } from "react";

export function StatCard({
  icon,
  label,
  value,
  hint,
  to,
  loading = false,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
  loading?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}): React.ReactElement {
  const toneText: Record<string, string> = {
    neutral: "bg-canvas-soft text-ink-mute",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };

  const body = (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-canvas p-4 shadow-1 transition-colors h-full [&:hover]:border-ink-faint">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneText[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 truncate text-[13px] text-ink-mute">{label}</p>
        <p className="wt-540 m-0 truncate text-2xl text-ink">
          {loading ? "—" : value}
        </p>
        {hint !== undefined && (
          <p className="m-0 truncate text-xs text-ink-faint">{hint}</p>
        )}
      </div>
    </div>
  );

  if (to !== undefined) {
    return (
      <Link to={to} className="block no-underline">
        {body}
      </Link>
    );
  }
  return body;
}
