// apps/web/src/components/admin/charts/DashboardCharts.tsx
// Recharts wrappers for the admin dashboard + per-task stats.
// Colors come from design tokens (CSS vars work as SVG fill/stroke values).
// Recharts is only imported inside the lazy admin chunk.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";

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
          {p.name}: <span className="wt-600 text-ink">{String(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function SubmissionsTrendChart({
  data,
  height = 240,
}: {
  data: Array<{ date: string; pending: number; approved: number }>;
  height?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-canvas-soft)" }} />
        <Bar dataKey="approved" name={t("admin.chart.approved")} stackId="s" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="pending" name={t("admin.chart.pending")} stackId="s" fill="var(--color-warning)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SignupsChart({
  data,
  height = 240,
}: {
  data: Array<{ date: string; count: number }>;
  height?: number;
}): React.ReactElement {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="count" name="Signups" stroke="var(--color-info)" strokeWidth={2} fill="url(#signupFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  bkash: "#e2136e",
  nagad: "#f6921e",
  rocket: "#8c3494",
  upay: "#00a99d",
};

export function ProviderDonut({
  data,
  height = 220,
}: {
  data: Array<{ provider: string; amount: number }>;
  height?: number;
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="provider"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={3}
          stroke="var(--color-canvas)"
        >
          {data.map((d) => (
            <Cell key={d.provider} fill={PROVIDER_COLORS[d.provider] ?? "var(--color-primary)"} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ApprovalRing({
  rate,
  height = 220,
}: {
  rate: number; // 0–100
  height?: number;
}): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, rate));
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={[
              { name: "bg", value: 100, fill: "var(--color-canvas-soft)" },
              { name: "rate", value: clamped, fill: "var(--color-success)" },
            ]}
            dataKey="value"
            innerRadius="68%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill="var(--color-canvas-soft)" />
            <Cell fill="var(--color-success)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="wt-540 m-0 text-3xl text-ink">{clamped}%</p>
        </div>
      </div>
    </div>
  );
}

// ── Per-task charts ──────────────────────────────────────────────────────────

export function TaskStatusDonut({
  pending,
  approved,
  rejected,
  height = 200,
}: {
  pending: number;
  approved: number;
  rejected: number;
  height?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const data = [
    { name: t("admin.chart.approved"), value: approved, fill: "var(--color-success)" },
    { name: t("admin.chart.pending"), value: pending, fill: "var(--color-warning)" },
    { name: t("admin.chart.rejected"), value: rejected, fill: "var(--color-danger)" },
  ].filter((d) => d.value > 0);
  if (data.length === 0) {
    return (
      <p className="grid place-items-center text-sm text-ink-mute" style={{ height }}>
        {t("admin.taskDetail.noSubmissions")}
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3} stroke="var(--color-canvas)">
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TaskSubmissionsChart({
  data,
  height = 240,
}: {
  data: Array<{ date: string; approved: number; pending: number; rejected: number }>;
  height?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-canvas-soft)" }} />
        <Bar dataKey="approved" name={t("admin.chart.approved")} stackId="s" fill="var(--color-success)" />
        <Bar dataKey="pending" name={t("admin.chart.pending")} stackId="s" fill="var(--color-warning)" />
        <Bar dataKey="rejected" name={t("admin.chart.rejected")} stackId="s" fill="var(--color-danger)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
