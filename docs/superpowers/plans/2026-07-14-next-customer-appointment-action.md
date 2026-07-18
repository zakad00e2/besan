# Next Customer Appointment Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a row-level plus action that atomically completes the current booking, schedules the administrator-selected next appointment for the same customer, and updates the customer's persisted stage in both bookings and customer-profile views.

**Architecture:** Extend the booking domain with next-appointment validation and stage mapping, then execute the three database mutations as one atomic PostgreSQL statement. Return normalized persisted customer and appointment identifiers to a focused next-appointment dialog and to database-backed customer routes so every affected screen renders the same Neon data.

**Tech Stack:** TypeScript 5.8, React 19, TanStack Start/Router, Neon Serverless Postgres, Zod 3, Vitest 4, Testing Library, Tailwind CSS 4.

## Global Constraints

- Keep the public booking appointment choices unchanged; `Measurements` is available to the administrator's next-appointment workflow only.
- The new appointment status is always `confirmed`; the administrator selects only its reminder status.
- The database decides the customer stage from the selected appointment type. Never accept a stage value from the client.
- `New Design` maps to `initial-appointment`; `Measurements` maps to `measurements-appointment`; both fitting types and `Alteration` map to `fitting`; `Pickup` maps to `ready-delivery`.
- A successful request creates the next appointment, completes the current appointment, and updates the customer in one atomic database statement.
- Cancelled appointments cannot use the next-appointment action. Completed appointments can.
- Do not send WhatsApp messages automatically.
- Do not persist customer notes, activity history, or stage-history records in this feature.
- Preserve all unrelated working-tree changes and do not rewrite published Git history.

## File Structure

- `db/migrations/003_add_customer_stage_and_measurements.sql`: database constraints and persisted customer stage.
- `src/features/book-call/booking-domain.ts`: appointment-type unions, next-appointment parser, customer-stage mapping, and persisted booking DTOs.
- `src/features/book-call/booking-domain.test.ts`: domain parsing and mapping tests.
- `src/features/book-call/booking-repository.server.ts`: atomic SQL operation and database row mapping.
- `src/features/book-call/booking-repository.server.test.ts`: list identifiers, atomic result, cancelled/not-found, and slot-conflict tests.
- `src/features/auth/admin.functions.ts`: authenticated next-appointment server function.
- `src/features/auth/admin.functions.test.ts`: authorization, validation, and repository-outcome tests.
- `src/features/dashboard/dashboard-booking-data.ts`: normalization and immutable merge helpers shared by dashboard routes.
- `src/features/dashboard/dashboard-booking-data.test.ts`: unique-customer and schedule-result merge tests.
- `src/features/dashboard/dashboard-model.ts`: consume the canonical customer-stage type and display the scheduled-measurements label.
- `src/features/dashboard/dashboard-model.test.ts`: display-label regression test.
- `src/features/dashboard/dashboard-next-appointment-dialog.tsx`: focused asynchronous next-appointment form.
- `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx`: form, pending, success, and error tests.
- `src/features/dashboard/dashboard-bookings.tsx`: desktop/mobile plus actions and dialog wiring.
- `src/features/dashboard/dashboard-bookings.test.tsx`: eligible/cancelled action and preselected-customer integration tests.
- `src/features/dashboard/use-persisted-booking-data.ts`: shared authenticated loader for persisted customers and appointments.
- `src/routes/dashboard/bookings.tsx`: mutation call and immediate normalized-state merge.
- `src/routes/dashboard/customers/index.tsx`: database-backed customer directory.
- `src/routes/dashboard/customers/$id.tsx`: database-backed customer profile route.
- `src/features/dashboard/dashboard-customer-profile.tsx`: read-only stage and status-aware appointment history.
- `src/features/dashboard/dashboard-customer-profile.test.tsx`: read-only stage and next-appointment visibility tests.

---

### Task 1: Persisted Workflow Domain and Migration

**Files:**
- Create: `db/migrations/003_add_customer_stage_and_measurements.sql`
- Modify: `src/features/book-call/booking-domain.ts`
- Modify: `src/features/book-call/booking-domain.test.ts`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-model.test.ts`

**Interfaces:**
- Consumes: existing `appointmentTypes`, `reminderStatuses`, and dashboard `Customer.stage`.
- Produces: `nextAppointmentTypes`, `AppointmentType`, `CustomerStage`, `ScheduleNextAppointmentInput`, `ValidatedScheduleNextAppointment`, `parseScheduleNextAppointmentInput(input)`, and `getStageForNextAppointment(type)`.

- [ ] **Step 1: Write failing domain tests for the administrator-only type, validation, and mapping**

Append these imports and tests to `src/features/book-call/booking-domain.test.ts`:

```ts
import {
  formatBookingDate,
  getStageForNextAppointment,
  nextAppointmentTypes,
  parseBookingInput,
  parseScheduleNextAppointmentInput,
} from "./booking-domain";

describe("next appointment workflow", () => {
  const input = {
    currentAppointmentId: "11111111-1111-4111-8111-111111111111",
    appointmentType: "Measurements",
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    notes: "  Bring the selected shoes  ",
    reminderStatus: "scheduled",
  };

  it("adds Measurements only to the administrator workflow", () => {
    expect(nextAppointmentTypes).toContain("Measurements");
    expect(parseBookingInput({ ...validBooking, appointmentType: "Measurements" })).toMatchObject({
      success: false,
      fieldErrors: { appointmentType: expect.any(String) },
    });
  });

  it("normalizes a valid next appointment", () => {
    expect(parseScheduleNextAppointmentInput(input)).toEqual({
      success: true,
      data: { ...input, notes: "Bring the selected shoes" },
    });
  });

  it("rejects invalid identifiers, dates, times, notes, and reminder values", () => {
    expect(
      parseScheduleNextAppointmentInput({
        ...input,
        currentAppointmentId: "appointment-1",
        appointmentDate: "20-07-2026",
        appointmentTime: "1pm",
        notes: "x".repeat(1001),
        reminderStatus: "emailed",
      }),
    ).toMatchObject({
      success: false,
      fieldErrors: {
        currentAppointmentId: expect.any(String),
        appointmentDate: expect.any(String),
        appointmentTime: expect.any(String),
        notes: expect.any(String),
        reminderStatus: expect.any(String),
      },
    });
  });

  it.each([
    ["New Design", "initial-appointment"],
    ["Measurements", "measurements-appointment"],
    ["First Fitting", "fitting"],
    ["Second Fitting", "fitting"],
    ["Alteration", "fitting"],
    ["Pickup", "ready-delivery"],
  ] as const)("maps %s to %s", (appointmentType, stage) => {
    expect(getStageForNextAppointment(appointmentType)).toBe(stage);
  });
});
```

Replace the existing combined import at the top rather than retaining a duplicate `formatBookingDate`/`parseBookingInput` import.

- [ ] **Step 2: Run the domain test and verify the new API is missing**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts
```

Expected: FAIL because `nextAppointmentTypes`, `parseScheduleNextAppointmentInput`, and `getStageForNextAppointment` are not exported.

- [ ] **Step 3: Implement the workflow types, parser, mapping, and persisted DTO fields**

In `src/features/book-call/booking-domain.ts`, keep the existing public `appointmentTypes` unchanged and add:

```ts
export const nextAppointmentTypes = [
  "New Design",
  "Measurements",
  "First Fitting",
  "Second Fitting",
  "Alteration",
  "Pickup",
] as const;

export type AppointmentType = (typeof nextAppointmentTypes)[number];

export const customerStages = [
  "new-inquiry",
  "initial-appointment",
  "measurements-appointment",
  "measurements-taken",
  "design-production",
  "fitting",
  "ready-delivery",
  "completed",
] as const;

export type CustomerStage = (typeof customerStages)[number];

const nextAppointmentStage: Record<AppointmentType, CustomerStage> = {
  "New Design": "initial-appointment",
  Measurements: "measurements-appointment",
  "First Fitting": "fitting",
  "Second Fitting": "fitting",
  Alteration: "fitting",
  Pickup: "ready-delivery",
};

export function getStageForNextAppointment(appointmentType: AppointmentType): CustomerStage {
  return nextAppointmentStage[appointmentType];
}

export type ScheduleNextAppointmentInput = {
  currentAppointmentId: string;
  appointmentType: AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  reminderStatus: BookingReminderStatus;
};

export type ValidatedScheduleNextAppointment = ScheduleNextAppointmentInput;

export type ScheduleNextAppointmentParseResult =
  | { success: true; data: ValidatedScheduleNextAppointment }
  | {
      success: false;
      fieldErrors: Partial<Record<keyof ScheduleNextAppointmentInput, string>>;
    };

const scheduleNextAppointmentSchema = z.object({
  currentAppointmentId: z.string().uuid("Choose a valid current appointment."),
  appointmentType: z.enum(nextAppointmentTypes, { message: "Choose an appointment type." }),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid time."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  reminderStatus: z.enum(reminderStatuses, { message: "Choose a reminder status." }),
});

export function parseScheduleNextAppointmentInput(
  input: unknown,
): ScheduleNextAppointmentParseResult {
  const parsed = scheduleNextAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
      ),
    };
  }
  return { success: true, data: { ...parsed.data, notes: parsed.data.notes.trim() } };
}
```

Change `BookingListItem` so database-backed rows can represent repeated appointments for one customer:

```ts
export type BookingListItem = Omit<ValidatedBooking, "appointmentType"> & {
  id: string;
  customerId: string;
  customerStage: CustomerStage;
  customerUpdatedAt: string;
  appointmentType: AppointmentType;
  status: BookingStatus;
  reminderStatus: BookingReminderStatus;
  createdAt: string;
};
```

In `src/features/dashboard/dashboard-model.ts`, remove its local `customerStages` and `CustomerStage` declarations, then import and re-export the canonical values:

```ts
import {
  customerStages,
  type CustomerStage,
} from "@/features/book-call/booking-domain";

export { customerStages };
export type { CustomerStage };
```

Add the new label to `stageLabels`:

```ts
"measurements-appointment": "Measurements appointment",
```

Add this expectation to the dashboard display-content test in `dashboard-model.test.ts`:

```ts
expect(stageLabels["measurements-appointment"]).toBe("Measurements appointment");
```

- [ ] **Step 4: Add the migration**

Create `db/migrations/003_add_customer_stage_and_measurements.sql`:

```sql
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_appointment_type_check CHECK (
    appointment_type IN (
      'New Design',
      'Measurements',
      'First Fitting',
      'Second Fitting',
      'Alteration',
      'Pickup'
    )
  );

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new-inquiry';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_stage_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_stage_check CHECK (
    stage IN (
      'new-inquiry',
      'initial-appointment',
      'measurements-appointment',
      'measurements-taken',
      'design-production',
      'fitting',
      'ready-delivery',
      'completed'
    )
  );
```

- [ ] **Step 5: Run focused tests and commit**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts src/features/dashboard/dashboard-model.test.ts
```

Expected: both test files PASS.

Commit only the task files:

```powershell
git add -- db/migrations/003_add_customer_stage_and_measurements.sql src/features/book-call/booking-domain.ts src/features/book-call/booking-domain.test.ts src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts
git commit -m "feat: define next appointment workflow"
```

---

### Task 2: Atomic Next-Appointment Repository Operation

**Files:**
- Modify: `src/features/book-call/booking-repository.server.ts`
- Modify: `src/features/book-call/booking-repository.server.test.ts`

**Interfaces:**
- Consumes: `ValidatedScheduleNextAppointment`, `getStageForNextAppointment`, and enriched `BookingListItem` from Task 1.
- Produces: `BookingRepository.scheduleNextAppointment(input)` returning success with `currentBooking` and `nextBooking`, or `not-found`, `cancelled`, or `slot-unavailable`.

- [ ] **Step 1: Update the repository fixture and write failing list/atomic-operation tests**

Add these fields to every `BookingListItem` fixture and mocked database row in `booking-repository.server.test.ts`:

```ts
customer_id: "22222222-2222-4222-8222-222222222222",
customer_stage: "new-inquiry",
customer_updated_at: "2026-07-01T09:00:00.000Z",
```

For expected mapped objects, use camel case:

```ts
customerId: "22222222-2222-4222-8222-222222222222",
customerStage: "new-inquiry",
customerUpdatedAt: "2026-07-01T09:00:00.000Z",
```

Then append:

```ts
const nextInput = {
  currentAppointmentId: "11111111-1111-4111-8111-111111111111",
  appointmentType: "Measurements" as const,
  appointmentDate: "2026-07-20",
  appointmentTime: "13:30",
  notes: "Bring the selected shoes",
  reminderStatus: "scheduled" as const,
};

it("completes the current appointment, inserts the next one, and updates the customer atomically", async () => {
  const execute = vi.fn<QueryExecutor>().mockResolvedValue([
    {
      outcome: "success",
      customer_id: "22222222-2222-4222-8222-222222222222",
      full_name: "Noor Al-Hashemi",
      mobile: "+970591234567",
      customer_stage: "measurements-appointment",
      customer_updated_at: "2026-07-14T10:00:00.000Z",
      current_id: nextInput.currentAppointmentId,
      current_appointment_type: "New Design",
      current_appointment_date: "2026-07-14",
      current_appointment_time: "10:00",
      current_notes: "Initial sketches",
      current_status: "completed",
      current_reminder_status: "sent",
      current_created_at: "2026-07-01T10:00:00.000Z",
      next_id: "33333333-3333-4333-8333-333333333333",
      next_appointment_type: "Measurements",
      next_appointment_date: "2026-07-20",
      next_appointment_time: "13:30",
      next_notes: "Bring the selected shoes",
      next_status: "confirmed",
      next_reminder_status: "scheduled",
      next_created_at: "2026-07-14T10:00:00.000Z",
    },
  ]);

  const result = await createBookingRepository(execute).scheduleNextAppointment(nextInput);

  expect(result).toMatchObject({
    success: true,
    currentBooking: { id: nextInput.currentAppointmentId, status: "completed" },
    nextBooking: {
      id: "33333333-3333-4333-8333-333333333333",
      customerId: "22222222-2222-4222-8222-222222222222",
      appointmentType: "Measurements",
      customerStage: "measurements-appointment",
      status: "confirmed",
    },
  });
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(
    expect.stringMatching(/WITH[\s\S]+INSERT INTO public\.appointments[\s\S]+UPDATE public\.appointments[\s\S]+UPDATE public\.customers/),
    [
      nextInput.currentAppointmentId,
      "Measurements",
      "2026-07-20",
      "13:30",
      "Bring the selected shoes",
      "scheduled",
      "measurements-appointment",
    ],
  );
});

it.each(["not-found", "cancelled"] as const)("returns %s without a partial result", async (outcome) => {
  const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ outcome }]);
  await expect(createBookingRepository(execute).scheduleNextAppointment(nextInput)).resolves.toEqual({
    success: false,
    reason: outcome,
  });
  expect(execute).toHaveBeenCalledTimes(1);
});

it("maps a next-appointment slot conflict", async () => {
  const execute = vi.fn<QueryExecutor>().mockRejectedValue({
    code: "23505",
    constraint: "appointments_active_slot_unique",
  });
  await expect(createBookingRepository(execute).scheduleNextAppointment(nextInput)).resolves.toEqual({
    success: false,
    reason: "slot-unavailable",
  });
});
```

- [ ] **Step 2: Run the repository test and verify the new method is missing**

Run:

```powershell
npx vitest run src/features/book-call/booking-repository.server.test.ts
```

Expected: FAIL because `scheduleNextAppointment` is not part of `BookingRepository`.

- [ ] **Step 3: Enrich list/status queries and row mapping with real customer identity**

In `booking-repository.server.ts`, extend `BookingRow`:

```ts
type BookingRow = {
  id: string;
  customer_id: string;
  full_name: string;
  mobile: string;
  customer_stage: BookingListItem["customerStage"];
  customer_updated_at: string;
  appointment_type: BookingListItem["appointmentType"];
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: BookingListItem["status"];
  reminder_status: BookingListItem["reminderStatus"];
  created_at: string;
};
```

Add these columns to both `listBookingsQuery` and `updateBookingStatusQuery` selections:

```sql
c.id AS customer_id,
c.stage AS customer_stage,
c.updated_at::text AS customer_updated_at,
```

Add the fields to `mapBookingRow`:

```ts
customerId: row.customer_id,
customerStage: row.customer_stage,
customerUpdatedAt: row.customer_updated_at,
```

- [ ] **Step 4: Implement the single-statement atomic operation**

Import the Task 1 APIs:

```ts
import {
  getStageForNextAppointment,
  type ValidatedScheduleNextAppointment,
} from "./booking-domain";
```

Extend `BookingRepository`:

```ts
scheduleNextAppointment(
  input: ValidatedScheduleNextAppointment,
): Promise<
  | { success: true; currentBooking: BookingListItem; nextBooking: BookingListItem }
  | { success: false; reason: "not-found" | "cancelled" | "slot-unavailable" }
>;
```

Add a `ScheduleNextRow` type containing the exact snake-case fields used in the test, then add this query:

```ts
const scheduleNextAppointmentQuery = `
WITH current_appointment AS (
  SELECT a.*
  FROM public.appointments a
  WHERE a.id = $1
  FOR UPDATE
),
eligible_current AS (
  SELECT * FROM current_appointment WHERE status <> 'cancelled'
),
next_appointment AS (
  INSERT INTO public.appointments (
    customer_id, appointment_type, appointment_date, appointment_time,
    notes, status, reminder_status
  )
  SELECT customer_id, $2, $3::date, $4::time, $5, 'confirmed', $6
  FROM eligible_current
  RETURNING *
),
completed_current AS (
  UPDATE public.appointments a
  SET status = 'completed', updated_at = now()
  FROM next_appointment n
  WHERE a.id = $1
  RETURNING a.*
),
updated_customer AS (
  UPDATE public.customers c
  SET stage = $7, updated_at = now()
  FROM eligible_current e, next_appointment n
  WHERE c.id = e.customer_id
  RETURNING c.*
)
SELECT
  CASE
    WHEN original.id IS NULL THEN 'not-found'
    WHEN original.status = 'cancelled' THEN 'cancelled'
    ELSE 'success'
  END AS outcome,
  customer.id AS customer_id,
  customer.full_name,
  customer.mobile,
  customer.stage AS customer_stage,
  customer.updated_at::text AS customer_updated_at,
  completed.id AS current_id,
  completed.appointment_type AS current_appointment_type,
  completed.appointment_date::text AS current_appointment_date,
  to_char(completed.appointment_time, 'HH24:MI') AS current_appointment_time,
  completed.notes AS current_notes,
  completed.status AS current_status,
  completed.reminder_status AS current_reminder_status,
  completed.created_at::text AS current_created_at,
  next.id AS next_id,
  next.appointment_type AS next_appointment_type,
  next.appointment_date::text AS next_appointment_date,
  to_char(next.appointment_time, 'HH24:MI') AS next_appointment_time,
  next.notes AS next_notes,
  next.status AS next_status,
  next.reminder_status AS next_reminder_status,
  next.created_at::text AS next_created_at
FROM (SELECT 1) singleton
LEFT JOIN current_appointment original ON true
LEFT JOIN completed_current completed ON true
LEFT JOIN next_appointment next ON true
LEFT JOIN updated_customer customer ON true`;
```

Add a mapper that builds two `BookingListItem` objects from the current/next prefixes and shared customer fields. In `createBookingRepository`, implement:

```ts
async scheduleNextAppointment(input) {
  try {
    const stage = getStageForNextAppointment(input.appointmentType);
    const rows = await execute<ScheduleNextRow>(scheduleNextAppointmentQuery, [
      input.currentAppointmentId,
      input.appointmentType,
      input.appointmentDate,
      input.appointmentTime,
      input.notes,
      input.reminderStatus,
      stage,
    ]);
    const row = rows[0];
    if (!row || row.outcome === "not-found") {
      return { success: false, reason: "not-found" };
    }
    if (row.outcome === "cancelled") {
      return { success: false, reason: "cancelled" };
    }
    return {
      success: true,
      currentBooking: mapScheduledRow(row, "current"),
      nextBooking: mapScheduledRow(row, "next"),
    };
  } catch (error) {
    if (isActiveSlotConflict(error)) return { success: false, reason: "slot-unavailable" };
    throw error;
  }
},
```

`mapScheduledRow(row, prefix)` must assign `id`, `appointmentType`, `appointmentDate`, `appointmentTime`, `notes`, `status`, `reminderStatus`, and `createdAt` from the selected prefix, plus the shared `customerId`, `fullName`, `mobile`, `customerStage`, and `customerUpdatedAt` fields.

- [ ] **Step 5: Run the repository suite and commit**

Run:

```powershell
npx vitest run src/features/book-call/booking-repository.server.test.ts
```

Expected: PASS, including a single executor call for the three-write operation.

Commit:

```powershell
git add -- src/features/book-call/booking-repository.server.ts src/features/book-call/booking-repository.server.test.ts
git commit -m "feat: schedule next appointment atomically"
```

---

### Task 3: Authenticated Admin Server Function

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Modify: `src/features/auth/admin.functions.test.ts`

**Interfaces:**
- Consumes: `parseScheduleNextAppointmentInput` and `BookingRepository.scheduleNextAppointment`.
- Produces: `scheduleNextAppointmentForAdmin(input, dependencies)` and POST server function `scheduleNextAppointment`.

- [ ] **Step 1: Update fixtures and write failing authorization/validation/result tests**

Add `customerId`, `customerStage`, and `customerUpdatedAt` to the `appointment` fixture in `admin.functions.test.ts`. Add `scheduleNextAppointment` to `bookingDependencies().repository`:

```ts
scheduleNextAppointment: vi.fn().mockResolvedValue({
  success: true,
  currentBooking: { ...appointment, status: "completed" },
  nextBooking: {
    ...appointment,
    id: "33333333-3333-4333-8333-333333333333",
    appointmentType: "Measurements",
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    customerStage: "measurements-appointment",
    status: "confirmed",
    reminderStatus: "scheduled",
  },
}),
```

Import `scheduleNextAppointmentForAdmin` and append:

```ts
const scheduleInput = {
  currentAppointmentId: "11111111-1111-4111-8111-111111111111",
  appointmentType: "Measurements",
  appointmentDate: "2026-07-20",
  appointmentTime: "13:30",
  notes: "Bring shoes",
  reminderStatus: "scheduled",
};

it("schedules a validated next appointment for an admin", async () => {
  const testDependencies = bookingDependencies();
  const result = await scheduleNextAppointmentForAdmin(
    { token: "admin-token", input: scheduleInput },
    testDependencies,
  );
  expect(result).toMatchObject({ success: true, nextBooking: { appointmentType: "Measurements" } });
  expect(testDependencies.repository.scheduleNextAppointment).toHaveBeenCalledWith(scheduleInput);
});

it("rejects forbidden and invalid next-appointment requests before repository access", async () => {
  const forbiddenDependencies = bookingDependencies(false);
  await expect(
    scheduleNextAppointmentForAdmin(
      { token: "invalid-token", input: scheduleInput },
      forbiddenDependencies,
    ),
  ).resolves.toEqual({ success: false, reason: "forbidden" });
  expect(forbiddenDependencies.repository.scheduleNextAppointment).not.toHaveBeenCalled();

  const invalidDependencies = bookingDependencies();
  const result = await scheduleNextAppointmentForAdmin(
    { token: "admin-token", input: { ...scheduleInput, appointmentTime: "afternoon" } },
    invalidDependencies,
  );
  expect(result).toMatchObject({
    success: false,
    reason: "validation",
    fieldErrors: { appointmentTime: expect.any(String) },
  });
  expect(invalidDependencies.repository.scheduleNextAppointment).not.toHaveBeenCalled();
});

it("maps unexpected scheduling failures to storage-error", async () => {
  const testDependencies = bookingDependencies();
  testDependencies.repository.scheduleNextAppointment.mockRejectedValueOnce(new Error("offline"));
  await expect(
    scheduleNextAppointmentForAdmin(
      { token: "admin-token", input: scheduleInput },
      testDependencies,
    ),
  ).resolves.toEqual({ success: false, reason: "storage-error" });
});
```

- [ ] **Step 2: Run the admin test and verify the new function is missing**

Run:

```powershell
npx vitest run src/features/auth/admin.functions.test.ts
```

Expected: FAIL because `scheduleNextAppointmentForAdmin` is not exported.

- [ ] **Step 3: Implement the admin boundary and server function**

Import `parseScheduleNextAppointmentInput` and extend every `BookingRepository` pick in `BookingAdminDependencies` with `"scheduleNextAppointment"`.

Add:

```ts
export async function scheduleNextAppointmentForAdmin(
  input: { token: string; input: unknown },
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  | { success: true; currentBooking: BookingListItem; nextBooking: BookingListItem }
  | {
      success: false;
      reason:
        | "forbidden"
        | "validation"
        | "not-found"
        | "cancelled"
        | "slot-unavailable"
        | "storage-error";
      fieldErrors?: Record<string, string | undefined>;
    }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  const parsed = parseScheduleNextAppointmentInput(input.input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  }

  try {
    return await resolveBookingRepository(dependencies).scheduleNextAppointment(parsed.data);
  } catch {
    return { success: false, reason: "storage-error" };
  }
}

export const scheduleNextAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), input: z.unknown() }))
  .handler(({ data }) => scheduleNextAppointmentForAdmin(data));
```

- [ ] **Step 4: Run the admin test and commit**

Run:

```powershell
npx vitest run src/features/auth/admin.functions.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts
git commit -m "feat: expose next appointment admin action"
```

---

### Task 4: Normalize and Merge Persisted Dashboard Data

**Files:**
- Create: `src/features/dashboard/dashboard-booking-data.ts`
- Create: `src/features/dashboard/dashboard-booking-data.test.ts`

**Interfaces:**
- Consumes: enriched `BookingListItem`.
- Produces: `DashboardBookingData`, `normalizeBookingList(bookings)`, and `mergeScheduledNext(data, currentBooking, nextBooking)`.

- [ ] **Step 1: Write failing normalization and merge tests**

Create `src/features/dashboard/dashboard-booking-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/features/book-call/booking-domain";
import { mergeScheduledNext, normalizeBookingList } from "./dashboard-booking-data";

const first: BookingListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  customerStage: "new-inquiry",
  customerUpdatedAt: "2026-07-01T09:00:00.000Z",
  appointmentType: "New Design",
  appointmentDate: "2026-07-14",
  appointmentTime: "10:00",
  notes: "Initial sketches",
  status: "confirmed",
  reminderStatus: "sent",
  createdAt: "2026-07-01T10:00:00.000Z",
};

it("normalizes repeated bookings under one real customer", () => {
  const data = normalizeBookingList([
    first,
    { ...first, id: "33333333-3333-4333-8333-333333333333", appointmentTime: "12:00" },
  ]);
  expect(data.customers).toHaveLength(1);
  expect(data.customers[0].id).toBe(first.customerId);
  expect(data.appointments.map((item) => item.customerId)).toEqual([
    first.customerId,
    first.customerId,
  ]);
  expect(data.appointments[0].endsAt).toBe("2026-07-14T11:00:00.000Z");
});

it("merges the completed current appointment, next appointment, and customer stage", () => {
  const data = normalizeBookingList([first]);
  const current = { ...first, status: "completed" as const, customerStage: "measurements-appointment" as const };
  const next = {
    ...first,
    id: "33333333-3333-4333-8333-333333333333",
    appointmentType: "Measurements" as const,
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    status: "confirmed" as const,
    reminderStatus: "scheduled" as const,
    customerStage: "measurements-appointment" as const,
  };
  const merged = mergeScheduledNext(data, current, next);
  expect(merged.customers[0].stage).toBe("measurements-appointment");
  expect(merged.appointments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: first.id, status: "completed" }),
      expect.objectContaining({ id: next.id, purpose: "Measurements" }),
    ]),
  );
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-booking-data.test.ts
```

Expected: FAIL because `dashboard-booking-data.ts` does not exist.

- [ ] **Step 3: Implement normalization and immutable merge**

Create `src/features/dashboard/dashboard-booking-data.ts`:

```ts
import type { BookingListItem } from "@/features/book-call/booking-domain";
import type { Appointment, Customer } from "./dashboard-model";

export type DashboardBookingData = {
  customers: Customer[];
  appointments: Appointment[];
};

function mapCustomer(booking: BookingListItem): Customer {
  return {
    id: booking.customerId,
    name: booking.fullName,
    phone: booking.mobile,
    stage: booking.customerStage,
    updatedAt: booking.customerUpdatedAt,
    notes: [],
    activity: [],
  };
}

function mapAppointment(booking: BookingListItem): Appointment {
  const startsAt = `${booking.appointmentDate}T${booking.appointmentTime}:00.000Z`;
  const end = new Date(startsAt);
  end.setUTCHours(end.getUTCHours() + 1);
  return {
    id: booking.id,
    customerId: booking.customerId,
    type: "design",
    purpose: booking.appointmentType,
    notes: booking.notes || undefined,
    startsAt,
    endsAt: end.toISOString(),
    status: booking.status,
    reminderStatus: booking.reminderStatus,
  };
}

export function normalizeBookingList(bookings: BookingListItem[]): DashboardBookingData {
  const customers = new Map<string, Customer>();
  for (const booking of bookings) customers.set(booking.customerId, mapCustomer(booking));
  return {
    customers: [...customers.values()],
    appointments: bookings.map(mapAppointment),
  };
}

export function mergeScheduledNext(
  data: DashboardBookingData,
  currentBooking: BookingListItem,
  nextBooking: BookingListItem,
): DashboardBookingData {
  const customer = mapCustomer(nextBooking);
  const current = mapAppointment(currentBooking);
  const next = mapAppointment(nextBooking);
  return {
    customers: data.customers.map((item) => (item.id === customer.id ? customer : item)),
    appointments: [
      ...data.appointments.map((item) => (item.id === current.id ? current : item)),
      next,
    ],
  };
}
```

- [ ] **Step 4: Run the test and commit**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-booking-data.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/features/dashboard/dashboard-booking-data.ts src/features/dashboard/dashboard-booking-data.test.ts
git commit -m "feat: normalize persisted booking data"
```

---

### Task 5: Focused Next-Appointment Dialog and Row Actions

**Files:**
- Create: `src/features/dashboard/dashboard-next-appointment-dialog.tsx`
- Create: `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`

**Interfaces:**
- Consumes: `ScheduleNextAppointmentInput`, current `Appointment`, current `Customer`, and all appointments for client-side overlap feedback.
- Produces: `NextAppointmentSubmitResult`, `DashboardNextAppointmentDialog`, desktop/mobile plus actions, and `DashboardBookings.onScheduleNext(input)`.

- [ ] **Step 1: Write failing dialog tests**

Create `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx` with a harness that renders the first demo customer and appointment. Test the exact behavior:

```ts
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardNextAppointmentDialog } from "./dashboard-next-appointment-dialog";

afterEach(cleanup);

describe("DashboardNextAppointmentDialog", () => {
  it("fixes the customer, submits selected next-appointment values once, and closes on success", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={demoDashboardState.appointments[0]}
        customer={demoDashboardState.customers[0]}
        appointments={demoDashboardState.appointments}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Layan Mansour")).toBeTruthy();
    expect(within(dialog).queryByRole("option", { name: "Sarah Khalil" })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Appointment purpose"), { target: { value: "Measurements" } });
    fireEvent.change(within(dialog).getByLabelText("Date"), { target: { value: "2026-07-20" } });
    fireEvent.change(within(dialog).getByLabelText("Time"), { target: { value: "13:30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Complete & schedule next" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      currentAppointmentId: "appointment-1",
      appointmentType: "Measurements",
      appointmentDate: "2026-07-20",
      appointmentTime: "13:30",
      reminderStatus: "scheduled",
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("keeps entered values and reports a slot conflict", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, reason: "slot-unavailable" });
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={demoDashboardState.appointments[0]}
        customer={demoDashboardState.customers[0]}
        appointments={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Appointment purpose"), { target: { value: "Pickup" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-07-20" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "13:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete & schedule next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already has an appointment");
    expect((screen.getByLabelText("Appointment purpose") as HTMLSelectElement).value).toBe("Pickup");
  });
});
```

- [ ] **Step 2: Add failing row-action assertions**

In `dashboard-bookings.test.tsx`, add a test that supplies `onScheduleNext`, clicks `Schedule next appointment for Layan Mansour`, and expects a dialog with `Measurements`. Render a cancelled-only appointment and assert that the same action is absent.

Use these assertions:

```ts
expect(screen.getAllByRole("button", { name: "Schedule next appointment for Layan Mansour" }).length).toBeGreaterThan(0);
fireEvent.click(screen.getAllByRole("button", { name: "Schedule next appointment for Layan Mansour" })[0]);
expect(screen.getByRole("heading", { name: "Next appointment" })).toBeTruthy();
expect(screen.getByRole("option", { name: "Measurements" })).toBeTruthy();
```

For the cancelled case, pass one cancelled design appointment and expect `queryByRole` to be null.

- [ ] **Step 3: Run both component tests and verify they fail**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.test.tsx
```

Expected: FAIL because the dialog module and row action do not exist.

- [ ] **Step 4: Implement the focused asynchronous dialog**

Create `dashboard-next-appointment-dialog.tsx` using the existing `Dialog`, form class names, `nextAppointmentTypes`, `reminderStatuses`, and `appointmentsOverlap` helpers. Export:

```ts
export type NextAppointmentSubmitResult =
  | { success: true }
  | {
      success: false;
      reason: "forbidden" | "validation" | "not-found" | "cancelled" | "slot-unavailable" | "storage-error";
      fieldErrors?: Record<string, string | undefined>;
    };
```

The component signature is:

```ts
export function DashboardNextAppointmentDialog({
  open,
  currentAppointment,
  customer,
  appointments,
  onClose,
  onSubmit,
}: {
  open: boolean;
  currentAppointment: Appointment;
  customer: Customer;
  appointments: Appointment[];
  onClose: () => void;
  onSubmit: (input: ScheduleNextAppointmentInput) => Promise<NextAppointmentSubmitResult>;
})
```

Initialize form state to blank purpose/date/time/notes and `scheduled`. Reset it in an effect whenever `currentAppointment.id` changes. Before submitting, require purpose/date/time and reject a non-cancelled one-hour overlap using `appointmentsOverlap`. While awaiting `onSubmit`, disable all submit attempts and label the button `Scheduling…`. Map server reasons to these messages:

```ts
const submitMessages = {
  forbidden: "Please sign in again before scheduling the next appointment.",
  validation: "Check the appointment details and try again.",
  "not-found": "The current appointment no longer exists.",
  cancelled: "A cancelled appointment cannot schedule a next appointment.",
  "slot-unavailable": "This time already has an appointment.",
  "storage-error": "Could not schedule the next appointment. Please try again.",
} as const;
```

Render the customer as read-only text, render the current purpose/date/time summary, render only next-appointment type/date/time/notes/reminder inputs, and close only after `{ success: true }`.

- [ ] **Step 5: Wire eligible desktop/mobile plus actions into `DashboardBookings`**

Add an optional prop with a safe rejected default:

```ts
onScheduleNext = async () => ({ success: false, reason: "storage-error" as const }),
```

Add state:

```ts
const [nextAppointment, setNextAppointment] = useState<GeneralAppointment | null>(null);
```

For every non-cancelled desktop row, add a plus button before edit:

```tsx
<button
  type="button"
  aria-label={`Schedule next appointment for ${customersById.get(appointment.customerId)?.name ?? "customer"}`}
  title="Schedule next appointment"
  onClick={() => setNextAppointment(appointment)}
  className={cn(tableActionButtonClassName, "text-sky-600 hover:bg-sky-50")}
>
  <Plus className="size-3.5" />
</button>
```

Add the same accessible action as a labelled secondary button in the mobile card. Do not render either action when `appointment.status === "cancelled"`.

After the table, render the dialog only when both appointment and customer exist:

```tsx
{nextAppointment && customersById.get(nextAppointment.customerId) && (
  <DashboardNextAppointmentDialog
    open
    currentAppointment={nextAppointment}
    customer={customersById.get(nextAppointment.customerId)!}
    appointments={appointments}
    onClose={() => setNextAppointment(null)}
    onSubmit={onScheduleNext}
  />
)}
```

- [ ] **Step 6: Run component tests and commit**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.test.tsx
```

Expected: PASS.

Commit:

```powershell
git add -- src/features/dashboard/dashboard-next-appointment-dialog.tsx src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "feat: add next appointment row action"
```

---

### Task 6: Persisted Routes, Immediate Merge, and Read-Only Customer Stage

**Files:**
- Create: `src/features/dashboard/use-persisted-booking-data.ts`
- Modify: `src/routes/dashboard/bookings.tsx`
- Modify: `src/routes/dashboard/customers/index.tsx`
- Modify: `src/routes/dashboard/customers/$id.tsx`
- Modify: `src/features/dashboard/dashboard-customer-profile.tsx`
- Modify: `src/features/dashboard/dashboard-customer-profile.test.tsx`

**Interfaces:**
- Consumes: `getBookings`, `scheduleNextAppointment`, `normalizeBookingList`, `mergeScheduledNext`, and `DashboardNextAppointmentDialog` callback types.
- Produces: shared `usePersistedBookingData(enabled)`, server-backed customer pages, and a read-only stage profile.

- [ ] **Step 1: Write failing customer-profile tests for read-only stage and completed/current grouping**

Replace the existing dispatch test in `dashboard-customer-profile.test.tsx` with:

```ts
it("shows a read-only persisted stage and the next appointment", () => {
  const customer = { ...demoDashboardState.customers[0], stage: "measurements-appointment" as const };
  const current = { ...demoDashboardState.appointments[0], status: "completed" as const };
  const next = {
    ...demoDashboardState.appointments[0],
    id: "appointment-next",
    purpose: "Measurements",
    startsAt: "2026-07-20T13:30:00.000Z",
    endsAt: "2026-07-20T14:30:00.000Z",
    reminderStatus: "scheduled" as const,
  };
  render(
    <DashboardCustomerProfile
      customer={customer}
      appointments={[current, next]}
      now={new Date("2026-07-14T08:00:00.000Z")}
    />,
  );
  expect(screen.getByLabelText("Customer stage").textContent).toBe("Measurements appointment");
  expect(screen.queryByRole("combobox", { name: "Customer stage" })).toBeNull();
  expect(screen.getByText("Measurements")).toBeTruthy();
  expect(screen.getByText("Initial consultation")).toBeTruthy();
});
```

- [ ] **Step 2: Run the profile test and verify the old mutable API fails**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: FAIL because `dispatch` is required and stage is a select.

- [ ] **Step 3: Create the shared persisted-data loader**

Create `use-persisted-booking-data.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { getBookings } from "@/features/auth/admin.functions";
import { neonAuth } from "@/features/auth/neon-auth-client";
import { normalizeBookingList, type DashboardBookingData } from "./dashboard-booking-data";

export function usePersistedBookingData(enabled: boolean) {
  const [data, setData] = useState<DashboardBookingData>();
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled) return;
    setError("");
    const token = await neonAuth.getJWTToken();
    if (!token) {
      setError("Please sign in again.");
      return;
    }
    const result = await getBookings({ data: { token } });
    if (!result.success) {
      setError(
        result.reason === "forbidden"
          ? "You do not have access to bookings."
          : "Could not load bookings.",
      );
      return;
    }
    setData(normalizeBookingList(result.bookings));
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, reload };
}
```

- [ ] **Step 4: Use the loader and mutation in the bookings route**

In `src/routes/dashboard/bookings.tsx`:

- import `scheduleNextAppointment` from admin functions;
- import `mergeScheduledNext` and `usePersistedBookingData`;
- replace the local loading effect and hand-written appointment/customer mapping with `const { data: bookings, setData: setBookings, error, reload } = usePersistedBookingData(Boolean(session?.user));`;
- preserve status/delete/reminder handlers, but update their immutable state against `DashboardBookingData`;
- for delete, remove the appointment and remove its customer only when no other appointment references that customer.

Add this handler:

```ts
async function handleScheduleNext(input: ScheduleNextAppointmentInput): Promise<NextAppointmentSubmitResult> {
  const token = await neonAuth.getJWTToken();
  if (!token) return { success: false, reason: "forbidden" };
  const result = await scheduleNextAppointment({ data: { token, input } });
  if (!result.success) {
    if (result.reason === "not-found" || result.reason === "cancelled") void reload();
    return result;
  }
  setBookings((current) =>
    current
      ? mergeScheduledNext(current, result.currentBooking, result.nextBooking)
      : normalizeBookingList([result.currentBooking, result.nextBooking]),
  );
  return { success: true };
}
```

Pass `onScheduleNext={handleScheduleNext}` to `DashboardBookings`.

- [ ] **Step 5: Make both customer routes use persisted data**

In both customer route files, obtain `session` with `authClient.useSession()` and call `usePersistedBookingData(Boolean(session?.user))`.

For the index route, render loading/error states and then:

```tsx
return <DashboardCustomers customers={data.customers} appointments={data.appointments} />;
```

For `$id.tsx`, find the customer in `data.customers`, preserve the not-found view, and render:

```tsx
<DashboardCustomerProfile customer={customer} appointments={data.appointments} />
```

Do not read customer or appointment data from `useDashboard()` in either customer route.

- [ ] **Step 6: Make the customer stage read-only and group completed appointments as previous**

In `dashboard-customer-profile.tsx`:

- remove the `dispatch` prop, stage selector, `changeStage`, and note mutation form;
- retain read-only notes/activity lists because their arrays are part of the customer DTO;
- render the stage as:

```tsx
<div>
  <p className="text-xs text-slate-500">Customer stage</p>
  <p aria-label="Customer stage" className="mt-1 text-sm font-medium text-violet-700">
    {stageLabels[customer.stage]}
  </p>
</div>
```

Classify appointments with:

```ts
const upcoming = all.filter(
  (item) =>
    !["completed", "cancelled"].includes(item.status) && new Date(item.startsAt) >= now,
);
const previous = all
  .filter(
    (item) =>
      ["completed", "cancelled"].includes(item.status) || new Date(item.startsAt) < now,
  )
  .reverse();
```

- [ ] **Step 7: Run focused dashboard tests and commit**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: all four files PASS.

Commit:

```powershell
git add -- src/features/dashboard/use-persisted-booking-data.ts src/routes/dashboard/bookings.tsx src/routes/dashboard/customers/index.tsx 'src/routes/dashboard/customers/$id.tsx' src/features/dashboard/dashboard-customer-profile.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
git commit -m "feat: sync next appointments with customer profiles"
```

---

### Task 7: Regression Verification and Delivery Check

**Files:**
- Modify only files from Tasks 1-6 if verification reveals a feature-related defect.

**Interfaces:**
- Consumes: all feature APIs and routes from Tasks 1-6.
- Produces: passing focused tests, full test suite, production build, and a clean diff limited to planned files plus pre-existing user changes.

- [ ] **Step 1: Run every directly affected test file**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts src/features/book-call/booking-repository.server.test.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: eight test files PASS with zero failing tests.

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npm test
```

Expected: exit code 0. If a pre-existing unrelated test fails, record its exact file and failure without changing unrelated behavior; feature-related failures must be fixed before continuing.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: exit code 0 and TanStack/Vite production bundles generated successfully.

- [ ] **Step 4: Inspect migration and diff hygiene**

Run:

```powershell
git diff --check
git status --short
git diff --name-only HEAD~6..HEAD
```

Expected: no whitespace errors; only planned feature files appear in the feature commits. Pre-existing user changes remain unstaged and unmodified unless a planned file already contained overlapping work, in which case inspect the final diff manually.

- [ ] **Step 5: Verify the acceptance path against a migrated database**

Apply `db/migrations/003_add_customer_stage_and_measurements.sql` through the project's normal Neon migration workflow, then verify in the running app:

1. Open `/dashboard/bookings` as an administrator.
2. Click the plus action on a confirmed booking.
3. Select `Measurements`, enter an unused date/time, and submit.
4. Confirm the current booking shows `Completed` and the next booking appears as `Measurements`.
5. Open the linked customer profile and confirm `Measurements appointment` plus the new upcoming appointment.
6. Refresh both pages and confirm the same data remains.
7. Try an occupied slot and confirm no partial completion or stage change occurs.

Expected: all seven checks pass. Do not claim live-database verification if credentials or the migration workflow are unavailable; report that limitation separately from automated verification.

- [ ] **Step 6: Commit only a verification fix if one was required**

If Steps 1-5 required a feature-specific correction, stage only those corrected planned files and commit:

```powershell
git commit -m "fix: complete next appointment verification"
```

If no correction was required, do not create an empty commit.
