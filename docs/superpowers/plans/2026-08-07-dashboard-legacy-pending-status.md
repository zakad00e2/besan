# Dashboard Legacy Pending Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard count and render historical `pending` design appointments as confirmed, without modifying persisted data or workshop bookings.

**Architecture:** The dashboard model keeps the persisted `AppointmentStatus` union for compatibility, but exposes a dashboard-only normalized status union and helper. The chart consumes the three normalized count buckets, while the overview normalizes a schedule row immediately before passing its status to the badge.

**Tech Stack:** TypeScript, React 19, Recharts, Vitest, Testing Library.

## Global Constraints

- Preserve stored legacy `pending` values; do not add a migration or alter booking persistence.
- Keep workshop booking status behavior unchanged.
- `Booking status distribution` must show only `Confirmed`, `Completed`, and `Cancelled`.
- Today's and weekly schedule rows must display legacy pending records as confirmed.

---

## File Structure

- Modify `src/features/dashboard/dashboard-model.ts`: define the dashboard display-status union, normalize legacy pending values, and aggregate only active display buckets.
- Modify `src/features/dashboard/dashboard-model.test.ts`: verify normalized status and distribution behavior.
- Modify `src/features/dashboard/booking-status-distribution-chart.tsx`: render three active chart buckets.
- Modify `src/features/dashboard/booking-status-distribution-chart.test.tsx`: verify the active labels and totals.
- Modify `src/features/dashboard/dashboard-overview.tsx`: pass normalized schedule status to the existing badge.
- Modify `src/features/dashboard/dashboard-overview.test.tsx`: verify a legacy pending row is labelled as confirmed in Today's appointments.

### Task 1: Normalize and aggregate legacy dashboard statuses

**Files:**
- Modify: `src/features/dashboard/dashboard-model.ts:6-80`
- Test: `src/features/dashboard/dashboard-model.test.ts:1-110`

**Interfaces:**
- Consumes: persisted `AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled"`.
- Produces: `DashboardAppointmentStatus = "confirmed" | "completed" | "cancelled"`.
- Produces: `normalizeDashboardAppointmentStatus(status: AppointmentStatus): DashboardAppointmentStatus`.
- Produces: `BookingStatusDistribution = Record<DashboardAppointmentStatus, number>`.

- [ ] **Step 1: Write the failing model tests**

  In `dashboard-model.test.ts`, import `normalizeDashboardAppointmentStatus`. Replace the existing distribution expectations with this status list and expected result:

  ```ts
  const statusAppointments: Appointment[] = [
    { ...appointments[0], id: "confirmed", status: "confirmed" },
    { ...appointments[0], id: "legacy-pending", status: "pending" },
    { ...appointments[0], id: "completed", status: "completed" },
    { ...appointments[0], id: "cancelled", status: "cancelled" },
    { ...appointments[0], id: "confirmed-2", status: "confirmed" },
  ];

  expect(getBookingStatusDistribution(statusAppointments)).toEqual({
    confirmed: 3,
    completed: 1,
    cancelled: 1,
  });
  expect(normalizeDashboardAppointmentStatus("pending")).toBe("confirmed");
  ```

  Update the empty expectation to `{ confirmed: 0, completed: 0, cancelled: 0 }`.

- [ ] **Step 2: Run the model test to verify it fails**

  Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

  Expected: FAIL because the distribution still contains `pending` and the normalization helper is not exported.

- [ ] **Step 3: Implement the dashboard-only normalization**

  In `dashboard-model.ts`, add the active display union and helper after `AppointmentStatus`:

  ```ts
  export type DashboardAppointmentStatus = Exclude<AppointmentStatus, "pending">;

  export function normalizeDashboardAppointmentStatus(
    status: AppointmentStatus,
  ): DashboardAppointmentStatus {
    return status === "pending" ? "confirmed" : status;
  }
  ```

  Change the distribution type and zero-value initializer to use only the three active keys, then increment the normalized key:

  ```ts
  export type BookingStatusDistribution = Record<DashboardAppointmentStatus, number>;

  { confirmed: 0, completed: 0, cancelled: 0 }

  distribution[normalizeDashboardAppointmentStatus(appointment.status)] += 1;
  ```

- [ ] **Step 4: Run the model test to verify it passes**

  Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the model change**

  ```bash
  git add src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts
  git commit -m "feat: normalize legacy dashboard booking statuses"
  ```

### Task 2: Render the three active statuses in the overview

**Files:**
- Modify: `src/features/dashboard/booking-status-distribution-chart.tsx:15-64`
- Test: `src/features/dashboard/booking-status-distribution-chart.test.tsx:7-34`
- Modify: `src/features/dashboard/dashboard-overview.tsx:10-20,318-324`
- Test: `src/features/dashboard/dashboard-overview.test.tsx:65-85`

**Interfaces:**
- Consumes: `BookingStatusDistribution` with `confirmed`, `completed`, and `cancelled` numeric keys.
- Consumes: `normalizeDashboardAppointmentStatus(status: AppointmentStatus): DashboardAppointmentStatus`.
- Produces: a three-bar status chart and confirmed badge display for legacy pending schedule rows.

- [ ] **Step 1: Write the failing component tests**

  Update `booking-status-distribution-chart.test.tsx` so both `statusDist` props omit `pending`. In the populated test, use `{ confirmed: 7, completed: 2, cancelled: 1 }`, keep the total assertion at `10`, and replace the pending assertion with:

  ```ts
  expect(screen.queryByText("Pending")).toBeNull();
  ```

  In `dashboard-overview.test.tsx`, add a test that renders a copy of `dashboardFixture.appointments[0]` with `status: "pending"` and the test date. Locate the `Today's appointments` article and assert it contains `Confirmed` and does not contain `Pending confirmation`.

- [ ] **Step 2: Run the component tests to verify they fail**

  Run: `npm test -- src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-overview.test.tsx`

  Expected: FAIL because the chart still defines a pending bar and the schedule passes the persisted pending status directly to `StatusBadge`.

- [ ] **Step 3: Render normalized dashboard statuses**

  Remove the pending object from `statusBuckets` in `booking-status-distribution-chart.tsx`; retain confirmed, completed, and cancelled colors and labels.

  In `dashboard-overview.tsx`, import `normalizeDashboardAppointmentStatus` from `dashboard-model` and replace the schedule badge call with:

  ```tsx
  <StatusBadge status={normalizeDashboardAppointmentStatus(appointment.status)} />
  ```

  Do not modify `StatusBadge` itself: workshop bookings and other dashboard views still use it with their persisted status values.

- [ ] **Step 4: Run the component tests to verify they pass**

  Run: `npm test -- src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-overview.test.tsx`

  Expected: PASS.

- [ ] **Step 5: Run the focused dashboard regression suite**

  Run: `npm test -- src/features/dashboard/dashboard-model.test.ts src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-overview.test.tsx`

  Expected: PASS with all model, chart, and overview assertions green.

- [ ] **Step 6: Commit the dashboard rendering change**

  ```bash
  git add src/features/dashboard/booking-status-distribution-chart.tsx src/features/dashboard/booking-status-distribution-chart.test.tsx src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-overview.test.tsx
  git commit -m "feat: hide pending from dashboard status views"
  ```

### Task 3: Verify the complete application

**Files:**
- Modify: none.

**Interfaces:**
- Consumes: completed model and dashboard rendering changes.
- Produces: validation evidence for the final handoff.

- [ ] **Step 1: Run linting**

  Run: `npm run lint`

  Expected: PASS with no lint errors.

- [ ] **Step 2: Run the full test suite**

  Run: `npm test`

  Expected: PASS with no test failures.

- [ ] **Step 3: Run the production build**

  Run: `npm run build`

  Expected: PASS and Vite emits the production bundle.

## Plan Self-Review

- Spec coverage: Task 1 preserves persisted values and maps legacy pending values; Task 2 removes the pending chart bucket and normalizes Today's appointments; Task 3 validates the complete application. Workshop behavior remains untouched because `StatusBadge` is not changed.
- Placeholder scan: complete; the plan contains no unfinished or deferred implementation steps.
- Type consistency: `DashboardAppointmentStatus`, `normalizeDashboardAppointmentStatus`, and `BookingStatusDistribution` are defined in Task 1 and consumed with those exact names in Task 2.
