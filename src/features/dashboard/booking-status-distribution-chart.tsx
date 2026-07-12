import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BookingStatusDistribution } from "./dashboard-model";

export type BookingStatusDistributionChartProps = {
  statusDist: BookingStatusDistribution;
};

const statusBuckets = [
  { key: "confirmed", label: "Confirmed", top: "#60a5fa", bottom: "#3b82f6" },
  { key: "pending", label: "Pending", top: "#34d399", bottom: "#10b981" },
  { key: "completed", label: "Completed", top: "#fb923c", bottom: "#f97316" },
  { key: "cancelled", label: "Cancelled", top: "#f472b6", bottom: "#ec4899" },
] as const;

export function BookingStatusDistributionChart({
  statusDist,
}: BookingStatusDistributionChartProps) {
  const chartId = useId().replace(/:/g, "");
  const chartData = statusBuckets.map((bucket) => ({
    label: bucket.label,
    value: statusDist[bucket.key],
    gradientId: `${chartId}-${bucket.key}`,
  }));
  const totalBookings = chartData.reduce((total, entry) => total + entry.value, 0);

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none">
      <h2 className="text-xs font-normal text-[var(--muted-foreground)]">
        Booking status distribution
      </h2>
      <p className="mt-1 text-3xl font-medium tabular-nums">{totalBookings}</p>
      <div className="mt-4 h-[200px] w-full" role="img" aria-label="Booking status distribution">
        <dl className="sr-only">
          {chartData.map((entry) => (
            <div key={entry.gradientId}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            barCategoryGap="28%"
            margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
          >
            <defs>
              {statusBuckets.map((bucket) => {
                const gradientId = `${chartId}-${bucket.key}`;
                return (
                  <linearGradient id={gradientId} key={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={bucket.top} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={bucket.bottom} stopOpacity={0.85} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              horizontal
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.45}
            />
            <CartesianGrid
              horizontal={false}
              vertical
              stroke="var(--border)"
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                fontSize: 12,
                padding: "8px 12px",
              }}
            />
            <Bar dataKey="value" isAnimationActive={false} maxBarSize={44} radius={[10, 10, 4, 4]}>
              {chartData.map((entry) => (
                <Cell key={entry.gradientId} fill={`url(#${entry.gradientId})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
