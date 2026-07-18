# Booking Status Distribution Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's fixed rating distribution with a booking-status distribution derived from the live appointment list.

**Architecture:** A pure dashboard-model helper converts `Appointment[]` into four status counts. A presentational `BookingStatusDistributionChart` receives only those counts, while `DashboardOverview` derives them from its existing appointments prop and no longer depends on rating state.

**Tech Stack:** React 19, TypeScript, Recharts 2.15, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Show `Confirmed`, `Pending`, `Completed`, and `Cancelled`, in that order.
- Display total bookings instead of an average score.
- Preserve the existing responsive Recharts layout, gradients, grids, axes, tooltip, cursor, rounded bars, and disabled animation.
- Do not pass full appointment records into the chart.
- Remove fixed `scoreDist` and `avgScore` dashboard state.
- Preserve unrelated user-owned changes in `dashboard-overview.tsx`, `dashboard-shell.tsx`, `dashboard-ui.tsx`, and `src/assets/besan-logo.png`.

---

## File Structure

- Modify `src/features/dashboard/dashboard-model.ts`: define the booking-status distribution and derive it from appointments.
- Modify `src/features/dashboard/dashboard-model.test.ts`: cover status counting and empty input.
- Create `src/features/dashboard/booking-status-distribution-chart.tsx`: render the status chart.
- Create `src/features/dashboard/booking-status-distribution-chart.test.tsx`: cover labels, total, counts, and empty data.
- Delete `src/features/dashboard/score-distribution-chart.tsx` during integration: remove the rating-specific implementation.
- Delete `src/features/dashboard/score-distribution-chart.test.tsx` during integration: remove obsolete rating tests.
- Modify `src/features/dashboard/dashboard-overview.tsx`: derive and render booking statuses.
- Modify `src/features/dashboard/dashboard-overview.test.tsx`: verify appointment-derived chart data.
- Modify `src/features/dashboard/dashboard-data.ts`: remove fixed score data.
- Modify `src/routes/dashboard/index.tsx`: stop passing score props.

### Task 1: Derive booking status counts from appointments

**Files:**

- Modify: `src/features/dashboard/dashboard-model.test.ts`
- Modify: `src/features/dashboard/dashboard-model.ts`

**Interfaces:**

- Consumes: `Appointment[]` and the existing `AppointmentStatus` union.
- Produces: `BookingStatusDistribution` and `getBookingStatusDistribution(appointments)`.

- [ ] **Step 1: Write the failing model tests**

Add `getBookingStatusDistribution` to the import list and append:

```ts
describe("getBookingStatusDistribution", () => {
  it("counts every booking status", () => {
    const statusAppointments: Appointment[] = [
      { ...appointments[0], id: "confirmed", status: "confirmed" },
      { ...appointments[0], id: "pending", status: "pending" },
      { ...appointments[0], id: "completed", status: "completed" },
      { ...appointments[0], id: "cancelled", status: "cancelled" },
      { ...appointments[0], id: "confirmed-2", status: "confirmed" },
    ];

    expect(getBookingStatusDistribution(statusAppointments)).toEqual({
      confirmed: 2,
      pending: 1,
      completed: 1,
      cancelled: 1,
    });
  });

  it("returns zero counts for an empty appointment list", () => {
    expect(getBookingStatusDistribution([])).toEqual({
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    });
  });
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: FAIL because `getBookingStatusDistribution` is not exported.

- [ ] **Step 3: Implement the type and pure helper**

Add this type alongside the existing `ScoreDistribution` until the dashboard integration is complete:

```ts
export type BookingStatusDistribution = Record<AppointmentStatus, number>;
```

Add:

```ts
export function getBookingStatusDistribution(
  appointments: Appointment[],
): BookingStatusDistribution {
  return appointments.reduce<BookingStatusDistribution>(
    (distribution, appointment) => {
      distribution[appointment.status] += 1;
      return distribution;
    },
    { confirmed: 0, pending: 0, completed: 0, cancelled: 0 },
  );
}
```

Do not remove `ScoreDistribution` or the `DashboardState.scoreDist` fields until Task 3, so intermediate imports remain buildable.

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: PASS with both new status-distribution tests green.

- [ ] **Step 5: Commit the helper**

```powershell
git add -- src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts
git commit -m "feat: derive booking status distribution"
```

### Task 2: Replace the rating chart with a booking-status chart

**Files:**

- Create: `src/features/dashboard/booking-status-distribution-chart.test.tsx`
- Create: `src/features/dashboard/booking-status-distribution-chart.tsx`

**Interfaces:**

- Consumes: `BookingStatusDistribution` from `dashboard-model.ts`.
- Produces: `BookingStatusDistributionChart({ statusDist })`.

- [ ] **Step 1: Write the failing component tests**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingStatusDistributionChart } from "./booking-status-distribution-chart";

afterEach(cleanup);

describe("BookingStatusDistributionChart", () => {
  it("renders status labels, supplied counts, and their total", () => {
    render(
      <BookingStatusDistributionChart
        statusDist={{ confirmed: 4, pending: 3, completed: 2, cancelled: 1 }}
      />,
    );

    expect(screen.getByText("Booking status distribution")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Confirmed")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("renders a stable empty distribution", () => {
    render(
      <BookingStatusDistributionChart
        statusDist={{ confirmed: 0, pending: 0, completed: 0, cancelled: 0 }}
      />,
    );

    expect(screen.getByText("0")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- src/features/dashboard/booking-status-distribution-chart.test.tsx`

Expected: FAIL because `booking-status-distribution-chart.tsx` does not exist.

- [ ] **Step 3: Implement the booking-status chart**

Create the component with this complete implementation:

```tsx
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
      <h2 className="text-sm font-normal text-[var(--muted-foreground)]">
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
```

- [ ] **Step 4: Run the component test and verify GREEN**

Run: `npm test -- src/features/dashboard/booking-status-distribution-chart.test.tsx`

Expected: PASS with two component tests.

- [ ] **Step 5: Commit the new chart alongside the existing chart**

```powershell
git add -- src/features/dashboard/booking-status-distribution-chart.tsx src/features/dashboard/booking-status-distribution-chart.test.tsx
git commit -m "feat: chart booking status distribution"
```

### Task 3: Integrate appointment-derived data into the dashboard

**Files:**

- Modify: `src/features/dashboard/dashboard-overview.test.tsx`
- Modify: `src/features/dashboard/dashboard-overview.tsx`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-data.ts`
- Modify: `src/routes/dashboard/index.tsx`
- Delete: `src/features/dashboard/score-distribution-chart.test.tsx`
- Delete: `src/features/dashboard/score-distribution-chart.tsx`

**Interfaces:**

- Consumes: `getBookingStatusDistribution(appointments)` and `BookingStatusDistributionChart`.
- Produces: a dashboard chart that updates directly from the overview's appointments prop.

- [ ] **Step 1: Update the overview test first**

Remove `scoreDist={demoDashboardState.scoreDist}` from both test renders. Replace the rating assertions with:

```tsx
expect(screen.getByText("Booking status distribution")).toBeTruthy();
expect(screen.getByText(String(demoDashboardState.appointments.length))).toBeTruthy();
expect(screen.getByText("Confirmed")).toBeTruthy();
expect(screen.getByText("Pending")).toBeTruthy();
expect(screen.getByText("Completed")).toBeTruthy();
expect(screen.getByText("Cancelled")).toBeTruthy();
```

- [ ] **Step 2: Run the overview test and verify RED**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because `DashboardOverview` still requires `scoreDist` and renders the old chart.

- [ ] **Step 3: Integrate the new chart and remove rating state**

In `dashboard-overview.tsx`:

```tsx
import { BookingStatusDistributionChart } from "./booking-status-distribution-chart";
import { getBookingStatusDistribution } from "./dashboard-model";

const statusDist = useMemo(() => getBookingStatusDistribution(appointments), [appointments]);

<BookingStatusDistributionChart statusDist={statusDist} />;
```

Remove `ScoreDistribution`, `scoreDist`, and `avgScore` from its imports and props.

In `dashboard-model.ts`, remove `ScoreDistribution`, `scoreDist`, and `avgScore`. In `dashboard-data.ts`, remove the fixed `scoreDist` object. Delete both obsolete `score-distribution-chart` files. In `routes/dashboard/index.tsx`, render:

```tsx
return <DashboardOverview customers={state.customers} appointments={state.appointments} />;
```

- [ ] **Step 4: Run focused integration tests**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS with the helper, chart, and dashboard integration tests green.

- [ ] **Step 5: Run full verification**

Run: `npm test`

Expected: all project tests pass.

Run: `npm run build`

Expected: the production build exits successfully.

Run: `npx eslint src/features/dashboard/booking-status-distribution-chart.tsx src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-overview.test.tsx src/routes/dashboard/index.tsx`

Expected: zero lint errors; existing Fast Refresh warnings are acceptable.

- [ ] **Step 6: Commit the integration without unrelated working-tree changes**

Stage only the scoped hunks from `dashboard-overview.tsx`; do not stage the user's pre-existing styling changes. Use `git add -p src/features/dashboard/dashboard-overview.tsx` and accept only the imports, removed score props, derived distribution, and chart replacement hunks.

```powershell
git add -- src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-data.ts src/features/dashboard/dashboard-overview.test.tsx src/features/dashboard/score-distribution-chart.tsx src/features/dashboard/score-distribution-chart.test.tsx src/routes/dashboard/index.tsx
git add -p src/features/dashboard/dashboard-overview.tsx
git commit -m "feat: use live booking status data"
```
