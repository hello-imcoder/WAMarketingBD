// apps/web/src/components/app/charts/EarningsChart.tsx
// User wallet insights — daily approved-earnings area chart (last 14 days).
// Colors come from design tokens (CSS vars work as SVG fill/stroke values).
// Recharts is only imported inside the lazy user chunk.
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { EmptyState } from "@/components/app/ui";

const GRID_STROKE = "var(--color-hairline)";
const TICK = { fill: "var(--color-ink-mute)", fontSize: 11 };

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}): React.ReactElement | null {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-hairline bg-canvas px-3 py-2 shadow-2">
      {typeof label === "string" && (
        <p className="m-0 mb-1 text-xs wt-540 text-ink">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="m-0 flex items-center gap-1.5 text-xs text-ink-mute">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="wt-600 text-ink">৳{String(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function EarningsChart(): React.ReactElement {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [data, setData] = useState<Array<{ date: string; amount: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session === null) return;
    const userId = session.user.id;
    void (async () => {
      setIsLoading(true);
      const since = new Date(Date.now() - 13 * 86_400_000).toISOString();
      const { data: rows } = await supabase
        .from("submissions")
        .select("submitted_at, tasks(payout_amount)")
        .eq("user_id", userId)
        .eq("status", "approved")
        .gte("submitted_at", since);

      // Daily buckets for the last 14 days (oldest → newest).
      const buckets = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        buckets.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
      }
      for (const r of (rows ?? []) as unknown as Array<{
        submitted_at: string;
        tasks: { payout_amount: number } | null;
      }>) {
        const day = r.submitted_at.slice(0, 10);
        if (buckets.has(day)) {
          buckets.set(day, (buckets.get(day) ?? 0) + (r.tasks?.payout_amount ?? 0));
        }
      }
      setData([...buckets.entries()].map(([date, amount]) => ({ date, amount })));
      setIsLoading(false);
    })();
  }, [session]);

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  if (!isLoading && total === 0) {
    return <EmptyState title={t("wallet.insights.empty")} />;
  }

  return (
    <div>
      <p className="mb-2 mt-0 flex items-baseline justify-between text-[13px] text-ink-mute">
        <span>{t("wallet.insights.title")}</span>
        <span className="wt-540 text-base text-success">৳{total}</span>
      </p>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-md bg-canvas-soft" aria-hidden />
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              name={t("wallet.insights.series")}
              stroke="var(--color-success)"
              strokeWidth={2}
              fill="url(#earningsFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
