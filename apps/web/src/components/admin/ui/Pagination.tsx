// apps/web/src/components/admin/ui/Pagination.tsx
// Server-side pagination controls (hooks use supabase .range()).
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}): React.ReactElement | null {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <p className="m-0 text-xs text-ink-mute">
        {from}–{to} / {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="px-1 text-xs text-ink-mute">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
