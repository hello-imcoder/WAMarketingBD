// apps/web/src/components/app/ui/PageHeader.tsx
// Page title + description + right-aligned actions.
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="wt-540 m-0 text-xl text-ink">{title}</h1>
        {description !== undefined && (
          <p className="mt-1 text-[13px] text-ink-mute">{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
