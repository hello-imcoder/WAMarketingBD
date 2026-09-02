// apps/web/src/components/app/ui/Card.tsx
// Generic user card container + section header helpers.
import type { ReactNode } from "react";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div
      className={`rounded-xl border border-hairline bg-canvas shadow-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4">
      <div className="flex items-start gap-3">
        {icon !== undefined && (
          <span className="mt-0.5 text-ink-mute">{icon}</span>
        )}
        <div>
          <h2 className="wt-540 m-0 text-base text-ink">{title}</h2>
          {description !== undefined && (
            <p className="mt-1 text-[13px] text-ink-mute">{description}</p>
          )}
        </div>
      </div>
      {actions !== undefined && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
