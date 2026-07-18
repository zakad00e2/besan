# Score Distribution Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard’s manual booking-status graphic with a reusable, responsive Recharts score-distribution chart backed by dashboard state.

**Architecture:** Add a focused `ScoreDistributionChart` component that owns its data transformation, calculated fallback average, SVG gradients, and Recharts presentation. Add the rating distribution to `DashboardState`, allowing `DashboardOverview` to pass state-owned data into the component rather than embedding values in the view.

**Tech Stack:** React 19, TypeScript, Recharts 2.15, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Use React and Recharts only for the chart; do not import any shadcn chart or card primitive.
- `ScoreDistributionChart` accepts `scoreDist: { high: number; good: number; medium: number; low: number }` and optional `avgScore?: number`.
- Render buckets exactly as `4.5+`, `4.0–4.4`, `3.5–3.9`, and `أقل من 3.5`, in that order.
- Use state-provided distribution data; no component-local sample counts or hard-coded chart data.
- Use `BarChart` with `barCategoryGap="28%"` and `margin={{ top: 8, right: 8, left: -12, bottom: 4 }}`.
- Set `maxBarSize={44}`, `radius={[10, 10, 4, 4]}`, and `isAnimationActive={false}`.
- Use the four specified vertical gradients, tooltip and cursor styles, and axis/grid styling from the approved design.
- Preserve unrelated working-tree changes in `dashboard-shell.tsx`, `dashboard-ui.tsx`, and `src/assets/besan-logo.png`.

---

## File Structure

- Create `src/features/dashboard/score-distribution-chart.tsx`: reusable rating-chart API, average calculation, and Recharts rendering.
- Create `src/features/dashboard/score-distribution-chart.test.tsx`: chart API and fallback-average regression tests.
- Modify `src/features/dashboard/dashboard-model.ts`: own the `ScoreDistribution` type and dashboard state fields.
- Modify `src/features/dashboard/dashboard-data.ts`: provide the demo dashboard’s score-distribution values as data, not view constants.
- Modify `src/features/dashboard/dashboard-overview.tsx`: remove the manual booking-status chart and render `ScoreDistributionChart`.
- Modify `src/routes/dashboard/index.tsx`: pass distribution data from dashboard state to the overview.
- Modify `src/features/dashboard/dashboard-overview.test.tsx`: supply the required score props to overview renders.

### Task 1: Create the reusable score chart with test-first coverage

**Files:**

- Create: `src/features/dashboard/score-distribution-chart.test.tsx`
- Create: `src/features/dashboard/score-distribution-chart.tsx`

**Interfaces:**

- Consumes: `ScoreDistribution` from `./dashboard-model`.
- Produces: `calculateScoreAverage(scoreDist: ScoreDistribution): number` and `ScoreDistributionChart({ scoreDist, avgScore }: ScoreDistributionChartProps): JSX.Element`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { calculateScoreAverage, ScoreDistributionChart } from "./score-distribution-chart";

afterEach(cleanup);

const scoreDist = { high: 8, good: 4, medium: 2, low: 1 };

describe("calculateScoreAverage", () => {
  it("calculates the weighted bucket estimate", () => {
    expect(calculateScoreAverage(scoreDist)).toBeCloseTo(4.36, 2);
  });

  it("returns zero for an empty distribution", () => {
    expect(calculateScoreAverage({ high: 0, good: 0, medium: 0, low: 0 })).toBe(0);
  });
});

describe("ScoreDistributionChart", () => {
  it("renders the four score buckets and uses an explicit average", () => {
    render(<ScoreDistributionChart scoreDist={scoreDist} avgScore={4.6} />);

    expect(screen.getByText("توزيع التقييمات")).toBeTruthy();
    expect(screen.getByText("4.6")).toBeTruthy();
    expect(screen.getByText("4.5+")).toBeTruthy();
    expect(screen.getByText("4.0–4.4")).toBeTruthy();
    expect(screen.getByText("3.5–3.9")).toBeTruthy();
    expect(screen.getByText("أقل من 3.5")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("displays the calculated average when avgScore is absent", () => {
    render(<ScoreDistributionChart scoreDist={scoreDist} />);

    expect(screen.getByText("4.4")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/dashboard/score-distribution-chart.test.tsx`

Expected: FAIL because `./score-distribution-chart` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```tsx
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
  const chartData = scoreBuckets.map((bucket) => ({
    label: bucket.label,
    value: scoreDist[bucket.key],
    gradientId: `score-distribution-${bucket.key}`,
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
              {scoreBuckets.map((bucket) => (
                <linearGradient
                  id={`score-distribution-${bucket.key}`}
                  key={bucket.key}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={bucket.top} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={bucket.bottom} stopOpacity={0.85} />
                </linearGradient>
              ))}
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
                padding: "8px 12px",
                fontSize: 12,
                boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
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
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/features/dashboard/score-distribution-chart.test.tsx`

Expected: PASS with four tests and no assertion failures.

- [ ] **Step 5: Commit the reusable component**

```powershell
git add -- src/features/dashboard/score-distribution-chart.tsx src/features/dashboard/score-distribution-chart.test.tsx
git commit -m "feat: add score distribution chart"
```

### Task 2: Supply score data through dashboard state and replace the old chart

**Files:**

- Modify: `src/features/dashboard/dashboard-model.ts:45-58`
- Modify: `src/features/dashboard/dashboard-data.ts:129-134`
- Modify: `src/routes/dashboard/index.tsx:7-10`
- Modify: `src/features/dashboard/dashboard-overview.tsx:1-220`
- Modify: `src/features/dashboard/dashboard-overview.test.tsx:8-31`

**Interfaces:**

- Consumes: `ScoreDistribution` and `ScoreDistributionChart` from Task 1.
- Produces: a dashboard overview that renders the chart from `DashboardState.scoreDist` and optional `DashboardState.avgScore`.

- [ ] **Step 1: Write the failing dashboard integration test**

Add this expectation inside the existing `shows metrics, reminder queue, and follow-up customers` test after rendering `DashboardOverview`:

```tsx
expect(screen.getByText("توزيع التقييمات")).toBeTruthy();
expect(screen.getByText(demoDashboardState.avgScore!.toFixed(1))).toBeTruthy();
```

Update both `DashboardOverview` test renders to provide these props:

```tsx
scoreDist={demoDashboardState.scoreDist}
avgScore={demoDashboardState.avgScore}
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because `DashboardState` and `DashboardOverview` do not yet expose score-distribution properties.

- [ ] **Step 3: Add the model, state data, and chart integration**

In `dashboard-model.ts`, define the state-owned shape and fields:

```ts
export type ScoreDistribution = {
  high: number;
  good: number;
  medium: number;
  low: number;
};

export type DashboardState = {
  customers: Customer[];
  appointments: Appointment[];
  availability: AvailabilitySlot[];
  reminderSettings: ReminderSettings;
  scoreDist: ScoreDistribution;
  avgScore?: number;
};
```

In `dashboard-data.ts`, include the demo source values in `demoDashboardState`:

```ts
scoreDist: { high: 8, good: 4, medium: 2, low: 1 },
avgScore: 4.4,
```

In `routes/dashboard/index.tsx`, pass the state values:

```tsx
return (
  <DashboardOverview
    customers={state.customers}
    appointments={state.appointments}
    scoreDist={state.scoreDist}
    avgScore={state.avgScore}
  />
);
```

In `dashboard-overview.tsx`, remove `BarChart3`, `appointmentStatusLabels`, `AppointmentStatus`, `statusCounts`, and `maxStatusCount`; import `ScoreDistributionChart` and `ScoreDistribution`; extend the overview props; then replace the `<InsightCard title="Booking status distribution" ...>` block with:

```tsx
<ScoreDistributionChart scoreDist={scoreDist} avgScore={avgScore} />
```

- [ ] **Step 4: Run the focused integration test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS with both overview tests green.

- [ ] **Step 5: Run all project verification commands**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint reports no errors, and Vite completes a production build successfully.

- [ ] **Step 6: Commit the integration**

```powershell
git add -- src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-data.ts src/routes/dashboard/index.tsx src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-overview.test.tsx
git commit -m "feat: show ratings distribution on dashboard"
```
