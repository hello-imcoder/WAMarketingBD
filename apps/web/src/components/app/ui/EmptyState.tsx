// apps/web/src/components/app/ui/EmptyState.tsx
// Empty-list placeholder with optional action.
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hairline bg-canvas-soft px-6 py-10 text-center">
      {icon !== undefined && <span className="text-ink-faint">{icon}</span>}
      <p className="wt-540 m-0 text-sm text-ink">{title}</p>
      {hint !== undefined && (
        <p className="m-0 max-w-sm text-[13px] text-ink-mute">{hint}</p>
      )}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
