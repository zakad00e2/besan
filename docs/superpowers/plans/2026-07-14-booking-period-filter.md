# Booking Period Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators filter design-appointment bookings by all, upcoming, or past calendar dates.

**Architecture:** Extend the existing client-side `BookingFilters` model and its pure `filterAppointments` helper. The component holds the selected period beside its other filters; the helper compares the stored appointment calendar-date prefix with an injected current date, so filtering stays deterministic and testable. The existing visible-bookings pipeline drives both desktop and mobile views.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, Tailwind CSS.

## Global Constraints

- Preserve the existing search, status, explicit-date, ordering, desktop-table, and mobile-card behaviour.
- Keep `all` as the default filter value.
- Treat an appointment dated today as upcoming.
- Compare the local calendar-date portion of `startsAt` (`YYYY-MM-DD`), not a timestamp conversion.
- Do not add URL state, persistence, dependencies, routes, or server changes.

---

### Task 1: Add the deterministic period filtering model

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.tsx:39-76`
- Test: `src/features/dashboard/dashboard-bookings.test.tsx:17-52`

**Interfaces:**
- Consumes: `Appointment.startsAt`, whose first 10 characters are an atelier-local `YYYY-MM-DD` date.
- Produces: `BookingFilters.period: "all" | "upcoming" | "past"` and `filterAppointments(appointments, customers, filters, today?)`.

- [ ] **Step 1: Write failing helper tests with a fixed current date**

Add this test after the existing customer-query/date assertions:

```tsx
it("filters design appointments by past and upcoming calendar dates", () => {
  const filters = { query: "", status: "all" as const, date: "all" as const };

  expect(
    filterAppointments(designAppointments, demoDashboardState.customers, {
      ...filters,
      period: "past",
    }, "2026-07-10").map((appointment) => appointment.id),
  ).toEqual(["appointment-7", "appointment-9"]);

  expect(
    filterAppointments(designAppointments, demoDashboardState.customers, {
      ...filters,
      period: "upcoming",
    }, "2026-07-10").map((appointment) => appointment.id),
  ).toEqual(["appointment-1", "appointment-2", "appointment-4", "appointment-5"]);

  expect(
    filterAppointments(designAppointments, demoDashboardState.customers, {
      ...filters,
      period: "all",
    }, "2026-07-10"),
  ).toHaveLength(6);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: TypeScript or test failure because `period` is not part of `BookingFilters` and `filterAppointments` does not accept a fourth argument.

- [ ] **Step 3: Implement the minimal filter extension**

Replace the filter type and helper signature/body with this logic while retaining the existing query, customer-map, status, and explicit-date conditions:

```tsx
export type BookingFilters = {
  query: string;
  status: AppointmentStatus | "all";
  date: string | "all";
  period: "all" | "upcoming" | "past";
};

function getCurrentLocalDate(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function filterAppointments<T extends Appointment>(
  appointments: T[],
  customers: Customer[],
  filters: BookingFilters,
  today = getCurrentLocalDate(),
) {
  // Keep the existing query and customer-map setup.
  return appointments.filter((appointment) => {
    const appointmentDate = appointment.startsAt.slice(0, 10);
    const matchesPeriod =
      filters.period === "all" ||
      (filters.period === "upcoming" && appointmentDate >= today) ||
      (filters.period === "past" && appointmentDate < today);

    // Return the existing conditions plus `matchesPeriod`.
  });
}
```

Initialize `period: "all"` in `DashboardBookings` state.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS, including the new period helper test.

- [ ] **Step 5: Commit the tested model change**

```bash
git add src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "feat: filter bookings by period"
```

### Task 2: Expose the period selector in the bookings filter bar

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.tsx:326-383`
- Test: `src/features/dashboard/dashboard-bookings.test.tsx:55-89`

**Interfaces:**
- Consumes: `filters.period` added by Task 1 and `setFilters` state setter.
- Produces: an accessible `Period` select that updates `filters.period`; `visibleAppointments` already consumes the helper result.

- [ ] **Step 1: Write the failing rendered-component test**

Add this test after the search/form test:

```tsx
it("filters rendered bookings by period", () => {
  render(
    <DashboardBookings
      customers={demoDashboardState.customers}
      appointments={demoDashboardState.appointments}
      dispatch={vi.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText("Period"), { target: { value: "past" } });

  expect(screen.getAllByText("Fabric consultation").length).toBeGreaterThan(0);
  expect(screen.queryByText("Initial consultation")).toBeNull();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: FAIL because there is no accessible control labelled `Period`.

- [ ] **Step 3: Add the `Period` select next to the existing `Status` and `Date` filters**

Insert this label after the `Status` label and before the `Date` label, preserving the existing shared select classes:

```tsx
<label className="text-xs font-normal text-slate-600">
  Period
  <select
    aria-label="Period"
    value={filters.period}
    onChange={(event) =>
      setFilters({ ...filters, period: event.target.value as BookingFilters["period"] })
    }
    className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
  >
    <option value="all">All</option>
    <option value="upcoming">Upcoming</option>
    <option value="past">Past</option>
  </select>
</label>
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS, with the component rendering only period-matching rows and cards.

- [ ] **Step 5: Run regression checks and commit the interface change**

Run:

```bash
npm test -- src/features/dashboard/dashboard-bookings.test.tsx
npm run lint
npm run build
```

Expected: all commands exit with code 0.

```bash
git add src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "feat: add booking period filter"
```

