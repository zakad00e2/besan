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
import type { ScoreDistribution } from "./dashboard-model";

export type ScoreDistributionChartProps = {
  scoreDist: ScoreDistribution;
  avgScore?: number;
};

const scoreBuckets = [
  { key: "high", label: "4.5+", top: "#60a5fa", bottom: "#3b82f6" },
  { key: "good", label: "4.0–4.4", top: "#34d399", bottom: "#10b981" },
  { key: "medium", label: "3.5–3.9", top: "#fb923c", bottom: "#f97316" },
  { key: "low", label: "أقل من 3.5", top: "#f472b6", bottom: "#ec4899" },
] as const;

const bucketScores: Record<keyof ScoreDistribution, number> = {
  high: 4.75,
  good: 4.2,
  medium: 3.7,
  low: 3.25,
};

export function calculateScoreAverage(scoreDist: ScoreDistribution) {
  const total = Object.values(scoreDist).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  return (
    (scoreDist.high * bucketScores.high +
      scoreDist.good * bucketScores.good +
      scoreDist.medium * bucketScores.medium +
      scoreDist.low * bucketScores.low) /
    total
  );
}

export function ScoreDistributionChart({ scoreDist, avgScore }: ScoreDistributionChartProps) {
  const chartId = useId().replace(/:/g, "");
  const chartData = scoreBuckets.map((bucket) => ({
    label: bucket.label,
    value: scoreDist[bucket.key],
    gradientId: `${chartId}-${bucket.key}`,
  }));
  const displayedAverage = (avgScore ?? calculateScoreAverage(scoreDist)).toFixed(1);

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none">
      <h2 className="text-sm font-normal text-[var(--muted-foreground)]">توزيع التقييمات</h2>
      <p className="mt-1 text-3xl font-medium tabular-nums">{displayedAverage}</p>
      <div className="mt-4 h-[200px] w-full" role="img" aria-label="توزيع التقييمات">
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
              {scoreBuckets.map((bucket) => {
                const gradientId = `${chartId}-${bucket.key}`;
                return (
                  <linearGradient id={gradientId} key={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={bucket.top} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={bucket.bottom} stopOpacity={0.85} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeOpacity={0.45} />
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
