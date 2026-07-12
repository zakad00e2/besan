# Booking Status Distribution Chart Design

## Purpose

Replace the dashboard's rating-distribution data with booking-status data that is already part of the dashboard domain. The chart will communicate the current mix of confirmed, pending, completed, and cancelled appointments.

## Component API

Rename and adapt the existing chart as `BookingStatusDistributionChart` in `src/features/dashboard/booking-status-distribution-chart.tsx`.

```ts
type BookingStatusDistribution = {
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
};

type BookingStatusDistributionChartProps = {
  statusDist: BookingStatusDistribution;
};
```

The component remains presentational. It receives counts rather than full appointment records, so it does not depend on dashboard storage or appointment filtering rules.

## Data Flow

Add a pure helper that derives `BookingStatusDistribution` from `Appointment[]`. `DashboardOverview` computes the distribution from its existing `appointments` prop and passes the result to the chart. Remove `scoreDist` and `avgScore` from `DashboardState`, the dashboard route, demo state, and overview props because those values are no longer needed.

No fixed chart counts will remain in demo data. Adding, updating, or removing an appointment will automatically change the rendered distribution.

## Presentation

Keep the existing responsive Recharts bar-chart treatment, gradients, axes, grids, tooltip, cursor, rounded bars, and disabled animation. Update the content to match the English dashboard:

1. `Confirmed` uses the blue gradient.
2. `Pending` uses the green gradient.
3. `Completed` uses the orange gradient.
4. `Cancelled` uses the pink gradient.

Use `Booking status distribution` as the 14px muted title. Replace the average score with the total booking count, rendered at 30px with tabular numerals. The tooltip identifies the selected status and its booking count.

## Empty State

When every count is zero, render a total of `0` and four zero-value categories. The chart remains structurally stable and does not divide by a total.

## Testing

Add tests that verify:

- the pure helper counts all four appointment statuses correctly;
- the chart renders the four status labels and the total count;
- the chart renders an all-zero distribution without errors;
- the dashboard overview derives chart data from its `appointments` prop rather than separate fixed state.

## Scope Boundaries

Do not add a generic configurable chart abstraction. Do not pass complete appointment records into the chart component. Do not change unrelated dashboard layout, customer data, booking workflows, or existing user-owned working-tree changes.
