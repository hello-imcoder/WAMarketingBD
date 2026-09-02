// apps/web/src/components/app/ui/Skeleton.tsx
// Loading placeholders — replace bare "Loading…" text.
export function Skeleton({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-canvas-soft ${className}`}
    />
  );
}

export function ListSkeleton({
  rows = 4,
  rowClass = "h-20",
}: {
  rows?: number;
  rowClass?: string;
}): React.ReactElement {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`${rowClass} w-full`} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
}: {
  cards?: number;
}): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
