// apps/web/src/pages/app/HistoryPage.tsx
// Route: "/app/history" — all of the user's own logs (§6.6), tabbed:
// All / Task / Referral / P2P / Withdrawal. A specific tab paginates that
// source server-side; "All" merges a recent slice from each source.
// Desktop renders a table, mobile stacked rows.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History as HistoryIcon } from "lucide-react";
import { applySeo } from "@/lib/seo";
import { useHistory } from "@/hooks/useHistory";
import type { HistoryEntry } from "@/hooks/useHistory";
import {
  Badge,
  Card,
  EmptyState,
  ListSkeleton,
  PageHeader,
  Pagination,
  statusTone,
} from "@/components/app/ui";

const TABS = ["all", "task", "referral", "p2p", "withdrawal"] as const;
const PAGE_SIZE = 20;

type Tab = (typeof TABS)[number];

function AmountCell({ amount }: { amount: number }): React.ReactElement {
  return (
    <strong
      className={`wt-540 whitespace-nowrap ${
        amount > 0 ? "text-success" : amount < 0 ? "text-ink" : "text-ink-mute"
      }`}
    >
      {amount > 0 ? "+" : ""}৳{amount}
    </strong>
  );
}

function EntryRowMobile({ e }: { e: HistoryEntry }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="wt-540 m-0 truncate text-sm text-ink">
          {t(`history.entry.${e.descKey}`, e.descParams ?? {})}
        </p>
        <p className="m-0 text-xs text-ink-faint">
          {new Date(e.date).toLocaleString()} · {t(`history.status.${e.status}`)}
        </p>
      </div>
      <AmountCell amount={e.amount} />
    </div>
  );
}

function EntryRowDesktop({ e }: { e: HistoryEntry }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <tr className="border-b border-hairline last:border-b-0">
      <td className="px-4 py-3 text-sm text-ink">
        {t(`history.entry.${e.descKey}`, e.descParams ?? {})}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-faint">
        {new Date(e.date).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(e.status)}>{t(`history.status.${e.status}`)}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <AmountCell amount={e.amount} />
      </td>
    </tr>
  );
}

export default function HistoryPage(): React.ReactElement {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const { entries, total, isLoading, error } = useHistory(tab, page, PAGE_SIZE);

  useEffect(() => {
    applySeo({ title: t("history.meta.title"), description: t("history.meta.description") });
  }, [t]);

  function selectTab(next: Tab): void {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("history.title")} />

      {/* ── Filter chips ──────────────────────────────────────────────── */}
      <div role="tablist" aria-label={t("history.title")} className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            type="button"
            onClick={() => selectTab(tb)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors ${
              tab === tb
                ? "border border-primary bg-primary text-on-primary wt-540"
                : "border border-hairline bg-canvas text-ink-mute wt-460 hover:bg-canvas-soft hover:text-ink"
            }`}
          >
            {t(`history.tab.${tb}`)}
          </button>
        ))}
      </div>

      {error !== null && (
        <p role="alert" className="m-0 text-sm text-danger">
          {t("history.error.loadFailed")}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} rowClass="h-16" />
      ) : error === null && entries.length === 0 ? (
        <EmptyState icon={<HistoryIcon size={32} />} title={t("history.empty")} />
      ) : (
        <>
          {/* Desktop table (≥md) */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft text-xs text-ink-mute">
                  <th className="px-4 py-2.5 wt-540">{t("history.col.entry")}</th>
                  <th className="px-4 py-2.5 wt-540">{t("history.col.date")}</th>
                  <th className="px-4 py-2.5 wt-540">{t("history.col.status")}</th>
                  <th className="px-4 py-2.5 text-right wt-540">{t("history.col.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <EntryRowDesktop key={e.id} e={e} />
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile rows (<md) */}
          <Card className="divide-y divide-hairline overflow-hidden md:hidden">
            {entries.map((e) => (
              <EntryRowMobile key={e.id} e={e} />
            ))}
          </Card>

          {total !== null && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}
