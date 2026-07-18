# Next Appointment and Customer Profile Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show exactly four approved stages in the administrator-only `Next appointment` flow and show the relevant exact stage in the customer profile without changing public or general administrator booking choices.

**Architecture:** Keep public appointment types, new next-appointment stages, and removed legacy values as separate domain collections. The schedule-next workflow validates only the four new stages, while general booking parsing and database constraints retain legacy compatibility. A focused profile-stage selector derives the exact display label from relevant appointments and falls back to the persisted broad lifecycle label.

**Tech Stack:** TypeScript 5.8, React 19, Vitest 4, Testing Library, Zod 3, PostgreSQL migrations.

## Global Constraints

- The `Next appointment` order is exactly `Initial Consultation`, `First Fitting`, `Second Fitting`, `Final Fitting & Pickup`.
- Public booking appointment choices remain exactly `Custom Design`, `Consultation`, and `Dresses for Rent`.
- General administrator booking forms remain unchanged.
- Existing appointment-purpose strings and customer lifecycle stages remain readable.
- Customer-list stage labels are out of scope.
- Do not rewrite or remove existing appointment history.
- Use test-first red-green-refactor cycles for every behavior change.
- Preserve all unrelated changes already present in the dirty worktree.

---

## File Structure

- Modify `src/features/book-call/booking-domain.ts`: own public types, next-appointment stages, legacy compatibility values, validation, and lifecycle mapping.
- Modify `src/features/book-call/booking-domain.test.ts`: prove list boundaries, schedule-next validation, legacy compatibility, and lifecycle mapping.
- Modify `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx`: prove the exact selector options and submitted value.
- Create `db/migrations/007_update_next_appointment_stages.sql`: add the four approved strings while retaining every historical allowed value.
- Create `src/features/book-call/appointment-types-migration.test.ts`: protect the additive migration contract.
- Modify `src/features/book-call/booking-repository.server.test.ts`: prove a new stage reaches the parameterized persistence query with the expected broad lifecycle stage.
- Modify `src/features/auth/admin.functions.test.ts`: update schedule-next fixtures to valid new stages while retaining existing server-function behavior coverage.
- Create `src/features/dashboard/dashboard-customer-stage.ts`: select the exact profile label from appointments with a persisted-stage fallback.
- Modify `src/features/dashboard/dashboard-customer-profile.tsx`: render the derived profile stage.
- Modify `src/features/dashboard/dashboard-customer-profile.test.tsx`: prove upcoming, historical, fitting distinction, cancellation, and fallback behavior.

---

### Task 1: Define the Four Next-Appointment Stages

**Files:**
- Modify: `src/features/book-call/booking-domain.test.ts:160-215`
- Modify: `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx:39-154`
- Modify: `src/features/book-call/booking-domain.ts:3-42`

**Interfaces:**
- Consumes: existing `appointmentTypes`, `parseAdminBookingInput`, `parseScheduleNextAppointmentInput`, and `getStageForNextAppointment`.
- Produces: `nextAppointmentTypes` as the exact four-value tuple and `NextAppointmentType` as its union; keeps `AppointmentType` compatible with removed historical values.

- [ ] **Step 1: Write failing domain tests for exact boundaries and validation**

Replace the old `Measurements`-specific schedule-next tests and mapping table with:

```ts
const validNextAppointment = {
  currentAppointmentId: "11111111-1111-4111-8111-111111111111",
  appointmentType: "Initial Consultation" as const,
  appointmentDate: "2026-07-20",
  appointmentTime: "13:30",
  notes: "  Bring the selected shoes  ",
  reminderStatus: "scheduled" as const,
};

it("keeps public choices unchanged and exposes exactly four next-appointment stages", () => {
  expect(appointmentTypes).toEqual(["Custom Design", "Consultation", "Dresses for Rent"]);
  expect(nextAppointmentTypes).toEqual([
    "Initial Consultation",
    "First Fitting",
    "Second Fitting",
    "Final Fitting & Pickup",
  ]);
});

it.each(nextAppointmentTypes)("accepts the %s next-appointment stage", (appointmentType) => {
  expect(
    parseScheduleNextAppointmentInput({
      ...validNextAppointment,
      appointmentType,
    }),
  ).toMatchObject({ success: true, data: { appointmentType } });
});

it.each(["New Design", "Measurements", "Alteration", "Pickup"])(
  "rejects removed %s values in the schedule-next workflow",
  (appointmentType) => {
    expect(
      parseScheduleNextAppointmentInput({
        ...validNextAppointment,
        appointmentType,
      }),
    ).toMatchObject({
      success: false,
      fieldErrors: { appointmentType: expect.any(String) },
    });
  },
);

it("keeps a removed value valid for general administrator compatibility", () => {
  expect(
    parseAdminBookingInput({
      customerId: "22222222-2222-4222-8222-222222222222",
      appointmentType: "Measurements",
      appointmentDate: "2026-07-20",
      appointmentTime: "13:30",
      notes: "",
      status: "confirmed",
      reminderStatus: "scheduled",
    }),
  ).toMatchObject({ success: true, data: { appointmentType: "Measurements" } });
});

it.each([
  ["Initial Consultation", "initial-appointment"],
  ["First Fitting", "fitting"],
  ["Second Fitting", "fitting"],
  ["Final Fitting & Pickup", "ready-delivery"],
] as const)("maps %s to %s", (appointmentType, stage) => {
  expect(getStageForNextAppointment(appointmentType)).toBe(stage);
});
```

Also import `appointmentTypes` at the top of the test file.

- [ ] **Step 2: Write the failing dialog contract test**

Add this test before changing the domain tuple:

```tsx
it("shows only the four approved next-appointment stages in order", () => {
  render(
    <DashboardNextAppointmentDialog
      open
      currentAppointment={dashboardFixture.appointments[0]}
      customer={dashboardFixture.customers[0]}
      appointments={dashboardFixture.appointments}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );

  const purpose = screen.getByLabelText("Appointment purpose");
  expect(within(purpose).getAllByRole("option").map((option) => option.textContent)).toEqual([
    "Select an appointment purpose",
    "Initial Consultation",
    "First Fitting",
    "Second Fitting",
    "Final Fitting & Pickup",
  ]);
});
```

Update the dialog submission test to select `Second Fitting` and expect:

```ts
expect(onSubmit).toHaveBeenCalledWith(
  expect.objectContaining({
    currentAppointmentId: "appointment-1",
    appointmentType: "Second Fitting",
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    reminderStatus: "scheduled",
  }),
);
```

Use `Final Fitting & Pickup` instead of `Pickup` in the conflict and rejected-submission tests.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npx vitest run src/features/book-call/booking-domain.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx
```

Expected: FAIL because `nextAppointmentTypes` still exposes the removed six-value workflow and rejects `Initial Consultation` and `Final Fitting & Pickup`.

- [ ] **Step 4: Implement separate current and legacy collections**

Replace the appointment-type definitions and mapping in `booking-domain.ts` with:

```ts
export const appointmentTypes = ["Custom Design", "Consultation", "Dresses for Rent"] as const;

export const nextAppointmentTypes = [
  "Initial Consultation",
  "First Fitting",
  "Second Fitting",
  "Final Fitting & Pickup",
] as const;

const legacyNextAppointmentTypes = [
  "New Design",
  "Measurements",
  "Alteration",
  "Pickup",
] as const;

export type PublicAppointmentType = (typeof appointmentTypes)[number];
export type NextAppointmentType = (typeof nextAppointmentTypes)[number];
type LegacyNextAppointmentType = (typeof legacyNextAppointmentTypes)[number];
export type AppointmentType =
  | PublicAppointmentType
  | NextAppointmentType
  | LegacyNextAppointmentType;

const adminAppointmentTypes = [
  ...appointmentTypes,
  ...nextAppointmentTypes,
  ...legacyNextAppointmentTypes,
] as const;
```

Keep `customerStages` unchanged and replace `nextAppointmentStage` with:

```ts
const nextAppointmentStage: Record<NextAppointmentType, CustomerStage> = {
  "Initial Consultation": "initial-appointment",
  "First Fitting": "fitting",
  "Second Fitting": "fitting",
  "Final Fitting & Pickup": "ready-delivery",
};
```

Do not change `appointmentTypes`, `adminBookingSchema`, or public parsing behavior beyond consuming the newly separated arrays.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npx vitest run src/features/book-call/booking-domain.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx
```

Expected: PASS with all tests in both files green.

- [ ] **Step 6: Commit the domain and dialog contract**

```bash
git add src/features/book-call/booking-domain.ts src/features/book-call/booking-domain.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx
git commit -m "feat: define next appointment stages"
```

---

### Task 2: Add Additive Database and Repository Compatibility

**Files:**
- Create: `src/features/book-call/appointment-types-migration.test.ts`
- Create: `db/migrations/007_update_next_appointment_stages.sql`
- Modify: `src/features/book-call/booking-repository.server.test.ts:190-260`
- Modify: `src/features/auth/admin.functions.test.ts:300-325`

**Interfaces:**
- Consumes: `NextAppointmentType` and `getStageForNextAppointment` from Task 1.
- Produces: a database constraint that accepts public, historical, and new strings; repository evidence that `Final Fitting & Pickup` persists with lifecycle stage `ready-delivery`.

- [ ] **Step 1: Write the failing migration contract**

Create `appointment-types-migration.test.ts`:

```ts
// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/007_update_next_appointment_stages.sql", import.meta.url),
);

describe("next appointment stage migration", () => {
  const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

  it("allows public, historical, and approved next-appointment values", () => {
    for (const value of [
      "Custom Design",
      "Consultation",
      "Dresses for Rent",
      "New Design",
      "Measurements",
      "First Fitting",
      "Second Fitting",
      "Alteration",
      "Pickup",
      "Initial Consultation",
      "Final Fitting & Pickup",
    ]) {
      expect(sql).toContain(`'${value}'`);
    }
  });

  it("replaces only the appointment type constraint", () => {
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS appointments_appointment_type_check");
    expect(sql).toContain("ADD CONSTRAINT appointments_appointment_type_check CHECK");
    expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|TRUNCATE)\b/i);
  });
});
```

- [ ] **Step 2: Run the migration test and verify RED**

Run:

```bash
npx vitest run src/features/book-call/appointment-types-migration.test.ts
```

Expected: FAIL because migration `007_update_next_appointment_stages.sql` does not exist and the loaded SQL string is empty.

- [ ] **Step 3: Add the forward-only migration**

Create `db/migrations/007_update_next_appointment_stages.sql`:

```sql
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_appointment_type_check CHECK (
    appointment_type IN (
      'Custom Design',
      'Consultation',
      'Dresses for Rent',
      'New Design',
      'Measurements',
      'First Fitting',
      'Second Fitting',
      'Alteration',
      'Pickup',
      'Initial Consultation',
      'Final Fitting & Pickup'
    )
  );
```

- [ ] **Step 4: Update repository and server-function fixtures**

In `booking-repository.server.test.ts`, make `nextInput.appointmentType`:

```ts
appointmentType: "Final Fitting & Pickup" as const,
```

Change the mocked next row and assertions to:

```ts
customer_stage: "ready-delivery",
next_appointment_type: "Final Fitting & Pickup",
```

```ts
nextBooking: {
  id: "33333333-3333-4333-8333-333333333333",
  customerId: "22222222-2222-4222-8222-222222222222",
  appointmentType: "Final Fitting & Pickup",
  customerStage: "ready-delivery",
  status: "confirmed",
},
```

The final query parameters must be:

```ts
[
  nextInput.currentAppointmentId,
  "Final Fitting & Pickup",
  "2026-07-20",
  "13:30",
  "Bring the selected shoes",
  "scheduled",
  "ready-delivery",
]
```

In schedule-next cases in `admin.functions.test.ts`, replace `Measurements` with `First Fitting` and update matching expectations. Do not change public-booking or general-admin fixtures.

- [ ] **Step 5: Run the migration, repository, and server-function tests**

Run:

```bash
npx vitest run src/features/book-call/appointment-types-migration.test.ts src/features/book-call/booking-repository.server.test.ts src/features/auth/admin.functions.test.ts
```

Expected: PASS with the migration contract, query parameters, and server boundary green.

- [ ] **Step 6: Commit database compatibility**

```bash
git add db/migrations/007_update_next_appointment_stages.sql src/features/book-call/appointment-types-migration.test.ts src/features/book-call/booking-repository.server.test.ts src/features/auth/admin.functions.test.ts
git commit -m "feat: persist next appointment stages"
```

---

### Task 3: Derive the Exact Customer Profile Stage

**Files:**
- Modify: `src/features/dashboard/dashboard-customer-profile.test.tsx:8-75`
- Create: `src/features/dashboard/dashboard-customer-stage.ts`
- Modify: `src/features/dashboard/dashboard-customer-profile.tsx:1-65`

**Interfaces:**
- Consumes: `nextAppointmentTypes`, `Customer`, `Appointment`, and existing `stageLabels`.
- Produces: `getCustomerProfileStageLabel(input: { customer: Customer; appointments: Appointment[]; now?: Date }): string`.

- [ ] **Step 1: Write failing profile display tests**

Replace the first profile test with an approved upcoming stage:

```tsx
it("shows the nearest approved upcoming appointment as the customer stage", () => {
  const customer = { ...dashboardFixture.customers[0], stage: "fitting" as const };
  const first = {
    ...dashboardFixture.appointments[0],
    id: "first-fitting",
    customerId: customer.id,
    purpose: "First Fitting",
    status: "confirmed" as const,
    startsAt: "2026-07-20T13:30:00.000Z",
    endsAt: "2026-07-20T14:30:00.000Z",
  };
  const second = {
    ...first,
    id: "second-fitting",
    purpose: "Second Fitting",
    startsAt: "2026-07-25T13:30:00.000Z",
    endsAt: "2026-07-25T14:30:00.000Z",
  };

  render(
    <DashboardCustomerProfile
      customer={customer}
      appointments={[second, first]}
      now={new Date("2026-07-18T08:00:00.000Z")}
    />,
  );

  expect(screen.getByLabelText("Customer stage").textContent).toBe("First Fitting");
});
```

Add historical and fallback tests:

```tsx
it("shows the most recent approved non-cancelled stage when none is active", () => {
  const customer = { ...dashboardFixture.customers[0], stage: "fitting" as const };
  const first = {
    ...dashboardFixture.appointments[0],
    id: "past-first",
    customerId: customer.id,
    purpose: "First Fitting",
    status: "completed" as const,
    startsAt: "2026-07-10T10:00:00.000Z",
    endsAt: "2026-07-10T11:00:00.000Z",
  };
  const second = {
    ...first,
    id: "past-second",
    purpose: "Second Fitting",
    startsAt: "2026-07-12T10:00:00.000Z",
    endsAt: "2026-07-12T11:00:00.000Z",
  };
  const cancelled = {
    ...second,
    id: "cancelled-final",
    purpose: "Final Fitting & Pickup",
    status: "cancelled" as const,
    startsAt: "2026-07-14T10:00:00.000Z",
    endsAt: "2026-07-14T11:00:00.000Z",
  };

  render(
    <DashboardCustomerProfile
      customer={customer}
      appointments={[first, second, cancelled]}
      now={new Date("2026-07-18T08:00:00.000Z")}
    />,
  );

  expect(screen.getByLabelText("Customer stage").textContent).toBe("Second Fitting");
});

it("falls back to the persisted lifecycle label for legacy appointment history", () => {
  const customer = {
    ...dashboardFixture.customers[0],
    stage: "measurements-appointment" as const,
  };
  const legacy = {
    ...dashboardFixture.appointments[0],
    customerId: customer.id,
    purpose: "Measurements",
  };

  render(<DashboardCustomerProfile customer={customer} appointments={[legacy]} />);

  expect(screen.getByLabelText("Customer stage").textContent).toBe(
    "Measurements appointment",
  );
});
```

Keep the existing notes and no-activity tests unchanged.

- [ ] **Step 2: Run the profile test and verify RED**

Run:

```bash
npx vitest run src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: FAIL because the component still renders only `stageLabels[customer.stage]`.

- [ ] **Step 3: Implement the focused stage selector**

Create `dashboard-customer-stage.ts`:

```ts
import { nextAppointmentTypes } from "@/features/book-call/booking-domain";
import { stageLabels, type Appointment, type Customer } from "./dashboard-model";

const approvedStages = new Set<string>(nextAppointmentTypes);

export function getCustomerProfileStageLabel({
  customer,
  appointments,
  now = new Date(),
}: {
  customer: Customer;
  appointments: Appointment[];
  now?: Date;
}) {
  const relevant = appointments.filter(
    (appointment) =>
      appointment.customerId === customer.id &&
      appointment.status !== "cancelled" &&
      approvedStages.has(appointment.purpose),
  );

  const upcoming = relevant
    .filter(
      (appointment) =>
        appointment.status !== "completed" && new Date(appointment.startsAt) >= now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  if (upcoming) return upcoming.purpose;

  const latest = relevant.sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
  return latest?.purpose ?? stageLabels[customer.stage];
}
```

In `dashboard-customer-profile.tsx`, import the helper:

```ts
import { getCustomerProfileStageLabel } from "./dashboard-customer-stage";
```

Calculate the display label after the memoized appointment groups:

```ts
const customerStageLabel = getCustomerProfileStageLabel({
  customer,
  appointments,
  now,
});
```

Render it in the existing stage element:

```tsx
<p
  aria-label="Customer stage"
  className="mt-0.5 text-xs font-normal leading-tight text-violet-700"
>
  {customerStageLabel}
</p>
```

- [ ] **Step 4: Run the profile test and verify GREEN**

Run:

```bash
npx vitest run src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: PASS with exact upcoming, historical, cancellation, notes, and fallback behavior green.

- [ ] **Step 5: Commit profile-stage derivation**

```bash
git add src/features/dashboard/dashboard-customer-stage.ts src/features/dashboard/dashboard-customer-profile.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
git commit -m "feat: show exact customer profile stage"
```

---

### Task 4: Verify Integration and Scope Boundaries

**Files:**
- Modify only if a verification failure is directly caused by Tasks 1-3.

**Interfaces:**
- Consumes: all outputs from Tasks 1-3.
- Produces: fresh evidence that the feature is type-safe, tested, buildable, and does not change out-of-scope selectors.

- [ ] **Step 1: Search for invalid schedule-next fixtures**

Run:

```bash
rg -n '"(New Design|Measurements|Alteration|Pickup)"' src/features/book-call src/features/auth src/features/dashboard
```

Expected: historical/general-booking fixtures may remain, but no `ScheduleNextAppointmentInput`, `parseScheduleNextAppointmentInput`, or `DashboardNextAppointmentDialog` selection uses `New Design`, `Measurements`, `Alteration`, or `Pickup`.

- [ ] **Step 2: Run all feature-focused tests**

Run:

```bash
npx vitest run src/features/book-call/booking-domain.test.ts src/features/book-call/appointment-types-migration.test.ts src/features/book-call/booking-repository.server.test.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: PASS with zero failed tests.

- [ ] **Step 3: Run the complete test suite**

Run:

```bash
npm test
```

Expected: exit code 0 and zero failed tests.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0 with no errors.

- [ ] **Step 5: Run the production build**

Run:

```bash
npm run build
```

Expected: exit code 0 with Vite production output generated successfully.

- [ ] **Step 6: Review the final diff for scope**

Run:

```bash
git diff --check
git status --short
git diff -- src/features/book-call/booking-domain.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx db/migrations/007_update_next_appointment_stages.sql src/features/dashboard/dashboard-customer-stage.ts src/features/dashboard/dashboard-customer-profile.tsx
```

Expected: no whitespace errors; only the intended stage workflow, migration, profile derivation, and their tests differ from the task baseline. Pre-existing unrelated dirty files remain untouched.
